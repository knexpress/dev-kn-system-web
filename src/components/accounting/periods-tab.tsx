'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import {
  ErpEmptyState,
  ErpModuleBody,
  ErpToolbar,
  erpPrimaryButtonClass,
  erpTableClasses,
} from './erp-shell';
import { fmtDateTime } from './erp-format';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function PeriodsTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const canLock =
    userProfile?.role === 'ADMIN' ||
    userProfile?.role === 'SUPERADMIN' ||
    userProfile?.department?.name === 'Finance';

  const [loading, setLoading] = useState(true);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getAccountingPeriods(18, 6);
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Failed to load periods',
          description: res.error || 'Could not load accounting periods',
        });
        return;
      }
      setPeriods(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (periodKey: string, status: 'OPEN' | 'LOCKED') => {
    if (!canLock) {
      toast({
        variant: 'destructive',
        title: 'Not allowed',
        description: 'Only Finance or admins can lock or unlock periods.',
      });
      return;
    }
    setActingKey(periodKey);
    try {
      const res = await apiClient.setAccountingPeriodStatus(periodKey, status);
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: res.error || 'Could not update period',
        });
        return;
      }
      toast({
        title: status === 'LOCKED' ? 'Period locked' : 'Period unlocked',
        description:
          status === 'LOCKED'
            ? `${periodKey} is locked. Edits will post as adjustments in the next open month.`
            : `${periodKey} is open for posting and in-place edits.`,
      });
      await load();
    } finally {
      setActingKey(null);
    }
  };

  return (
    <ErpModuleBody>
      <ErpToolbar
        title="Accounting periods"
        description="Lock a month when books are final. Edits to locked-period journals create an ADJUSTMENT entry in the next open month instead of changing that month’s figures."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        }
      />

      {loading && !periods.length ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading periods…
        </div>
      ) : !periods.length ? (
        <ErpEmptyState message="No periods to show." />
      ) : (
        <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-100 bg-white">
          <Table className={erpTableClasses().table}>
            <TableHeader>
              <TableRow>
                <TableHead className={erpTableClasses().head}>Period</TableHead>
                <TableHead className={erpTableClasses().head}>Status</TableHead>
                <TableHead className={erpTableClasses().head}>Locked / unlocked</TableHead>
                <TableHead className={cn(erpTableClasses().head, 'text-right')}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => {
                const locked = p.status === 'LOCKED';
                const monthLabel = MONTH_NAMES[(p.month || 1) - 1] || p.period_key;
                const busy = actingKey === p.period_key;
                const t = erpTableClasses();
                return (
                  <TableRow key={p.period_key} className={t.row}>
                    <TableCell className={t.cell}>
                      <div className="font-semibold text-slate-900">
                        {monthLabel} {p.year}
                      </div>
                      <div className="text-xs text-slate-400">{p.period_key}</div>
                    </TableCell>
                    <TableCell className={t.cell}>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
                          locked
                            ? 'bg-amber-50 text-amber-900 ring-amber-200'
                            : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                        )}
                      >
                        {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        {locked ? 'Locked' : 'Open'}
                      </span>
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-sm text-slate-600')}>
                      {locked ? (
                        <>
                          {fmtDateTime(p.locked_at)}
                          {p.locked_by_name ? (
                            <span className="block text-xs text-slate-400">by {p.locked_by_name}</span>
                          ) : null}
                        </>
                      ) : p.unlocked_at ? (
                        <>
                          {fmtDateTime(p.unlocked_at)}
                          {p.unlocked_by_name ? (
                            <span className="block text-xs text-slate-400">by {p.unlocked_by_name}</span>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className={cn(t.cell, 'text-right')}>
                      {locked ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canLock || busy}
                          onClick={() => setStatus(p.period_key, 'OPEN')}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Unlock'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className={erpPrimaryButtonClass()}
                          disabled={!canLock || busy}
                          onClick={() => setStatus(p.period_key, 'LOCKED')}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Lock month'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </ErpModuleBody>
  );
}
