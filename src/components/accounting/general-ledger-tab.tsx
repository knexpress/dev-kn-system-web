'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
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

  useEffect(() => {
    if (selectedAccountCode) setAccountCode(selectedAccountCode);
  }, [selectedAccountCode]);

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
    ];
  }, [journals, filteredJournals.length]);

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
          <Button className={erpPrimaryButtonClass()} onClick={() => setNewEntryOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Entry
          </Button>
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
