'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import AddInventoryItemDialog from './add-inventory-item-dialog';
import RecordStockMovementDialog from './record-stock-movement-dialog';
import InventoryItemDetailDialog from './inventory-item-detail-dialog';
import JournalEntryDetailDialog from './journal-entry-detail-dialog';
import NewJournalEntryDialog from './new-journal-entry-dialog';
import {
  ErpEmptyState,
  ErpGrid,
  ErpStatStrip,
  ErpToolbar,
  MovementTypeBadge,
  erpPrimaryButtonClass,
  erpOutlineControlClass,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, money } from './erp-format';
import { cn } from '@/lib/utils';

type InventoryTabProps = {
  mode?: 'items' | 'movements';
};

export default function InventoryTab({ mode = 'items' }: InventoryTabProps) {
  const [items, setItems] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);
  const [editJournalOpen, setEditJournalOpen] = useState(false);
  const [editJournal, setEditJournal] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [itemsRes, txnRes] = await Promise.all([
        apiClient.getInventoryItems(),
        apiClient.getInventoryTransactions(),
      ]);
      if (itemsRes.success && Array.isArray(itemsRes.data)) setItems(itemsRes.data);
      if (txnRes.success && Array.isArray(txnRes.data)) setTxns(txnRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openItem = (sku: string) => {
    setSelectedSku(sku);
    setItemDetailOpen(true);
  };

  const movementCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const txn of txns) {
      const key = String(txn.item_id || txn.sku || '');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [txns]);

  const movementCountFor = (item: any) =>
    (movementCounts.get(String(item?._id || '')) || 0) ||
    (movementCounts.get(String(item?.sku || '')) || 0);

  const confirmDelete = async () => {
    if (!deleteItem?._id) return;
    setDeleting(true);
    try {
      const result = await apiClient.deleteInventoryItem(String(deleteItem._id));
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Could not delete item',
          description: result.error || 'Please try again.',
        });
        return;
      }
      toast({ title: 'Item deleted', description: `${deleteItem.sku} removed from inventory.` });
      setDeleteItem(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const openMovementJournal = async (txn: any) => {
    if (!txn.journal_entry_id) return;
    const result = await apiClient.getJournal(String(txn.journal_entry_id));
    if (result.success && result.data) {
      setSelectedJournal(result.data);
      setJournalOpen(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Could not open journal',
        description: result.error || 'Journal entry not found',
      });
    }
  };

  const startEditJournal = (journal: any) => {
    setJournalOpen(false);
    setEditJournal(journal);
    setEditJournalOpen(true);
  };

  const afterJournalEdited = async () => {
    setEditJournalOpen(false);
    setEditJournal(null);
    await load();
    if (selectedJournal?._id) {
      const result = await apiClient.getJournal(String(selectedJournal._id));
      if (result.success && result.data) {
        setSelectedJournal(result.data);
        setJournalOpen(true);
      }
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!q) return true;
      return (
        String(item.sku || '').toLowerCase().includes(q) ||
        String(item.name || '').toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const filteredTxns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return txns.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (!q) return true;
      return (
        String(t.sku || '').toLowerCase().includes(q) ||
        String(t.item_name || '').toLowerCase().includes(q) ||
        String(t.journal_entry_no || '').toLowerCase().includes(q)
      );
    });
  }, [txns, search, typeFilter]);

  const stockValue = useMemo(
    () => items.reduce((s, i) => s + (Number(i.qty_on_hand) || 0) * (Number(i.avg_cost) || 0), 0),
    [items]
  );

  const lowStock = useMemo(
    () =>
      items.filter(
        (i) =>
          Number(i.reorder_level) > 0 && Number(i.qty_on_hand) <= Number(i.reorder_level)
      ).length,
    [items]
  );

  const t = erpTableClasses();

  if (mode === 'movements') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ErpToolbar
          title="Stock Movements"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="SKU or journal…"
          onRefresh={load}
          refreshing={loading}
          filters={
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={cn(erpOutlineControlClass(), 'w-[140px]')}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="RECEIPT">RECEIPT</SelectItem>
                <SelectItem value="ISSUE">ISSUE</SelectItem>
                <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
              </SelectContent>
            </Select>
          }
          actions={
            <Button className={erpPrimaryButtonClass()} onClick={() => setMovementOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Record Movement
            </Button>
          }
        />
        <ErpStatStrip
          items={[
            { label: 'Movements', value: txns.length },
            { label: 'Showing', value: filteredTxns.length },
            {
              label: 'Linked JEs',
              value: txns.filter((x) => x.journal_entry_id).length,
            },
            {
              label: 'Receipts',
              value: txns.filter((x) => x.type === 'RECEIPT').length,
            },
            {
              label: 'Issues',
              value: txns.filter((x) => x.type === 'ISSUE').length,
            },
          ]}
        />
        <ErpGrid>
          <Table className={t.table}>
            <TableHeader>
              <TableRow>
                <TableHead className={t.head}>Date</TableHead>
                <TableHead className={t.head}>Type</TableHead>
                <TableHead className={t.head}>SKU</TableHead>
                <TableHead className={t.head}>Item</TableHead>
                <TableHead className={cn(t.head, 'text-right')}>Qty</TableHead>
                <TableHead className={cn(t.head, 'text-right')}>Unit Cost</TableHead>
                <TableHead className={t.head}>Journal</TableHead>
                <TableHead className={cn(t.head, 'w-[90px]')} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <ErpEmptyState message="Loading movements…" />
                  </TableCell>
                </TableRow>
              ) : filteredTxns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <ErpEmptyState message="No stock movements yet." />
                  </TableCell>
                </TableRow>
              ) : (
                filteredTxns.map((txn) => (
                  <TableRow
                    key={txn._id}
                    data-clickable={txn.journal_entry_id ? 'true' : undefined}
                    className={cn(t.row, t.rowAlt)}
                    role={txn.journal_entry_id ? 'button' : undefined}
                    tabIndex={txn.journal_entry_id ? 0 : undefined}
                    onClick={() => openMovementJournal(txn)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && txn.journal_entry_id) {
                        e.preventDefault();
                        openMovementJournal(txn);
                      }
                    }}
                  >
                    <TableCell className={t.cell}>{fmtDate(txn.txn_date)}</TableCell>
                    <TableCell className={t.cell}>
                      <MovementTypeBadge type={txn.type} />
                    </TableCell>
                    <TableCell className={cn(t.cell, 'font-mono')}>{txn.sku}</TableCell>
                    <TableCell className={cn(t.cell, 'max-w-[160px] truncate')}>
                      {txn.item_name}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                      {txn.qty}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                      {money(txn.unit_cost)}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'font-mono text-primary')}>
                      {txn.journal_entry_no || '—'}
                    </TableCell>
                    <TableCell className={t.cell} onClick={(e) => e.stopPropagation()}>
                      {txn.journal_entry_id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={async () => {
                            const result = await apiClient.getJournal(String(txn.journal_entry_id));
                            if (result.success && result.data) {
                              startEditJournal(result.data);
                            } else {
                              toast({
                                variant: 'destructive',
                                title: 'Could not open journal',
                                description: result.error || 'Journal entry not found',
                              });
                            }
                          }}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit JE
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ErpGrid>

        <RecordStockMovementDialog
          open={movementOpen}
          onOpenChange={setMovementOpen}
          onCreated={load}
        />
        <JournalEntryDetailDialog
          open={journalOpen}
          onOpenChange={setJournalOpen}
          journal={selectedJournal}
          onEdit={startEditJournal}
          onPosted={(posted) => {
            setSelectedJournal(posted);
            load();
          }}
        />
        <NewJournalEntryDialog
          open={editJournalOpen}
          onOpenChange={(open) => {
            setEditJournalOpen(open);
            if (!open) setEditJournal(null);
          }}
          journal={editJournal}
          onCreated={afterJournalEdited}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ErpToolbar
        title="Inventory Items"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="SKU or name…"
        onRefresh={load}
        refreshing={loading}
        actions={
          <Button className={erpPrimaryButtonClass()} onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Item
          </Button>
        }
      />
      <ErpStatStrip
        items={[
          { label: 'SKUs', value: items.length },
          { label: 'Showing', value: filteredItems.length },
          { label: 'Low stock', value: lowStock },
          { label: 'Stock value', value: `${money(stockValue)} AED` },
          {
            label: 'Units on hand',
            value: items.reduce((s, i) => s + (Number(i.qty_on_hand) || 0), 0),
          },
        ]}
      />
      <ErpGrid>
        <Table className={t.table}>
          <TableHeader>
            <TableRow>
              <TableHead className={t.head}>SKU</TableHead>
              <TableHead className={t.head}>Name</TableHead>
              <TableHead className={t.head}>Unit</TableHead>
              <TableHead className={cn(t.head, 'text-right')}>Qty</TableHead>
              <TableHead className={cn(t.head, 'text-right')}>Avg Cost</TableHead>
              <TableHead className={cn(t.head, 'text-right')}>Value</TableHead>
              <TableHead className={cn(t.head, 'text-right')}>Reorder</TableHead>
              <TableHead className={cn(t.head, 'w-[90px] text-right')}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <ErpEmptyState message="Loading inventory…" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <ErpEmptyState message="No inventory items found." />
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const low =
                  Number(item.reorder_level) > 0 &&
                  Number(item.qty_on_hand) <= Number(item.reorder_level);
                const value =
                  (Number(item.qty_on_hand) || 0) * (Number(item.avg_cost) || 0);
                return (
                  <TableRow
                    key={item._id || item.sku}
                    data-clickable="true"
                    className={cn(t.row, t.rowAlt, low && 'bg-amber-500/5')}
                    role="button"
                    tabIndex={0}
                    onClick={() => openItem(item.sku)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openItem(item.sku);
                      }
                    }}
                  >
                    <TableCell className={cn(t.cell, 'font-mono text-primary')}>
                      {item.sku}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'font-medium')}>{item.name}</TableCell>
                    <TableCell className={t.cell}>
                      {item.unit}
                      {item.is_active === false && (
                        <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] uppercase text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        t.cell,
                        'text-right font-mono tabular-nums',
                        low && 'font-semibold text-amber-700 dark:text-amber-400'
                      )}
                    >
                      {item.qty_on_hand}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                      {money(item.avg_cost)}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                      {money(value)}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                      {item.reorder_level}
                    </TableCell>
                    <TableCell
                      className={cn(t.cell, 'text-right')}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit item"
                          onClick={() => setEditItem(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete item"
                          onClick={() => setDeleteItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ErpGrid>

      <AddInventoryItemDialog open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
      <AddInventoryItemDialog
        open={Boolean(editItem)}
        onOpenChange={(open) => !open && setEditItem(null)}
        onCreated={load}
        item={editItem}
        hasMovements={movementCountFor(editItem) > 0}
      />
      <InventoryItemDetailDialog
        open={itemDetailOpen}
        onOpenChange={setItemDetailOpen}
        sku={selectedSku}
      />
      <AlertDialog open={Boolean(deleteItem)} onOpenChange={(open) => !open && !deleting && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.sku}?</AlertDialogTitle>
            <AlertDialogDescription>
              {movementCountFor(deleteItem) > 0
                ? `${deleteItem?.name} has ${movementCountFor(deleteItem)} stock movement(s) posted to the ledger, so it cannot be deleted. Edit the item and switch it to inactive instead.`
                : `${deleteItem?.name} will be permanently removed from inventory. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            {movementCountFor(deleteItem) > 0 ? (
              <AlertDialogAction
                onClick={() => {
                  const item = deleteItem;
                  setDeleteItem(null);
                  setEditItem(item);
                }}
              >
                Edit Item
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
