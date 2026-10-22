'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_INVOICE_DISCLAIMER, type InvoicePrintOptions } from '@/lib/invoice-print-options';

export function InvoicePrintOptionsPanel({
  value,
  onChange,
  onSave,
  saving,
  compact = false,
}: {
  value: Required<InvoicePrintOptions>;
  onChange: (next: Required<InvoicePrintOptions>) => void;
  onSave?: () => void;
  saving?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Notes on invoice</p>
          <p className="text-xs text-muted-foreground">Printed only when this option is on.</p>
        </div>
        <Switch
          checked={value.include_notes}
          onCheckedChange={(checked) => onChange({ ...value, include_notes: checked })}
        />
      </div>
      {value.include_notes ? (
        <div className="space-y-1">
          <Label htmlFor="invoice-print-notes">Notes</Label>
          <Textarea
            id="invoice-print-notes"
            rows={compact ? 2 : 3}
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            placeholder="Shown on the invoice PDF when Notes is enabled"
          />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Disclaimer on invoice</p>
          <p className="text-xs text-muted-foreground">Optional legal notice on the printed invoice.</p>
        </div>
        <Switch
          checked={value.include_disclaimer}
          onCheckedChange={(checked) =>
            onChange({
              ...value,
              include_disclaimer: checked,
              disclaimer: value.disclaimer || DEFAULT_INVOICE_DISCLAIMER,
            })
          }
        />
      </div>
      {value.include_disclaimer ? (
        <div className="space-y-1">
          <Label htmlFor="invoice-print-disclaimer">Disclaimer</Label>
          <Textarea
            id="invoice-print-disclaimer"
            rows={compact ? 3 : 4}
            value={value.disclaimer}
            onChange={(e) => onChange({ ...value, disclaimer: e.target.value })}
            placeholder={DEFAULT_INVOICE_DISCLAIMER}
          />
        </div>
      ) : null}

      {onSave ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => onSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save print options'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
