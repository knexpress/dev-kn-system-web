'use client';

import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import AddAccountDialog from './add-account-dialog';
import {
  AccountTypeBadge,
  ErpEmptyState,
  ErpGrid,
  ErpStatStrip,
  ErpToolbar,
  erpPrimaryButtonClass,
  erpOutlineControlClass,
  erpTableClasses,
} from './erp-shell';
import { ledgerHref } from './erp-format';
import { cn } from '@/lib/utils';

export default function ChartOfAccountsTab() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getAccounts();
      if (result.success && Array.isArray(result.data)) {
        setAccounts(result.data);
      } else {
        setAccounts([]);
        setError(result.error || 'Failed to load accounts');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (!q) return true;
      return (
        String(a.code || '').toLowerCase().includes(q) ||
        String(a.name || '').toLowerCase().includes(q) ||
        String(a.subtype || '').toLowerCase().includes(q)
      );
    });
  }, [accounts, search, typeFilter]);

  const stats = useMemo(() => {
    const active = accounts.filter((a) => a.is_active !== false).length;
    const postable = accounts.filter((a) => a.is_postable !== false).length;
    return [
      { label: 'Accounts', value: accounts.length },
      { label: 'Active', value: active },
      { label: 'Postable', value: postable },
      { label: 'Showing', value: filtered.length },
      { label: 'Types', value: new Set(accounts.map((a) => a.type)).size },
    ];
  }, [accounts, filtered.length]);

  const t = erpTableClasses();

  const openAccount = (account: any) => {
    router.push(ledgerHref(account.code, 'coa'));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ErpToolbar
        title="Chart of Accounts"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Code or name…"
        onRefresh={load}
        refreshing={loading}
        filters={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={cn(erpOutlineControlClass(), 'w-[130px]')}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((ty) => (
                <SelectItem key={ty} value={ty}>
                  {ty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button className={erpPrimaryButtonClass()} onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Account
          </Button>
        }
      />
      <ErpStatStrip items={stats} />
      {error && <p className="px-5 py-2 text-sm text-destructive sm:px-6">{error}</p>}
      <ErpGrid>
        <Table className={t.table}>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(t.head, 'w-[88px]')}>Code</TableHead>
              <TableHead className={t.head}>Account Name</TableHead>
              <TableHead className={t.head}>Type</TableHead>
              <TableHead className={t.head}>Subtype</TableHead>
              <TableHead className={t.head}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <ErpEmptyState message="Loading accounts…" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <ErpEmptyState message="No accounts match your filters." />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((account) => (
                <TableRow
                  key={account._id || account.code}
                  data-clickable="true"
                  className={cn(t.row, t.rowAlt)}
                  onClick={() => openAccount(account)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openAccount(account);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <TableCell className={cn(t.cell, 'font-mono font-medium text-sky-600')}>
                    {account.code}
                  </TableCell>
                  <TableCell className={cn(t.cell, 'font-medium')}>{account.name}</TableCell>
                  <TableCell className={t.cell}>
                    <AccountTypeBadge type={account.type} />
                  </TableCell>
                  <TableCell className={cn(t.cell, 'text-slate-500')}>
                    {account.subtype || '—'}
                  </TableCell>
                  <TableCell className={t.cell}>
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      {account.is_active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ErpGrid>

      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
    </div>
  );
}
