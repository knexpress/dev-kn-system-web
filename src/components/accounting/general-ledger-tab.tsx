'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Plus, RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import NewJournalEntryDialog from './new-journal-entry-dialog';
import JournalEntryDetailDialog from './journal-entry-detail-dialog';
import {
  ErpEmptyState,
  ErpGrid,
  ErpStatStrip,
  ErpToolbar,
  JournalStatusBadge,
  SourceBadge,
  erpPrimaryButtonClass,
  erpOutlineControlClass,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, money } from './erp-format';
import { cn } from '@/lib/utils';

type GeneralLedgerTabProps = {
  mode?: 'journals' | 'ledger';
  selectedAccountCode?: string | null;
};

export default function GeneralLedgerTab({
  mode = 'journals',
  selectedAccountCode = null,
}: GeneralLedgerTabProps) {
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
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceGl, setInvoiceGl] = useState<{ summary: Record<string, number>; failed: any[] }>({
    summary: {},
    failed: [],
  });
  const [retrying, setRetrying] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const openEntry = searchParams?.get('entry') || '';
  const openId = searchParams?.get('id') || '';
  const openInvoice = searchParams?.get('invoice') || '';
  const autoOpenedKey = useRef('');

  useEffect(() => {
    if (selectedAccountCode) setAccountCode(selectedAccountCode);
  }, [selectedAccountCode]);

  const loadAccountsAndJournals = async () => {
    setLoadingJournals(true);
    try {
      const [accRes, jouRes, glRes] = await Promise.all([
        apiClient.getAccounts(),
        apiClient.getJournals(),
        apiClient.getFinanceInvoiceGlStatus(),
      ]);
      if (accRes.success && Array.isArray(accRes.data)) setAccounts(accRes.data);
      if (jouRes.success && Array.isArray(jouRes.data)) setJournals(jouRes.data);
      if (glRes.success && glRes.data) setInvoiceGl(glRes.data as any);
    } finally {
      setLoadingJournals(false);
    }
  };

  const retryFailedInvoiceJournals = async () => {
    setRetrying(true);
    try {
      const result: any = await apiClient.postPendingFinanceInvoiceJournals();
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Retry failed', description: result.error || 'Could not post journals' });
        return;
      }
      const { posted = [], failed = [] } = result.data || {};
      toast({
        variant: failed.length ? 'destructive' : 'default',
        title: `${posted.length} invoice journal${posted.length === 1 ? '' : 's'} posted`,
        description: failed.length
          ? `${failed.length} still failing: ${failed[0]?.error || 'unknown error'}`
          : 'All finance invoices are now in the ledger.',
      });
      await loadAccountsAndJournals();
    } finally {
      setRetrying(false);
    }
  };

  const failedInvoiceCount = invoiceGl.summary.FAILED || 0;

  const loadLedger = async (code: string) => {
    if (!code) {
      setLedger({ rows: [] });
      return;
    }
    setLoadingLedger(true);
    try {
      const result = await apiClient.getAccountLedger(code);
      if (result.success && result.data) setLedger(result.data);
      else setLedger({ rows: [] });
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    loadAccountsAndJournals();
  }, []);

  useEffect(() => {
    if (!accountCode && !selectedAccountCode && accounts.length > 0) {
      setAccountCode(accounts[0].code);
    }
  }, [accounts, accountCode, selectedAccountCode]);

  useEffect(() => {
    if (mode === 'ledger' && accountCode) loadLedger(accountCode);
  }, [accountCode, mode]);

  const selectedAccount =
    accounts.find((a) => a.code === accountCode) || ledger.account || null;

  const handleJournalCreated = async () => {
    await loadAccountsAndJournals();
    if (accountCode) await loadLedger(accountCode);
  };

  const openJournal = (journal: any) => {
    setSelectedJournal(journal);
    setDetailOpen(true);
  };

  useEffect(() => {
    if (mode !== 'journals' || loadingJournals) return;
    const key = `${openId}|${openEntry}|${openInvoice}`;
    if (key === '||' || autoOpenedKey.current === key) return;
    if (!journals.length && !openEntry && !openId && !openInvoice) return;

    const idNorm = String(openId);
    const entryNorm = openEntry.trim().toLowerCase();
    const invoiceNorm = openInvoice.trim().toLowerCase();
    if (!idNorm && !entryNorm && !invoiceNorm) return;

    const rank = (j: any) => {
      const posted = j.status === 'POSTED' ? 2 : j.status === 'DRAFT' ? 1 : 0;
      const invoiceSource = j.source === 'INVOICE' ? 2 : 0;
      return posted + invoiceSource;
    };

    const matches = journals.filter((j) => {
      if (idNorm && String(j._id) === idNorm) return true;
      if (entryNorm && String(j.entry_no || '').toLowerCase() === entryNorm) return true;
      if (invoiceNorm && String(j.source_reference || '').toLowerCase() === invoiceNorm) return true;
      if (invoiceNorm && String(j.memo || '').toLowerCase().includes(invoiceNorm)) return true;
      return false;
    });
    autoOpenedKey.current = key;
    if (!matches.length) {
      toast({
        variant: 'destructive',
        title: 'Journal not found',
        description: openInvoice
          ? `No draft or posted journal is linked to ${openInvoice}.`
          : 'That journal entry could not be found.',
      });
      return;
    }
    matches.sort((a, b) => rank(b) - rank(a));
    const picked = matches[0];
    setSearch(picked.entry_no || openInvoice || openEntry);
    openJournal(picked);
  }, [mode, loadingJournals, journals, openEntry, openId, openInvoice, toast]);

  const openJournalFromLedger = async (row: any) => {
    if (row.journal_id) {
      const result = await apiClient.getJournal(String(row.journal_id));
      if (result.success && result.data) {
        openJournal(result.data);
        return;
      }
    }
    const match = journals.find((j) => j.entry_no === row.entry_no);
    if (match) openJournal(match);
  };

  const filteredJournals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return journals.filter((j) => {
      if (sourceFilter !== 'all' && j.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(j.entry_no || '').toLowerCase().includes(q) ||
        String(j.memo || '').toLowerCase().includes(q) ||
        String(j.source_reference || '').toLowerCase().includes(q)
      );
    });
  }, [journals, search, sourceFilter, statusFilter]);

  const journalStats = useMemo(() => {
    const posted = journals.filter((j) => j.status === 'POSTED').length;
    const debit = journals.reduce((s, j) => s + (Number(j.total_debit) || 0), 0);
    return [
      { label: 'Entries', value: journals.length },
      { label: 'Posted', value: posted },
      { label: 'Showing', value: filteredJournals.length },
      { label: 'Total Debit', value: money(debit) },
      {
        label: 'Sources',
        value: new Set(journals.map((j) => j.source)).size,
      },
      {
        label: 'Finance Invoices Posted',
        value: failedInvoiceCount
          ? `${invoiceGl.summary.POSTED || 0} · ${failedInvoiceCount} failed`
          : invoiceGl.summary.POSTED || 0,
      },
    ];
  }, [journals, filteredJournals.length, invoiceGl, failedInvoiceCount]);

  const filteredLedgerRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ledger.rows || [];
    return (ledger.rows || []).filter(
      (r) =>
        String(r.entry_no || '').toLowerCase().includes(q) ||
        String(r.description || '').toLowerCase().includes(q)
    );
  }, [ledger.rows, search]);

  const t = erpTableClasses();

  if (mode === 'ledger') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ErpToolbar
          title="Account Ledger"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Entry or description…"
          onRefresh={() => accountCode && loadLedger(accountCode)}
          refreshing={loadingLedger}
          filters={
            <div className="flex items-center gap-1.5">
              <Label className="sr-only">Account</Label>
              <Select value={accountCode || undefined} onValueChange={setAccountCode}>
                <SelectTrigger className={cn(erpOutlineControlClass(), 'w-[240px]')}>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.code} value={account.code} className="text-xs">
                      {account.code} — {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
        <ErpStatStrip
          items={[
            { label: 'Account', value: selectedAccount?.code || '—' },
            { label: 'Name', value: selectedAccount?.name || '—' },
            { label: 'Type', value: selectedAccount?.type || '—' },
            { label: 'Lines', value: filteredLedgerRows.length },
            {
              label: 'Closing',
              value: `${money(ledger.closing_balance || 0)} AED`,
            },
          ]}
        />
        <ErpGrid>
          <Table className={t.table}>
            <TableHeader>
              <TableRow>
                <TableHead className={t.head}>Date</TableHead>
                <TableHead className={t.head}>Entry No</TableHead>
                <TableHead className={t.head}>Description</TableHead>
                <TableHead className={cn(t.head, 'text-right')}>Debit</TableHead>
                <TableHead className={cn(t.head, 'text-right')}>Credit</TableHead>
                <TableHead className={cn(t.head, 'text-right')}>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!accountCode ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <ErpEmptyState message="Select an account to view its ledger." />
                  </TableCell>
                </TableRow>
              ) : loadingLedger ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <ErpEmptyState message="Loading ledger…" />
                  </TableCell>
                </TableRow>
              ) : filteredLedgerRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <ErpEmptyState message="No posted movements for this account." />
                  </TableCell>
                </TableRow>
              ) : (
                filteredLedgerRows.map((row, idx) => (
                  <TableRow
                    key={`${row.entry_no}-${idx}`}
                    data-clickable="true"
                    className={cn(t.row, t.rowAlt)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openJournalFromLedger(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openJournalFromLedger(row);
                      }
                    }}
                  >
                    <TableCell className={t.cell}>{fmtDate(row.date)}</TableCell>
                    <TableCell className={cn(t.cell, 'font-mono text-primary')}>
                      {row.entry_no}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'max-w-[240px] truncate')}>
                      {row.description || '—'}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                      {row.debit ? money(row.debit) : '—'}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                      {row.credit ? money(row.credit) : '—'}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums font-medium')}>
                      {money(row.balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ErpGrid>

        <JournalEntryDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          journal={selectedJournal}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ErpToolbar
        title="Journal Entries"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Entry no or memo…"
        onRefresh={loadAccountsAndJournals}
        refreshing={loadingJournals}
        filters={
          <>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className={cn(erpOutlineControlClass(), 'w-[120px]')}>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {['MANUAL', 'INVOICE', 'INVENTORY', 'PAYMENT', 'ADJUSTMENT', 'OPENING'].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cn(erpOutlineControlClass(), 'w-[110px]')}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="POSTED">POSTED</SelectItem>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <>
            {failedInvoiceCount > 0 && (
              <Button
                variant="outline"
                className={cn(erpOutlineControlClass(), 'border-rose-200 text-rose-700')}
                onClick={retryFailedInvoiceJournals}
                disabled={retrying}
                title={invoiceGl.failed[0]?.gl_sync?.last_error}
              >
                <RotateCcw className={cn('mr-1.5 h-3.5 w-3.5', retrying && 'animate-spin')} />
                Retry {failedInvoiceCount} invoice JE{failedInvoiceCount === 1 ? '' : 's'}
              </Button>
            )}
            <Button className={erpPrimaryButtonClass()} onClick={() => setNewEntryOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Entry
            </Button>
          </>
        }
      />
      <ErpStatStrip items={journalStats} />
      <ErpGrid>
        <Table className={t.table}>
          <TableHeader>
            <TableRow>
              <TableHead className={t.head}>Entry No</TableHead>
              <TableHead className={t.head}>Date</TableHead>
              <TableHead className={t.head}>Memo</TableHead>
              <TableHead className={t.head}>Source</TableHead>
              <TableHead className={cn(t.head, 'text-right')}>Debit</TableHead>
              <TableHead className={cn(t.head, 'text-right')}>Credit</TableHead>
              <TableHead className={t.head}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingJournals ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <ErpEmptyState message="Loading journals…" />
                </TableCell>
              </TableRow>
            ) : filteredJournals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <ErpEmptyState message="No journal entries found." />
                </TableCell>
              </TableRow>
            ) : (
              filteredJournals.map((j) => (
                <TableRow
                  key={j._id || j.entry_no}
                  data-clickable="true"
                  className={cn(t.row, t.rowAlt)}
                  role="button"
                  tabIndex={0}
                  onClick={() => openJournal(j)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openJournal(j);
                    }
                  }}
                >
                  <TableCell className={cn(t.cell, 'font-mono text-primary')}>{j.entry_no}</TableCell>
                  <TableCell className={t.cell}>{fmtDate(j.entry_date)}</TableCell>
                  <TableCell className={cn(t.cell, 'max-w-[220px] truncate')}>
                    {j.memo || '—'}
                  </TableCell>
                  <TableCell className={t.cell}>
                    <SourceBadge source={j.source} />
                  </TableCell>
                  <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                    {money(j.total_debit)}
                  </TableCell>
                  <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                    {money(j.total_credit)}
                  </TableCell>
                  <TableCell className={t.cell}>
                    <JournalStatusBadge status={j.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ErpGrid>

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
    </div>
  );
}
