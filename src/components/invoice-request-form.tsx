'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface InvoiceRequestFormProps {
  onRequestCreated: () => void;
  currentUser: any;
}

export default function InvoiceRequestForm({ onRequestCreated, currentUser }: InvoiceRequestFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    invoice_number: '',
    tracking_code: '',
    service_code: '',
    amount: '',
    weight_kg: '',
    volume_cbm: '',
    customer_name: '',
    customer_company: '',
    receiver_name: '',
    receiver_address: '',
    receiver_phone: '',
    origin_place: '',
    destination_place: '',
    shipment_type: '',
    is_leviable: true,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await apiClient.createInvoiceRequest({
        ...formData,
        created_by_employee_id: currentUser.employee_id || currentUser.uid,
        status: 'SUBMITTED', // Automatically submit when created by Sales
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Invoice request created successfully',
        });
        setIsDialogOpen(false);
        setFormData({
          invoice_number: '',
          tracking_code: '',
          service_code: '',
          amount: '',
          weight_kg: '',
          volume_cbm: '',
          customer_name: '',
          customer_company: '',
          receiver_name: '',
          receiver_address: '',
          receiver_phone: '',
          origin_place: '',
          destination_place: '',
          shipment_type: '',
          is_leviable: true,
          notes: '',
        });
        onRequestCreated();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create invoice request',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invoice request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Invoice Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice Request</DialogTitle>
          <DialogDescription>
            Fill in the details for the invoice request. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice & Tracking Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Invoice & Tracking Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="tracking_code">Tracking Code *</Label>
                <Input
                  id="tracking_code"
                  value={formData.tracking_code}
                  onChange={(e) => setFormData({ ...formData, tracking_code: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="service_code">Service Code *</Label>
                <Input
                  id="service_code"
                  value={formData.service_code}
                  onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shipment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Amount (AED) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="weight_kg">Weight (KG) *</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.01"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="volume_cbm">Volume (CBM)</Label>
                <Input
                  id="volume_cbm"
                  type="number"
                  step="0.01"
                  value={formData.volume_cbm}
                  onChange={(e) => setFormData({ ...formData, volume_cbm: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="customer_company">Customer Company</Label>
                <Input
                  id="customer_company"
                  value={formData.customer_company}
                  onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Receiver Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Receiver Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="receiver_name">Receiver Name *</Label>
                <Input
                  id="receiver_name"
                  value={formData.receiver_name}
                  onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="receiver_address">Receiver Address *</Label>
                <Input
                  id="receiver_address"
                  value={formData.receiver_address}
                  onChange={(e) => setFormData({ ...formData, receiver_address: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="receiver_phone">Receiver Phone *</Label>
                <Input
                  id="receiver_phone"
                  value={formData.receiver_phone}
                  onChange={(e) => setFormData({ ...formData, receiver_phone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="origin_place">Origin Place *</Label>
                <Input
                  id="origin_place"
                  placeholder="e.g., Dubai, UAE"
                  value={formData.origin_place}
                  onChange={(e) => setFormData({ ...formData, origin_place: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="destination_place">Destination Place *</Label>
                <Input
                  id="destination_place"
                  placeholder="e.g., Manila, Philippines"
                  value={formData.destination_place}
                  onChange={(e) => setFormData({ ...formData, destination_place: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shipment Details</h3>
            
            <div>
              <Label htmlFor="shipment_type">Shipment Type *</Label>
              <Select
                value={formData.shipment_type}
                onValueChange={(value) => setFormData({ ...formData, shipment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                  <SelectItem value="NON_DOCUMENT">Non-Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_leviable"
                checked={formData.is_leviable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_leviable: checked as boolean })}
              />
              <Label htmlFor="is_leviable">Leviable (Taxable)</Label>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
