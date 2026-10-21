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

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;

const SUBTYPES_BY_TYPE: Record<(typeof ACCOUNT_TYPES)[number], string[]> = {
  Asset: ['Bank', 'Current Asset', 'Prepayment', 'Fixed Asset', 'Non-current Asset', 'Other Asset'],
  Liability: ['Current Liability', 'Long-term Liability', 'Other Liability'],
  Equity: ['Equity', 'Retained Earnings'],
  Revenue: ['Revenue', 'Other Income', 'Operating Revenue', 'Other Revenue'],
  Expense: ['Direct Costs', 'Expense', 'Other Expense', 'COGS', 'Operating Expense'],
}

type AddAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export default function AddAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: AddAccountDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [suggested, setSuggested] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>('Asset');
  const [subtype, setSubtype] = useState('Current Asset');
  const [parentCode, setParentCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPostable, setIsPostable] = useState(true);

  const subtypeOptions = useMemo(() => SUBTYPES_BY_TYPE[type] || [], [type]);

  const parentOptions = useMemo(
    () =>
      existingAccounts
        .filter((a) => a.code !== code.trim())
        .map((a) => ({ code: a.code, name: a.name, type: a.type })),
    [existingAccounts, code]
  );

  useEffect(() => {
    if (!open) return;
    setCode('');
    setCodeTouched(false);
    setSuggested('');
    setName('');
    setType('Asset');
    setSubtype('Current Asset');
    setParentCode('');
    setDescription('');
    setIsActive(true);
    setIsPostable(true);
    (async () => {
      const result = await apiClient.getAccounts();
      if (result.success && Array.isArray(result.data)) {
        setExistingAccounts(result.data);
      } else {
        setExistingAccounts([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const result = await apiClient.getNextAccountCode(type, subtype);
      const next = (result.data as any)?.suggested || '';
      if (cancelled) return;
      setSuggested(next);
      if (!codeTouched) setCode(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, type, subtype, codeTouched]);

  const handleTypeChange = (next: (typeof ACCOUNT_TYPES)[number]) => {
    setType(next);
    const options = SUBTYPES_BY_TYPE[next] || [];
    setSubtype(options[0] || '');
    setCodeTouched(false);
  };

  const nearby = useMemo(() => {
    const n = Number(code);
    if (!Number.isFinite(n)) return [];
    return existingAccounts
      .filter((a) => {
        const c = Number(a.code);
        return Number.isFinite(c) && Math.abs(c - n) <= 50;
      })
      .sort((a, b) => String(a.code).localeCompare(String(b.code)))
      .slice(0, 4);
  }, [existingAccounts, code]);

  const handleSave = async () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      toast({ variant: 'destructive', title: 'Code required', description: 'Enter an account code.' });
      return;
    }
    if (!/^\d{5}$/.test(trimmedCode)) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Use a 5-digit code (e.g. 10130) so new accounts can be inserted later.',
      });
      return;
    }
    if (!trimmedName) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter an account name.' });
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.createAccount({
        code: trimmedCode,
        name: trimmedName,
        type,
        subtype: subtype.trim() || undefined,
        parent_code: parentCode.trim() || undefined,
        description: description.trim() || undefined,
        is_active: isActive,
        is_postable: isPostable,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Could not create account',
          description: result.error || 'Please try again.',
        });
        return;
      }

      toast({
        title: 'Account created',
        description: `${trimmedCode} — ${trimmedName} added to the chart of accounts.`,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not create account',
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
            <DialogTitle className="text-base">Add Account</DialogTitle>
            <DialogDescription className="text-xs">
              Add a ledger account. Codes are 5 digits with room to insert later (e.g. 10130).
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 grid gap-3 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="account-code" className="text-[11px]">Code *</Label>
              <Input
                id="account-code"
                placeholder="e.g. 10130"
                value={code}
                maxLength={5}
                inputMode="numeric"
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 5));
                }}
                className="h-8 font-mono text-xs"
                autoFocus
              />
              {suggested ? (
                <p className="text-[10px] text-slate-500">
                  Next free code:{' '}
                  <button
                    type="button"
                    className="font-mono text-sky-600"
                    onClick={() => {
                      setCode(suggested);
                      setCodeTouched(true);
                    }}
                  >
                    {suggested}
                  </button>
                </p>
              ) : null}
              {nearby.length ? (
                <p className="text-[10px] text-slate-400">
                  Nearby: {nearby.map((a) => `${a.code} ${a.name}`).join(' · ')}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Type *</Label>
              <Select value={type} onValueChange={(v) => handleTypeChange(v as typeof type)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="account-name" className="text-[11px]">Account name *</Label>
            <Input
              id="account-name"
              placeholder="e.g. Prepaid Expenses"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Subtype</Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select subtype" />
              </SelectTrigger>
              <SelectContent>
                {subtypeOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Parent account (optional)</Label>
            <Select
              value={parentCode || '__none__'}
              onValueChange={(v) => setParentCode(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {parentOptions.map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="account-description" className="text-[11px]">Description</Label>
            <Textarea
              id="account-description"
              placeholder="Optional notes about this account"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-xs min-h-[60px]"
            />
          </div>

          <div className="flex flex-col gap-2.5 rounded-md border border-border/60 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium">Active</p>
                <p className="text-[10px] text-muted-foreground">Hidden from posting when inactive.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium">Postable</p>
                <p className="text-[10px] text-muted-foreground">Allow journal lines against this account.</p>
              </div>
              <Switch checked={isPostable} onCheckedChange={setIsPostable} />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-4 py-2.5 shrink-0 sm:space-x-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
