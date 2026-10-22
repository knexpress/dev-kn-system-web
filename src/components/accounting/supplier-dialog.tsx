'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient, type SupplierPayload } from '@/lib/api-client';
import { erpPrimaryButtonClass } from './erp-shell';

const EMPTY = {
  name: '',
  trn: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  bank_name: '',
  iban: '',
  account_number: '',
  payment_terms_days: '30',
  notes: '',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: any | null;
  onSaved: (supplier: any) => void;
};

export function SupplierDialog({ open, onOpenChange, supplier, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      supplier
        ? {
            name: supplier.name || '',
            trn: supplier.trn || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            bank_name: supplier.bank_name || '',
            iban: supplier.iban || '',
            account_number: supplier.account_number || '',
            payment_terms_days: String(supplier.payment_terms_days ?? 30),
            notes: supplier.notes || '',
          }
        : EMPTY
    );
  }, [open, supplier]);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) {
      toast({ variant: 'destructive', title: 'Supplier name is required' });
      return;
    }
    const payload: SupplierPayload = {
      name: form.name.trim(),
      trn: form.trn.trim(),
      contact_person: form.contact_person.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      bank_name: form.bank_name.trim(),
      iban: form.iban.replace(/\s+/g, '').trim(),
      account_number: form.account_number.trim(),
      payment_terms_days: Number(form.payment_terms_days) || 0,
      notes: form.notes.trim(),
    };
    setSaving(true);
    const result = supplier?._id
      ? await apiClient.updateSupplier(supplier._id, payload)
      : await apiClient.createSupplier(payload);
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not save supplier', description: result.error });
      return;
    }
    toast({ title: supplier?._id ? 'Supplier updated' : 'Supplier added', description: payload.name });
    onSaved(result.data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>{supplier?._id ? `Edit ${supplier.name}` : 'New supplier'}</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Supplier name</Label>
            <Input value={form.name} onChange={set('name')} className="rounded-xl" placeholder="Legal / trade name" />
          </div>
          <div className="space-y-2">
            <Label>TRN (VAT number)</Label>
            <Input value={form.trn} onChange={set('trn')} className="rounded-xl" placeholder="100xxxxxxxxxxxx" />
          </div>
          <div className="space-y-2">
            <Label>Payment terms (days)</Label>
            <Input
              type="number"
              min="0"
              value={form.payment_terms_days}
              onChange={set('payment_terms_days')}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact person</Label>
            <Input value={form.contact_person} onChange={set('contact_person')} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={set('phone')} className="rounded-xl" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={set('email')} className="rounded-xl" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={set('address')} rows={2} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Bank name</Label>
            <Input value={form.bank_name} onChange={set('bank_name')} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Account number</Label>
            <Input value={form.account_number} onChange={set('account_number')} className="rounded-xl" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>IBAN</Label>
            <Input value={form.iban} onChange={set('iban')} className="rounded-xl" placeholder="AE07 0331 2345 6789 0123 456" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={set('notes')} rows={2} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className={erpPrimaryButtonClass()} disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {supplier?._id ? 'Save changes' : 'Add supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
