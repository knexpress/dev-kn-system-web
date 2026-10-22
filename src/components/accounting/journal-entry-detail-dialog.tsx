'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Paperclip, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  ErpDialogSection,
  ErpMetaGrid,
  JournalStatusBadge,
  SourceBadge,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, fmtDateTime, money } from './erp-format';
import { cn } from '@/lib/utils';

type JournalEntryDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal: any | null;
  onEdit?: (journal: any) => void;
  onPosted?: (journal: any) => void;
};

function apiOrigin() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
}

const SOURCE_HELP: Record<string, string> = {
  MANUAL: 'Created manually in Accounting → Journals',
  INVOICE: 'Generated from an invoice posting',
  INVENTORY: 'Generated from an inventory stock movement',
  PAYMENT: 'Generated from a payment / remittance',
  ADJUSTMENT: 'Period or manual adjustment (often next open month after a lock)',
  OPENING: 'Opening balance / system seed',
};

const EDITABLE_SOURCES = new Set(['MANUAL', 'INVENTORY', 'ADJUSTMENT', 'OPENING']);

export function canEditJournal(journal: any | null | undefined) {
  if (!journal) return false;
  if (String(journal.status || '').toUpperCase() === 'DRAFT') return true;
  return EDITABLE_SOURCES.has(String(journal.source || '').toUpperCase());
}

export default function JournalEntryDetailDialog({
  open,
  onOpenChange,
  journal,
  onEdit,
  onPosted,
}: JournalEntryDetailDialogProps) {
  const { toast } = useToast();
  const [posting, setPosting] = useState(false);
  if (!journal) return null;

  const docs = journal.supporting_documents || [];
  const lines = journal.lines || [];
  const t = erpTableClasses();
  const editable = Boolean(onEdit) && canEditJournal(journal);
  const isDraft = String(journal.status || '').toUpperCase() === 'DRAFT';

  const postDraft = async () => {
    setPosting(true);
    const result = await apiClient.postJournal(String(journal._id));
    setPosting(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not post journal', description: result.error });
      return;
    }
    toast({
      title: 'Journal posted',
      description: `Entry ${(result.data as any)?.entry_no || journal.entry_no} is now on the ledgers.`,
    });
    onPosted?.(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-3 p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-border/60 px-4 py-3 shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="font-mono">{journal.entry_no}</span>
              <JournalStatusBadge status={journal.status} />
              <SourceBadge source={journal.source} />
              {(editable || isDraft) && (
                <span className="ml-auto inline-flex items-center gap-1.5">
                  {isDraft && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={posting}
                      onClick={() => void postDraft()}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {posting ? 'Posting...' : 'Post Entry'}
                    </Button>
                  )}
                  {editable && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onEdit?.(journal)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit JE
                    </Button>
                  )}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit trail — origin, creator, and posting timeline
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <ErpDialogSection title="Traceability">
            <ErpMetaGrid
              items={[
                {
                  label: 'Origin',
                  value:
                    journal.source_label ||
                    SOURCE_HELP[journal.source] ||
                    journal.source ||
                    '—',
                },
                {
                  label: 'Reference',
                  value: (
                    <span className="font-mono">
                      {journal.source_reference || '—'}
                    </span>
                  ),
                },
                {
                  label: 'Created by',
                  value: (
                    <span>
                      {journal.created_by_name || 'Unknown'}
                      {journal.created_by_email && (
                        <span className="block text-[10px] font-normal text-muted-foreground truncate">
                          {journal.created_by_email}
                        </span>
                      )}
                    </span>
                  ),
                },
                { label: 'Created', value: fmtDateTime(journal.createdAt) },
                { label: 'Posted', value: fmtDateTime(journal.posted_at) },
                { label: 'Journal date', value: fmtDate(journal.entry_date) },
                { label: 'Updated', value: fmtDateTime(journal.updatedAt) },
                { label: 'Memo', value: journal.memo || '—' },
                ...(journal.adjusts_journal_no
                  ? [
                      {
                        label: 'Adjusts',
                        value: (
                          <span className="font-mono">{journal.adjusts_journal_no}</span>
                        ),
                      },
                    ]
                  : []),
                ...(journal.adjusted_by_journal_no
                  ? [
                      {
                        label: 'Adjusted by',
                        value: (
                          <span className="font-mono">{journal.adjusted_by_journal_no}</span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </ErpDialogSection>

          <ErpDialogSection title="Journal lines">
            <div className="rounded-md border border-border/60 overflow-hidden">
              <Table className={t.table}>
                <TableHeader>
                  <TableRow>
                    <TableHead className={t.head}>Account</TableHead>
                    <TableHead className={t.head}>Description</TableHead>
                    <TableHead className={cn(t.head, 'text-right')}>Debit</TableHead>
                    <TableHead className={cn(t.head, 'text-right')}>Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line: any, idx: number) => (
                    <TableRow key={`${line.account_code}-${idx}`} className={cn(t.row, t.rowAlt)}>
                      <TableCell className={t.cell}>
                        <span className="font-mono">{line.account_code}</span>
                        <span className="text-muted-foreground"> — {line.account_name}</span>
                      </TableCell>
                      <TableCell className={t.cell}>{line.description || '—'}</TableCell>
                      <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                        {line.debit ? money(line.debit) : '—'}
                      </TableCell>
                      <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                        {line.credit ? money(line.credit) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell className={cn(t.cell, 'text-right')} colSpan={2}>
                      Totals
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono')}>
                      {money(journal.total_debit)}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono')}>
                      {money(journal.total_credit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </ErpDialogSection>

          <ErpDialogSection title="Supporting documents">
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents attached.</p>
            ) : (
              <ul className="space-y-1 rounded-md border border-border/60 p-2.5">
                {docs.map((doc: any, i: number) => (
                  <li key={`detail-doc-${i}`}>
                    <a
                      href={`${apiOrigin()}${doc.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <Paperclip className="h-3 w-3" />
                      {doc.original_name || 'Document'}
                      {doc.uploaded_at && (
                        <span className="text-muted-foreground">
                          · {fmtDateTime(doc.uploaded_at)}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </ErpDialogSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}
