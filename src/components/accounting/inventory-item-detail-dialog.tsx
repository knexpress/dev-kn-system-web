'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import JournalEntryDetailDialog from './journal-entry-detail-dialog';
import {
  ErpDialogSection,
  ErpEmptyState,
  ErpMetaGrid,
  MovementTypeBadge,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, money } from './erp-format';
import { cn } from '@/lib/utils';

type InventoryItemDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string | null;
};

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

  const t = erpTableClasses();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl gap-0 p-0 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="border-b border-border/60 px-4 py-3 shrink-0">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                {item ? (
                  <>
                    <span className="font-mono">{item.sku}</span>
                    <span className="font-normal text-muted-foreground">— {item.name}</span>
                  </>
                ) : (
                  <span className="font-mono">{sku || 'Item'}</span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Stock history and linked journal entries
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loading && <ErpEmptyState message="Loading item detail…" />}
            {error && <p className="text-xs text-destructive">{error}</p>}

            {item && !loading && (
              <>
                <ErpDialogSection title="Item summary">
                  <ErpMetaGrid
                    items={[
                      {
                        label: 'Qty on hand',
                        value: (
                          <span className="font-mono">
                            {item.qty_on_hand} {item.unit}
                          </span>
                        ),
                      },
                      {
                        label: 'Avg cost',
                        value: <span className="font-mono">{money(item.avg_cost)} AED</span>,
                      },
                      {
                        label: 'Stock value',
                        value: <span className="font-mono">{money(stockValue)} AED</span>,
                      },
                      {
                        label: 'Inventory acct',
                        value: <span className="font-mono">{item.asset_account_code}</span>,
                      },
                      {
                        label: 'COGS acct',
                        value: <span className="font-mono">{item.cogs_account_code}</span>,
                      },
                      {
                        label: 'Income acct',
                        value: <span className="font-mono">{item.income_account_code}</span>,
                      },
                    ]}
                  />
                </ErpDialogSection>

                <ErpDialogSection title="Movements → journals">
                  <div className="rounded-md border border-border/60 overflow-hidden">
                    <Table className={t.table}>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={t.head}>Date</TableHead>
                          <TableHead className={t.head}>Type</TableHead>
                          <TableHead className={cn(t.head, 'text-right')}>Qty</TableHead>
                          <TableHead className={cn(t.head, 'text-right')}>Unit Cost</TableHead>
                          <TableHead className={cn(t.head, 'text-right')}>Total</TableHead>
                          <TableHead className={t.head}>Journal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <ErpEmptyState message="No movements for this item yet." />
                            </TableCell>
                          </TableRow>
                        ) : (
                          movements.map((m) => (
                            <TableRow
                              key={m._id}
                              data-clickable={m.journal_entry_id ? 'true' : undefined}
                              className={cn(t.row, t.rowAlt)}
                              role={m.journal_entry_id ? 'button' : undefined}
                              tabIndex={m.journal_entry_id ? 0 : undefined}
                              onClick={() => openJournal(m)}
                              onKeyDown={(e) => {
                                if ((e.key === 'Enter' || e.key === ' ') && m.journal_entry_id) {
                                  e.preventDefault();
                                  openJournal(m);
                                }
                              }}
                            >
                              <TableCell className={t.cell}>{fmtDate(m.txn_date)}</TableCell>
                              <TableCell className={t.cell}>
                                <MovementTypeBadge type={m.type} />
                              </TableCell>
                              <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                                {m.qty}
                              </TableCell>
                              <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                                {money(m.unit_cost)}
                              </TableCell>
                              <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                                {money(m.total_cost)}
                              </TableCell>
                              <TableCell className={cn(t.cell, 'font-mono text-primary')}>
                                {m.journal_entry_no || '—'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Click a movement row to open its linked journal entry.
                  </p>
                </ErpDialogSection>
              </>
            )}
          </div>
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
