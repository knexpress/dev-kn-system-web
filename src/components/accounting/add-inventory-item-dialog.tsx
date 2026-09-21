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

const UNITS = ['PCS', 'BOX', 'PACK', 'ROLL', 'KG', 'M', 'L'] as const;

type AddInventoryItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export default function AddInventoryItemDialog({
  open,
  onOpenChange,
  onCreated,
}: AddInventoryItemDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<string>('PCS');
  const [qtyOnHand, setQtyOnHand] = useState('0');
  const [avgCost, setAvgCost] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [assetAccount, setAssetAccount] = useState('1200');
  const [cogsAccount, setCogsAccount] = useState('5000');
  const [incomeAccount, setIncomeAccount] = useState('4000');
  const [isActive, setIsActive] = useState(true);

  const postableAccounts = useMemo(
    () => accounts.filter((a) => a.is_active !== false && a.is_postable !== false),
    [accounts]
  );

  const assetOptions = useMemo(
    () => postableAccounts.filter((a) => a.type === 'Asset'),
    [postableAccounts]
  );
  const expenseOptions = useMemo(
    () => postableAccounts.filter((a) => a.type === 'Expense'),
    [postableAccounts]
  );
  const revenueOptions = useMemo(
    () => postableAccounts.filter((a) => a.type === 'Revenue'),
    [postableAccounts]
  );

  useEffect(() => {
    if (!open) return;
    setSku('');
    setName('');
    setUnit('PCS');
    setQtyOnHand('0');
    setAvgCost('0');
    setReorderLevel('0');
    setAssetAccount('1200');
    setCogsAccount('5000');
    setIncomeAccount('4000');
    setIsActive(true);

    (async () => {
      const result = await apiClient.getAccounts();
      if (result.success && Array.isArray(result.data)) {
        setAccounts(result.data);
        const codes = new Set(result.data.map((a: any) => a.code));
        if (!codes.has('1200')) {
          const firstAsset = result.data.find((a: any) => a.type === 'Asset');
          if (firstAsset) setAssetAccount(firstAsset.code);
        }
        if (!codes.has('5000')) {
          const firstExp = result.data.find((a: any) => a.type === 'Expense');
          if (firstExp) setCogsAccount(firstExp.code);
        }
        if (!codes.has('4000')) {
          const firstRev = result.data.find((a: any) => a.type === 'Revenue');
          if (firstRev) setIncomeAccount(firstRev.code);
        }
      } else {
        setAccounts([]);
      }
    })();
  }, [open]);

  const accountLabel = (code: string) => {
    const a = accounts.find((x) => x.code === code);
    return a ? `${a.code} — ${a.name}` : code;
  };

  const handleSave = async () => {
    const trimmedSku = sku.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedSku) {
      toast({ variant: 'destructive', title: 'SKU required', description: 'Enter a SKU code.' });
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(trimmedSku)) {
      toast({
        variant: 'destructive',
        title: 'Invalid SKU',
        description: 'Use 2–32 characters: letters, numbers, . _ -.',
      });
      return;
    }
    if (!trimmedName) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter an item name.' });
      return;
    }

    const qty = parseFloat(qtyOnHand) || 0;
    const cost = parseFloat(avgCost) || 0;
    const reorder = parseFloat(reorderLevel) || 0;
    if (qty < 0 || cost < 0 || reorder < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amounts',
        description: 'Quantity, cost, and reorder level cannot be negative.',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.createInventoryItem({
        sku: trimmedSku,
        name: trimmedName,
        unit,
        qty_on_hand: qty,
        avg_cost: cost,
        reorder_level: reorder,
        asset_account_code: assetAccount,
        cogs_account_code: cogsAccount,
        income_account_code: incomeAccount,
        is_active: isActive,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Could not create item',
          description: result.error || 'Please try again.',
        });
        return;
      }

      toast({
        title: 'Item created',
        description: `${trimmedSku} — ${trimmedName} added to inventory.`,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not create item',
        description: e?.message || 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-border/60 px-4 py-3 shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Add Inventory Item</DialogTitle>
            <DialogDescription className="text-xs">
              Create a SKU with inventory, COGS, and sales GL accounts.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 grid gap-3 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="item-sku" className="text-[11px]">SKU *</Label>
              <Input
                id="item-sku"
                placeholder="e.g. BOX-SML"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="h-8 font-mono text-xs"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Unit *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="item-name" className="text-[11px]">Item name *</Label>
            <Input
              id="item-name"
              placeholder="e.g. Small Carton Box"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="item-qty" className="text-[11px]">Opening qty</Label>
              <Input
                id="item-qty"
                type="number"
                min="0"
                step="1"
                value={qtyOnHand}
                onChange={(e) => setQtyOnHand(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-cost" className="text-[11px]">Avg cost</Label>
              <Input
                id="item-cost"
                type="number"
                min="0"
                step="0.01"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-reorder" className="text-[11px]">Reorder</Label>
              <Input
                id="item-reorder"
                type="number"
                min="0"
                step="1"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Inventory asset account</Label>
            <Select value={assetAccount} onValueChange={setAssetAccount}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>{accountLabel(assetAccount)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(assetOptions.length ? assetOptions : postableAccounts).map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">COGS account</Label>
            <Select value={cogsAccount} onValueChange={setCogsAccount}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>{accountLabel(cogsAccount)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(expenseOptions.length ? expenseOptions : postableAccounts).map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Income / sales account</Label>
            <Select value={incomeAccount} onValueChange={setIncomeAccount}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>{accountLabel(incomeAccount)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(revenueOptions.length ? revenueOptions : postableAccounts).map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-2.5">
            <div>
              <p className="text-xs font-medium">Active</p>
              <p className="text-[10px] text-muted-foreground">Hidden from stock movements when inactive.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-4 py-2.5 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
