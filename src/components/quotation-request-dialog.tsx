'use client';

import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, Send, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

type ItemRow = { id: string; boxNumber: string; name: string; quantity: number };

interface QuotationRequestDialogProps {
  request: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

function initialItems(request: any): ItemRow[] {
  const saved = request?.quotation_request?.items;
  if (Array.isArray(saved) && saved.length) {
    return saved.map((item: any, index: number) => ({
      id: `saved-${index}`,
      boxNumber: item.box_number || String(index + 1),
      name: item.name || '',
      quantity: Number(item.quantity) || 1,
    }));
  }
  const bookingItems = request?.booking_snapshot?.items || request?.booking_data?.items;
  if (Array.isArray(bookingItems) && bookingItems.length) {
    return bookingItems.map((item: any, index: number) => ({
      id: `booking-${index}`,
      boxNumber: String(index + 1),
      name: (item.commodity || item.name || item.description || '').toString(),
      quantity: parseInt(item.qty ?? item.quantity, 10) || 1,
    }));
  }
  return [{ id: '1', boxNumber: '1', name: '', quantity: 1 }];
}

export default function QuotationRequestDialog({ request, open, onOpenChange, onSubmitted }: QuotationRequestDialogProps) {
  const { toast } = useToast();
  const [actualWeight, setActualWeight] = useState('');
  const [volumetricWeight, setVolumetricWeight] = useState('');
  const [numberOfBoxes, setNumberOfBoxes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !request) return;
    const saved = request.quotation_request || {};
    setActualWeight(saved.actual_weight ? String(saved.actual_weight) : '');
    setVolumetricWeight(saved.volumetric_weight ? String(saved.volumetric_weight) : '');
    setNumberOfBoxes(
      saved.number_of_boxes
        ? String(saved.number_of_boxes)
        : request.number_of_boxes
          ? String(request.number_of_boxes)
          : ''
    );
    setItems(initialItems(request));
    setNotes(saved.notes || '');
  }, [open, request]);

  const awb = request?.tracking_code || request?.awb_number || request?.invoice_number || '';

  const updateItem = (id: string, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!request?._id) return;

    const actual = parseFloat(actualWeight);
    const volumetric = parseFloat(volumetricWeight);
    const boxes = parseInt(numberOfBoxes, 10);
    const validItems = items.filter((item) => item.name.trim() && item.quantity > 0);

    if (!(actual > 0) || !(volumetric > 0)) {
      toast({ variant: 'destructive', title: 'Weights required', description: 'Enter both actual and volumetric weight in kg.' });
      return;
    }
    if (!(boxes >= 1)) {
      toast({ variant: 'destructive', title: 'Boxes required', description: 'Enter the number of boxes (at least 1).' });
      return;
    }
    if (!validItems.length) {
      toast({ variant: 'destructive', title: 'Items required', description: 'Add at least one item name with quantity.' });
      return;
    }

    setSubmitting(true);
    const result = await apiClient.submitQuotationRequest(request._id, {
      actual_weight: actual,
      volumetric_weight: volumetric,
      number_of_boxes: boxes,
      items: validItems.map((item, index) => ({
        box_number: item.boxNumber.trim() || String(index + 1),
        name: item.name.trim(),
        quantity: item.quantity,
      })),
      notes: notes.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      toast({ title: 'Sent to Finance', description: `Quotation requested for AWB ${awb || request._id}.` });
      onOpenChange(false);
      onSubmitted();
    } else {
      toast({ variant: 'destructive', title: 'Could not send', description: result.error || 'Failed to request quotation' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process quotation{awb ? ` — ${awb}` : ''}</DialogTitle>
          <DialogDescription>
            Enter the measured weights, boxes, and items. Finance receives the full booking details to prepare the quotation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="qr_actual_weight">Actual weight (kg) *</Label>
              <Input
                id="qr_actual_weight"
                type="number"
                min="0.01"
                step="0.01"
                value={actualWeight}
                onChange={(e) => setActualWeight(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="qr_volumetric_weight">Volumetric weight (kg) *</Label>
              <Input
                id="qr_volumetric_weight"
                type="number"
                min="0.01"
                step="0.01"
                value={volumetricWeight}
                onChange={(e) => setVolumetricWeight(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="qr_boxes">Number of boxes *</Label>
              <Input
                id="qr_boxes"
                type="number"
                min="1"
                step="1"
                value={numberOfBoxes}
                onChange={(e) => setNumberOfBoxes(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((rows) => [
                    ...rows,
                    { id: Date.now().toString(), boxNumber: String(rows.length + 1), name: '', quantity: 1 },
                  ])
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 items-end gap-3">
                <div className="col-span-3 md:col-span-2">
                  <Label>Box #</Label>
                  <Input
                    value={item.boxNumber}
                    placeholder={String(index + 1)}
                    onChange={(e) => updateItem(item.id, { boxNumber: e.target.value })}
                  />
                </div>
                <div className="col-span-9 md:col-span-6">
                  <Label>Item name *</Label>
                  <Input
                    value={item.name}
                    placeholder="Item name"
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Label>Qty *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setItems((rows) => rows.filter((row) => row.id !== item.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="qr_notes">Notes for Finance</Label>
            <Textarea id="qr_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Request process quotation to Finance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
