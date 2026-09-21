'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Paperclip } from 'lucide-react';

type JournalEntryDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal: any | null;
};

function money(n: number) {
  return Number(n || 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateTime(d?: string | Date) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDate(d?: string | Date) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toISOString().slice(0, 10);
}

function apiOrigin() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'
  );
}

const SOURCE_HELP: Record<string, string> = {
  MANUAL: 'Created manually in Accounting → General Ledger',
  INVOICE: 'Generated from an invoice posting',
  INVENTORY: 'Generated from an inventory stock movement',
  PAYMENT: 'Generated from a payment / remittance',
  ADJUSTMENT: 'Created as an adjustment entry',
  OPENING: 'Opening balance / system seed',
};

export default function JournalEntryDetailDialog({
  open,
  onOpenChange,
  journal,
}: JournalEntryDetailDialogProps) {
  if (!journal) return null;

  const docs = journal.supporting_documents || [];
  const lines = journal.lines || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{journal.entry_no}</span>
            <Badge variant={journal.status === 'POSTED' ? 'secondary' : 'outline'}>
              {journal.status}
            </Badge>
            <Badge variant="outline">{journal.source}</Badge>
          </DialogTitle>
          <DialogDescription>
            Full audit trail for this journal entry — origin, creator, and timing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 rounded-md border p-4 bg-muted/20">
          <div>
            <p className="text-xs text-muted-foreground">Where it came from</p>
            <p className="font-medium">
              {journal.source_label || SOURCE_HELP[journal.source] || journal.source || '—'}
            </p>
            {journal.source_reference && (
              <p className="text-sm text-muted-foreground mt-1">
                Reference: <span className="font-mono">{journal.source_reference}</span>
              </p>
            )}
            {!journal.source_reference && journal.source === 'MANUAL' && (
              <p className="text-sm text-muted-foreground mt-1">
                Manual posting from the Accounting module
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Who made it</p>
            <p className="font-medium">{journal.created_by_name || 'Unknown'}</p>
            {journal.created_by_email && (
              <p className="text-sm text-muted-foreground">{journal.created_by_email}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">When it was created</p>
            <p className="font-medium">{fmtDateTime(journal.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">When it was posted</p>
            <p className="font-medium">{fmtDateTime(journal.posted_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Journal date</p>
            <p className="font-medium">{fmtDate(journal.entry_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="font-medium">{fmtDateTime(journal.updatedAt)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Memo</p>
            <p className="font-medium">{journal.memo || '—'}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Lines</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line: any, idx: number) => (
                  <TableRow key={`${line.account_code}-${idx}`}>
                    <TableCell>
                      <span className="font-mono">{line.account_code}</span>
                      <span className="text-muted-foreground"> — {line.account_name}</span>
                    </TableCell>
                    <TableCell>{line.description || '—'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit ? money(line.debit) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit ? money(line.credit) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold text-right">
                    Totals
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {money(journal.total_debit)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {money(journal.total_credit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Supporting documents</h3>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents attached.</p>
          ) : (
            <ul className="space-y-1 rounded-md border p-3">
              {docs.map((doc: any, i: number) => (
                <li key={`detail-doc-${i}`}>
                  <a
                    href={`${apiOrigin()}${doc.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {doc.original_name || 'Document'}
                    {doc.uploaded_at && (
                      <span className="text-muted-foreground">
                        · uploaded {fmtDateTime(doc.uploaded_at)}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
