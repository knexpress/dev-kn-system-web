'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import JournalEntryDetailDialog from './journal-entry-detail-dialog';

type InventoryItemDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string | null;
};

function money(n: number) {
  return Number(n || 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: string | Date) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toISOString().slice(0, 10);
}

export default function InventoryItemDetailDialog({
  open,
  onOpenChange,
  sku,
}: InventoryItemDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [stockValue, setStockValue] = useState(0);
  const [journalOpen, setJournalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);

  useEffect(() => {
    if (!open || !sku) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setItem(null);
      setMovements([]);
      try {
        const result = await apiClient.getInventoryItem(sku);
        if (cancelled) return;
        if (!result.success || !result.data) {
          setError(result.error || 'Failed to load item');
          return;
        }
        setItem(result.data.item);
        setMovements(result.data.movements || []);
        setStockValue(result.data.stock_value || 0);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load item');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sku]);

  const openJournal = async (movement: any) => {
    if (movement.journal) {
      setSelectedJournal(movement.journal);
      setJournalOpen(true);
      return;
    }
    if (!movement.journal_entry_id) return;
    const result = await apiClient.getJournal(String(movement.journal_entry_id));
    if (result.success && result.data) {
      setSelectedJournal(result.data);
      setJournalOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {item ? (
                <>
                  <span className="font-mono">{item.sku}</span>
                  <span>— {item.name}</span>
                </>
              ) : (
                <span className="font-mono">{sku || 'Item'}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              Stock history and linked journal entries for this SKU.
            </DialogDescription>
          </DialogHeader>

          {loading && <p className="text-sm text-muted-foreground">Loading item detail…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {item && !loading && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 rounded-md border p-4 bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground">Qty on hand</p>
                  <p className="font-mono text-lg font-semibold">
                    {item.qty_on_hand} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg cost</p>
                  <p className="font-mono text-lg font-semibold">{money(item.avg_cost)} AED</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stock value</p>
                  <p className="font-mono text-lg font-semibold">{money(stockValue)} AED</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inventory account</p>
                  <p className="font-mono font-medium">{item.asset_account_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">COGS account</p>
                  <p className="font-mono font-medium">{item.cogs_account_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Income account</p>
                  <p className="font-mono font-medium">{item.income_account_code}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Stock movements → journals</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Journal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                            No movements for this item yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        movements.map((m) => (
                          <TableRow
                            key={m._id}
                            role={m.journal_entry_id ? 'button' : undefined}
                            tabIndex={m.journal_entry_id ? 0 : undefined}
                            className={
                              m.journal_entry_id
                                ? 'cursor-pointer hover:bg-muted/60'
                                : undefined
                            }
                            onClick={() => openJournal(m)}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ' ') && m.journal_entry_id) {
                                e.preventDefault();
                                openJournal(m);
                              }
                            }}
                          >
                            <TableCell>{fmtDate(m.txn_date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{m.type}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{m.qty}</TableCell>
                            <TableCell className="text-right font-mono">
                              {money(m.unit_cost)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {money(m.total_cost)}
                            </TableCell>
                            <TableCell className="font-mono text-primary">
                              {m.journal_entry_no || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click a movement row to open its linked journal entry audit trail.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <JournalEntryDetailDialog
        open={journalOpen}
        onOpenChange={setJournalOpen}
        journal={selectedJournal}
      />
    </>
  );
}
