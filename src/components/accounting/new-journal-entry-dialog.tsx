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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Paperclip, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

type JournalLineForm = {
  id: string;
  account_code: string;
  description: string;
  debit: string;
  credit: string;
};

type NewJournalEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** When set, dialog edits this journal instead of creating a new one. */
  journal?: any | null;
};

function money(n: number) {
  return n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyLine(): JournalLineForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    account_code: '',
    description: '',
    debit: '',
    credit: '',
  };
}

function toInputDate(value: any) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function linesFromJournal(journal: any): JournalLineForm[] {
  const raw = Array.isArray(journal?.lines) ? journal.lines : [];
  if (!raw.length) return [emptyLine(), emptyLine()];
  return raw.map((l: any, i: number) => ({
    id: `edit-${i}-${l.account_code || i}`,
    account_code: String(l.account_code || ''),
    description: String(l.description || ''),
    debit: l.debit ? String(l.debit) : '',
    credit: l.credit ? String(l.credit) : '',
  }));
}

export default function NewJournalEntryDialog({
  open,
  onOpenChange,
  onCreated,
  journal = null,
}: NewJournalEntryDialogProps) {
  const { toast } = useToast();
  const editing = Boolean(journal?._id);
  const alreadyPosted = editing && String(journal?.status || '').toUpperCase() === 'POSTED';
  const [accounts, setAccounts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<JournalLineForm[]>([emptyLine(), emptyLine()]);
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const result = await apiClient.getAccounts();
      if (result.success && Array.isArray(result.data)) {
        setAccounts(result.data.filter((a: any) => a.is_active !== false && a.is_postable !== false));
      }
    })();
    if (journal?._id) {
      setEntryDate(toInputDate(journal.entry_date));
      setMemo(String(journal.memo || ''));
      setLines(linesFromJournal(journal));
    } else {
      setEntryDate(new Date().toISOString().slice(0, 10));
      setMemo('');
      setLines([emptyLine(), emptyLine()]);
    }
    setDocuments([]);
  }, [open, journal]);

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.009 && debit > 0 };
  }, [lines]);

  const updateLine = (id: string, patch: Partial<JournalLineForm>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.id !== id)));
  };

  const handleSave = async (status: 'DRAFT' | 'POSTED') => {
    if (!entryDate) {
      toast({ variant: 'destructive', title: 'Date required', description: 'Enter a journal date.' });
      return;
    }

    const payloadLines = lines
      .map((l) => ({
        account_code: l.account_code,
        description: l.description,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }))
      .filter((l) => l.account_code && (l.debit > 0 || l.credit > 0));

    if (payloadLines.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Incomplete entry',
        description: 'Add at least two lines with account and amount.',
      });
      return;
    }

    if (status === 'POSTED' && !totals.balanced) {
      toast({
        variant: 'destructive',
        title: 'Not balanced',
        description: `Debit ${money(totals.debit)} must equal Credit ${money(totals.credit)}.`,
      });
      return;
    }

    setSaving(true);
    try {
      const nextStatus = alreadyPosted ? 'POSTED' : status;
      const result = editing
        ? await apiClient.updateJournal(
            String(journal._id),
            {
              entry_date: entryDate,
              memo,
              status: nextStatus,
              lines: payloadLines,
            },
            documents
          )
        : await apiClient.createJournal(
            {
              entry_date: entryDate,
              memo,
              source: 'MANUAL',
              status: nextStatus,
              source_label: 'Manual journal entry',
              lines: payloadLines,
            },
            documents
          );

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: result.error || (editing ? 'Could not update journal entry' : 'Could not create journal entry'),
        });
        return;
      }

      const meta = (result as any).meta;
      if (meta?.adjustment) {
        toast({
          title: 'Adjustment posted',
          description:
            meta.message ||
            `Period ${meta.locked_period} is locked. Created ${
              (result.data as any)?.entry_no || ''
            } in ${meta.adjustment_period}.`,
        });
      } else {
        toast({
          title: nextStatus === 'POSTED' ? (editing && alreadyPosted ? 'Journal updated' : 'Journal posted') : 'Draft saved',
          description: `Entry ${(result.data as any)?.entry_no || journal?.entry_no || ''} ${
            nextStatus === 'POSTED' && !(editing && alreadyPosted) ? 'posted' : 'saved'
          } successfully.`,
        });
      }
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e?.message || (editing ? 'Could not update journal entry' : 'Could not create journal entry'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-border/60 px-4 py-3 shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">
              {editing ? `Edit ${journal?.entry_no || 'Journal Entry'}` : 'New Journal Entry'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing
                ? journal?.source === 'INVENTORY'
                  ? 'Update this stock-movement journal. Amount changes also update the linked movement cost.'
                  : alreadyPosted
                    ? 'Update date, memo, accounts and amounts. Saving keeps this entry posted.'
                    : 'Save keeps this as a draft. Use Post Entry to put it on the ledgers.'
                : 'Save as a draft, or post the balanced entry to update ledgers and reports.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
          <div className="space-y-1">
            <Label htmlFor="je-date" className="text-[11px]">Date</Label>
            <Input
              id="je-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="je-memo" className="text-[11px]">Memo</Label>
            <Textarea
              id="je-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Description of this journal entry"
              rows={2}
              className="text-xs min-h-[56px]"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="je-docs" className="text-[11px]">Supporting documents</Label>
            <Input
              id="je-docs"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx"
              className="h-8 text-xs"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setDocuments((prev) => {
                  const merged = [...prev, ...files];
                  return merged.slice(0, 5);
                });
                e.target.value = '';
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              Optional. Up to 5 files (PDF, image, Word, Excel), 10MB each.
            </p>
            {documents.length > 0 && (
              <ul className="space-y-1 rounded-md border p-2">
                {documents.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {file.name}{' '}
                        <span className="text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setDocuments((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Lines</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Line
            </Button>
          </div>

          <div className="rounded-md border border-border/60 overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 min-w-[200px] text-[10px] uppercase">Account</TableHead>
                  <TableHead className="h-8 min-w-[160px] text-[10px] uppercase">Description</TableHead>
                  <TableHead className="h-8 w-[110px] text-right text-[10px] uppercase">Debit</TableHead>
                  <TableHead className="h-8 w-[110px] text-right text-[10px] uppercase">Credit</TableHead>
                  <TableHead className="h-8 w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="p-1.5">
                      <Select
                        value={line.account_code || undefined}
                        onValueChange={(v) => updateLine(line.id, { account_code: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.code} value={a.code}>
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        placeholder="Line note"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-xs font-mono"
                        value={line.debit}
                        onChange={(e) =>
                          updateLine(line.id, {
                            debit: e.target.value,
                            credit: e.target.value ? '' : line.credit,
                          })
                        }
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-xs font-mono"
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(line.id, {
                            credit: e.target.value,
                            debit: e.target.value ? '' : line.debit,
                          })
                        }
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={lines.length <= 2}
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={2} className="p-1.5 text-xs font-semibold text-right">
                    Totals {totals.balanced ? '(balanced)' : '(unbalanced)'}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-xs font-semibold">
                    {money(totals.debit)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-xs font-semibold">
                    {money(totals.credit)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-4 py-2.5 shrink-0 gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={alreadyPosted ? 'default' : 'secondary'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleSave(alreadyPosted ? 'POSTED' : 'DRAFT')}
            disabled={saving}
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Save Draft'}
          </Button>
          {!alreadyPosted && (
            <Button type="button" size="sm" className="h-8 text-xs" onClick={() => handleSave('POSTED')} disabled={saving}>
              {saving ? 'Posting...' : 'Post Entry'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
