'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import NewJournalEntryDialog from './new-journal-entry-dialog';
import JournalEntryDetailDialog from './journal-entry-detail-dialog';

type GeneralLedgerTabProps = {
  selectedAccountCode?: string | null;
  initialSubTab?: 'journals' | 'ledger';
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

export default function GeneralLedgerTab({
  selectedAccountCode = null,
  initialSubTab = 'journals',
}: GeneralLedgerTabProps) {
  const [subTab, setSubTab] = useState<'journals' | 'ledger'>(initialSubTab);
  const [accountCode, setAccountCode] = useState<string>(selectedAccountCode || '');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [ledger, setLedger] = useState<{ account?: any; rows: any[]; closing_balance?: number }>({
    rows: [],
  });
  const [loadingJournals, setLoadingJournals] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (selectedAccountCode) {
      setAccountCode(selectedAccountCode);
      setSubTab('ledger');
    }
  }, [selectedAccountCode]);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  const loadAccountsAndJournals = async () => {
    setLoadingJournals(true);
    try {
      const [accRes, jouRes] = await Promise.all([
        apiClient.getAccounts(),
        apiClient.getJournals(),
      ]);
      if (accRes.success && Array.isArray(accRes.data)) setAccounts(accRes.data);
      if (jouRes.success && Array.isArray(jouRes.data)) setJournals(jouRes.data);
    } finally {
      setLoadingJournals(false);
    }
  };

  const loadLedger = async (code: string) => {
    if (!code) {
      setLedger({ rows: [] });
      return;
    }
    setLoadingLedger(true);
    try {
      const result = await apiClient.getAccountLedger(code);
      if (result.success && result.data) {
        setLedger(result.data);
      } else {
        setLedger({ rows: [] });
      }
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    loadAccountsAndJournals();
  }, []);

  useEffect(() => {
    if (accountCode) loadLedger(accountCode);
  }, [accountCode]);

  const selectedAccount =
    accounts.find((a) => a.code === accountCode) || ledger.account || null;

  const handleJournalCreated = async () => {
    await loadAccountsAndJournals();
    if (accountCode) {
      await loadLedger(accountCode);
    }
  };

  const openJournalFromLedger = async (row: any) => {
    if (row.journal_id) {
      const result = await apiClient.getJournal(String(row.journal_id));
      if (result.success && result.data) {
        setSelectedJournal(result.data);
        setDetailOpen(true);
        return;
      }
    }
    const match = journals.find((j) => j.entry_no === row.entry_no);
    if (match) {
      setSelectedJournal(match);
      setDetailOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <NewJournalEntryDialog
        open={newEntryOpen}
        onOpenChange={setNewEntryOpen}
        onCreated={handleJournalCreated}
      />
      <JournalEntryDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        journal={selectedJournal}
      />

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'journals' | 'ledger')}>
        <TabsList>
          <TabsTrigger value="journals">Journal Entries</TabsTrigger>
          <TabsTrigger value="ledger">Account Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="journals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Journal Entries</CardTitle>
                <CardDescription>Posted double-entry journals from the ledger.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAccountsAndJournals}
                  disabled={loadingJournals}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingJournals ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={() => setNewEntryOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Journal Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Memo</TableHead>
                      <TableHead>Docs</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingJournals ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          Loading journals...
                        </TableCell>
                      </TableRow>
                    ) : journals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No journal entries found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      journals.map((j) => (
                        <TableRow
                          key={j._id || j.entry_no}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer hover:bg-muted/60"
                          onClick={() => {
                            setSelectedJournal(j);
                            setDetailOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedJournal(j);
                              setDetailOpen(true);
                            }
                          }}
                        >
                          <TableCell className="font-mono text-primary">{j.entry_no}</TableCell>
                          <TableCell>{fmtDate(j.entry_date)}</TableCell>
                          <TableCell className="max-w-[240px] truncate">{j.memo || '—'}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {(j.supporting_documents || []).length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {(j.supporting_documents || []).map((doc: any, i: number) => (
                                  <a
                                    key={`${j.entry_no}-doc-${i}`}
                                    href={`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${doc.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline truncate max-w-[140px]"
                                    title={doc.original_name}
                                  >
                                    {doc.original_name || 'Document'}
                                  </a>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{j.source}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{money(j.total_debit)}</TableCell>
                          <TableCell className="text-right font-mono">{money(j.total_credit)}</TableCell>
                          <TableCell>
                            <Badge variant={j.status === 'POSTED' ? 'secondary' : 'outline'}>
                              {j.status}
                            </Badge>
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

        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Ledger</CardTitle>
              <CardDescription>
                Running debit/credit activity for a single account. Click a ledger line to open the
                journal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 min-w-[280px]">
                  <Label htmlFor="ledger-account">Account</Label>
                  <Select value={accountCode || undefined} onValueChange={setAccountCode}>
                    <SelectTrigger id="ledger-account">
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.code} value={account.code}>
                          {account.code} — {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAccount && (
                  <div className="flex flex-wrap items-center gap-2 pb-2">
                    <Badge variant="outline">{selectedAccount.type}</Badge>
                    {selectedAccount.subtype && (
                      <Badge variant="secondary">{selectedAccount.subtype}</Badge>
                    )}
                  </div>
                )}
              </div>

              {selectedAccount && (
                <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">{selectedAccount.code}</p>
                    <p className="text-lg font-semibold">{selectedAccount.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Closing balance</p>
                    <p className="font-mono text-lg font-semibold">
                      {money(ledger.closing_balance || 0)} AED
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!accountCode ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Select an account above, or click one from Chart of Accounts.
                        </TableCell>
                      </TableRow>
                    ) : loadingLedger ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Loading ledger...
                        </TableCell>
                      </TableRow>
                    ) : (ledger.rows || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No posted movements for this account yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledger.rows.map((row, idx) => (
                        <TableRow
                          key={`${row.entry_no}-${idx}`}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer hover:bg-muted/60"
                          onClick={() => openJournalFromLedger(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openJournalFromLedger(row);
                            }
                          }}
                        >
                          <TableCell>{fmtDate(row.date)}</TableCell>
                          <TableCell className="font-mono text-primary">{row.entry_no}</TableCell>
                          <TableCell>{row.description || '—'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {row.debit ? money(row.debit) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.credit ? money(row.credit) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">{money(row.balance)}</TableCell>
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
    </div>
  );
}
