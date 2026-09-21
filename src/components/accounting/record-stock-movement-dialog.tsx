'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

type MovementType = 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT';

type RecordStockMovementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

function money(n: number) {
  return n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RecordStockMovementDialog({
  open,
  onOpenChange,
  onCreated,
}: RecordStockMovementDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<MovementType>('RECEIPT');
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [offsetAccount, setOffsetAccount] = useState('2000');
  const [postJournal, setPostJournal] = useState(true);

  const selectedItem = useMemo(
    () => items.find((i) => i.sku === sku) || null,
    [items, sku]
  );

  const offsetOptions = useMemo(() => {
    const list = accounts.filter((a) => a.is_active !== false && a.is_postable !== false);
    if (type === 'RECEIPT') {
      const preferred = list.filter((a) => a.type === 'Liability' || a.type === 'Asset');
      return preferred.length ? preferred : list;
    }
    if (type === 'ADJUSTMENT') {
      const preferred = list.filter((a) => a.type === 'Expense' || a.type === 'Revenue');
      return preferred.length ? preferred : list;
    }
    return list;
  }, [accounts, type]);

  const needsOffset = type === 'RECEIPT' || (type === 'ADJUSTMENT' && parseFloat(qty) > 0);
  const estimatedTotal = useMemo(() => {
    const q = Math.abs(parseFloat(qty) || 0);
    let cost = parseFloat(unitCost) || 0;
    if (cost <= 0 && selectedItem && (type === 'ISSUE' || type === 'ADJUSTMENT')) {
      cost = Number(selectedItem.avg_cost) || 0;
    }
    return q * cost;
  }, [qty, unitCost, selectedItem, type]);

  useEffect(() => {
    if (!open) return;
    setTxnDate(new Date().toISOString().slice(0, 10));
    setType('RECEIPT');
    setSku('');
    setQty('');
    setUnitCost('');
    setNotes('');
    setOffsetAccount('2000');
    setPostJournal(true);

    (async () => {
      const [itemsRes, accountsRes] = await Promise.all([
        apiClient.getInventoryItems(),
        apiClient.getAccounts(),
      ]);
      if (itemsRes.success && Array.isArray(itemsRes.data)) {
        setItems(itemsRes.data.filter((i: any) => i.is_active !== false));
      } else {
        setItems([]);
      }
      if (accountsRes.success && Array.isArray(accountsRes.data)) {
        setAccounts(accountsRes.data);
        const codes = new Set(accountsRes.data.map((a: any) => a.code));
        if (!codes.has('2000')) {
          const ap = accountsRes.data.find((a: any) => a.type === 'Liability');
          if (ap) setOffsetAccount(ap.code);
        }
      } else {
        setAccounts([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!selectedItem) return;
    if (type === 'ISSUE' || type === 'ADJUSTMENT') {
      if (!unitCost || parseFloat(unitCost) === 0) {
        setUnitCost(String(Number(selectedItem.avg_cost) || 0));
      }
    }
  }, [selectedItem, type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (type === 'RECEIPT') {
      setOffsetAccount((prev) => prev || '2000');
    } else if (type === 'ADJUSTMENT' && selectedItem) {
      setOffsetAccount(selectedItem.cogs_account_code || '5000');
    }
  }, [type, selectedItem]);

  const handleSave = async () => {
    if (!txnDate) {
      toast({ variant: 'destructive', title: 'Date required', description: 'Enter a movement date.' });
      return;
    }
    if (!sku) {
      toast({ variant: 'destructive', title: 'Item required', description: 'Select a SKU.' });
      return;
    }
    const qtyNum = parseFloat(qty);
    if (!Number.isFinite(qtyNum) || qtyNum === 0) {
      toast({
        variant: 'destructive',
        title: 'Quantity required',
        description:
          type === 'ADJUSTMENT'
            ? 'Enter a non-zero quantity (negative to decrease).'
            : 'Enter a quantity greater than zero.',
      });
      return;
    }
    if (type !== 'ADJUSTMENT' && qtyNum < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid quantity',
        description: 'Use a positive quantity for receipts and issues.',
      });
      return;
    }

    let costNum = parseFloat(unitCost);
    if (!Number.isFinite(costNum) || costNum < 0) costNum = 0;
    if (type === 'RECEIPT' && costNum <= 0) {
      toast({
        variant: 'destructive',
        title: 'Unit cost required',
        description: 'Enter the purchase / receipt unit cost.',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.createInventoryTransaction({
        txn_date: txnDate,
        type,
        sku,
        qty: qtyNum,
        unit_cost: costNum,
        notes: notes.trim() || undefined,
        offset_account_code: needsOffset ? offsetAccount : undefined,
        post_journal: postJournal,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Could not record movement',
          description: result.error || 'Please try again.',
        });
        return;
      }

      const journalNo = result.data?.journal?.entry_no || result.data?.transaction?.journal_entry_no;
      toast({
        title: 'Movement recorded',
        description: journalNo
          ? `${type} for ${sku} posted. Journal ${journalNo}.`
          : `${type} for ${sku} saved.`,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not record movement',
        description: e?.message || 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
          <DialogDescription>
            Receipts, issues, and adjustments update on-hand qty and can post a GL journal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="txn-date">Date *</Label>
              <Input
                id="txn-date"
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIPT">Receipt (stock in)</SelectItem>
                  <SelectItem value="ISSUE">Issue (stock out / COGS)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Item / SKU *</Label>
            <Select value={sku || undefined} onValueChange={setSku}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.sku} value={i.sku}>
                    {i.sku} — {i.name} (on hand {i.qty_on_hand})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <p className="text-xs text-muted-foreground">
                Avg cost {money(Number(selectedItem.avg_cost) || 0)} AED · Unit {selectedItem.unit}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="txn-qty">
                Quantity *{type === 'ADJUSTMENT' ? ' (±)' : ''}
              </Label>
              <Input
                id="txn-qty"
                type="number"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="font-mono"
                placeholder={type === 'ADJUSTMENT' ? 'e.g. -50 or 25' : 'e.g. 100'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-cost">Unit cost (AED)</Label>
              <Input
                id="txn-cost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="font-mono"
                placeholder={type === 'RECEIPT' ? 'Required' : 'Uses avg cost'}
              />
            </div>
          </div>

          {estimatedTotal > 0 && (
            <p className="text-sm text-muted-foreground">
              Estimated value: <span className="font-mono font-medium text-foreground">{money(estimatedTotal)} AED</span>
            </p>
          )}

          {needsOffset && postJournal && (
            <div className="space-y-2">
              <Label>
                {type === 'RECEIPT' ? 'Credit offset (AP / Cash / Bank)' : 'Credit offset account'}
              </Label>
              <Select value={offsetAccount} onValueChange={setOffsetAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {offsetOptions.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="txn-notes">Notes</Label>
            <Textarea
              id="txn-notes"
              placeholder="e.g. Supplier delivery, warehouse issue, stock count"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Post journal entry</p>
              <p className="text-xs text-muted-foreground">
                {type === 'RECEIPT' && 'Dr Inventory / Cr offset'}
                {type === 'ISSUE' && 'Dr COGS / Cr Inventory'}
                {type === 'ADJUSTMENT' && 'Posts inventory vs COGS (or offset)'}
              </p>
            </div>
            <Switch checked={postJournal} onCheckedChange={setPostJournal} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || items.length === 0}>
            {saving ? 'Saving…' : 'Record Movement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
