'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import AddInventoryItemDialog from './add-inventory-item-dialog';
import RecordStockMovementDialog from './record-stock-movement-dialog';
import InventoryItemDetailDialog from './inventory-item-detail-dialog';
import JournalEntryDetailDialog from './journal-entry-detail-dialog';

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

export default function InventoryTab() {
  const [items, setItems] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);

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

  const openMovementJournal = async (txn: any) => {
    if (!txn.journal_entry_id && !txn.journal_entry_no) return;
    if (txn.journal_entry_id) {
      const result = await apiClient.getJournal(String(txn.journal_entry_id));
      if (result.success && result.data) {
        setSelectedJournal(result.data);
        setJournalOpen(true);
        return;
      }
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Products / SKUs</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>
                  Click an item to see stock movements and linked journal entries.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Qty on Hand</TableHead>
                      <TableHead className="text-right">Avg Cost (AED)</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Loading inventory...
                        </TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No inventory items found. Add one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow
                          key={item._id || item.sku}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer hover:bg-muted/60"
                          onClick={() => openItem(item.sku)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openItem(item.sku);
                            }
                          }}
                        >
                          <TableCell className="font-mono text-primary">{item.sku}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right font-mono">{item.qty_on_hand}</TableCell>
                          <TableCell className="text-right font-mono">{money(item.avg_cost)}</TableCell>
                          <TableCell className="text-right font-mono">{item.reorder_level}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Stock Movements</CardTitle>
                <CardDescription>
                  Click a movement to open its linked journal entry audit trail.
                </CardDescription>
              </div>
              <Button onClick={() => setMovementOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Record Movement
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Journal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Loading movements...
                        </TableCell>
                      </TableRow>
                    ) : txns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No stock movements yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      txns.map((t) => (
                        <TableRow
                          key={t._id}
                          role={t.journal_entry_id ? 'button' : undefined}
                          tabIndex={t.journal_entry_id ? 0 : undefined}
                          className={
                            t.journal_entry_id ? 'cursor-pointer hover:bg-muted/60' : undefined
                          }
                          onClick={() => openMovementJournal(t)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && t.journal_entry_id) {
                              e.preventDefault();
                              openMovementJournal(t);
                            }
                          }}
                        >
                          <TableCell>{fmtDate(t.txn_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{t.sku}</TableCell>
                          <TableCell>{t.item_name}</TableCell>
                          <TableCell className="text-right font-mono">{t.qty}</TableCell>
                          <TableCell className="text-right font-mono">{money(t.unit_cost)}</TableCell>
                          <TableCell className="font-mono text-primary">
                            {t.journal_entry_no || '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddInventoryItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={load}
      />
      <RecordStockMovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        onCreated={load}
      />
      <InventoryItemDetailDialog
        open={itemDetailOpen}
        onOpenChange={setItemDetailOpen}
        sku={selectedSku}
      />
      <JournalEntryDetailDialog
        open={journalOpen}
        onOpenChange={setJournalOpen}
        journal={selectedJournal}
      />
    </div>
  );
}
