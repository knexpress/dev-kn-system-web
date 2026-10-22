'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  ErpEmptyState,
  ErpGrid,
  ErpStatStrip,
  ErpToolbar,
  erpPrimaryButtonClass,
  erpOutlineControlClass,
  erpTableClasses,
} from './erp-shell';
import { ledgerHref, money } from './erp-format';
import { cn } from '@/lib/utils';

export default function FinancialReportsTab() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-09-30');
  const [loading, setLoading] = useState(false);
  const [pnl, setPnl] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [trial, setTrial] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState('trial');

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pnlRes, balRes, trialRes] = await Promise.all([
        apiClient.getProfitAndLoss(fromDate, toDate),
        apiClient.getBalanceSheet(toDate),
        apiClient.getTrialBalance(fromDate, toDate),
      ]);
      if (pnlRes.success) setPnl(pnlRes.data);
      if (balRes.success) setBalance(balRes.data);
      if (trialRes.success) setTrial(trialRes.data);
      if (!pnlRes.success || !balRes.success || !trialRes.success) {
        setError('Some reports failed to load. Check backend / login session.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate reports');
    } finally {
      setLoading(false);
    }
  };

  const openLedger = (
    row: { code?: string; name?: string; type?: string; subtype?: string },
    context: string
  ) => {
    if (!row?.code) return;
    router.push(ledgerHref(row.code, context));
  };

  const t = erpTableClasses();
  const clickRow = cn(t.row, t.rowAlt);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ErpToolbar
        title="Financial Reports"
        filters={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="from-date" className="text-[11px] text-slate-400">
                From
              </Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={cn(erpOutlineControlClass(), 'w-[150px]')}
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="to-date" className="text-[11px] text-slate-400">
                To
              </Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={cn(erpOutlineControlClass(), 'w-[150px]')}
              />
            </div>
          </div>
        }
        actions={
          <Button className={erpPrimaryButtonClass()} onClick={generate} disabled={loading}>
            <FileBarChart2 className="mr-1.5 h-4 w-4" />
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        }
      />

      <ErpStatStrip
        items={[
          {
            label: 'Period',
            value: `${fromDate.slice(5)} → ${toDate.slice(5)}`,
          },
          {
            label: 'TB Debit',
            value: trial ? money(trial.total_debit) : '—',
          },
          {
            label: 'TB Credit',
            value: trial ? money(trial.total_credit) : '—',
          },
          {
            label: 'Net P&L',
            value: pnl ? money(pnl.net_profit) : '—',
          },
          {
            label: 'Total Assets',
            value: balance ? money(balance.total_assets) : '—',
          },
        ]}
      />

      {error && <p className="px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="px-5 pt-1 sm:px-6">
        <Tabs value={reportTab} onValueChange={setReportTab}>
          <TabsList className="h-11 rounded-2xl bg-slate-100/80 p-1">
            <TabsTrigger
              value="trial"
              className="rounded-xl px-4 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Trial Balance
            </TabsTrigger>
            <TabsTrigger
              value="pnl"
              className="rounded-xl px-4 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Profit &amp; Loss
            </TabsTrigger>
            <TabsTrigger
              value="balance"
              className="rounded-xl px-4 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Balance Sheet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trial" className="mt-2 focus-visible:outline-none">
            {!trial ? (
              <ErpEmptyState message="Generate reports to load Trial Balance." />
            ) : (
              <ErpGrid maxHeight="min(52vh, 520px)">
                <Table className={t.table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={t.head}>Code</TableHead>
                      <TableHead className={t.head}>Account</TableHead>
                      <TableHead className={cn(t.head, 'text-right')}>Debit</TableHead>
                      <TableHead className={cn(t.head, 'text-right')}>Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(trial.rows || []).map((r: any) => (
                      <TableRow
                        key={r.code}
                        data-clickable="true"
                        className={clickRow}
                        role="button"
                        tabIndex={0}
                        onClick={() => openLedger(r, 'Trial Balance')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openLedger(r, 'Trial Balance');
                          }
                        }}
                      >
                        <TableCell className={cn(t.cell, 'font-mono text-primary')}>
                          {r.code}
                        </TableCell>
                        <TableCell className={t.cell}>{r.name}</TableCell>
                        <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                          {money(r.debit)}
                        </TableCell>
                        <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                          {money(r.credit)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell className={t.cell} colSpan={2}>
                        Totals
                      </TableCell>
                      <TableCell className={cn(t.cell, 'text-right font-mono')}>
                        {money(trial.total_debit)}
                      </TableCell>
                      <TableCell className={cn(t.cell, 'text-right font-mono')}>
                        {money(trial.total_credit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ErpGrid>
            )}
          </TabsContent>

          <TabsContent value="pnl" className="mt-2 space-y-3 focus-visible:outline-none">
            {!pnl ? (
              <ErpEmptyState message="Generate reports to load P&L." />
            ) : (
              <>
                <ErpGrid maxHeight="min(28vh, 280px)">
                  <Table className={t.table}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={t.head}>Revenue</TableHead>
                        <TableHead className={cn(t.head, 'text-right')}>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pnl.revenue || []).map((r: any) => (
                        <TableRow
                          key={r.code}
                          data-clickable="true"
                          className={clickRow}
                          role="button"
                          tabIndex={0}
                          onClick={() => openLedger({ ...r, type: 'Revenue' }, 'Profit & Loss')}
                        >
                          <TableCell className={cn(t.cell, 'text-primary')}>
                            {r.code} — {r.name}
                          </TableCell>
                          <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                            {money(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell className={t.cell}>Total Revenue</TableCell>
                        <TableCell className={cn(t.cell, 'text-right font-mono')}>
                          {money(pnl.total_revenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ErpGrid>
                <ErpGrid maxHeight="min(28vh, 280px)">
                  <Table className={t.table}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={t.head}>Expenses</TableHead>
                        <TableHead className={cn(t.head, 'text-right')}>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pnl.expenses || []).map((r: any) => (
                        <TableRow
                          key={r.code}
                          data-clickable="true"
                          className={clickRow}
                          role="button"
                          tabIndex={0}
                          onClick={() => openLedger({ ...r, type: 'Expense' }, 'Profit & Loss')}
                        >
                          <TableCell className={cn(t.cell, 'text-primary')}>
                            {r.code} — {r.name}
                          </TableCell>
                          <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                            {money(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell className={t.cell}>Total Expenses</TableCell>
                        <TableCell className={cn(t.cell, 'text-right font-mono')}>
                          {money(pnl.total_expenses)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ErpGrid>
              </>
            )}
          </TabsContent>

          <TabsContent value="balance" className="mt-2 space-y-3 focus-visible:outline-none">
            {!balance ? (
              <ErpEmptyState message="Generate reports to load Balance Sheet." />
            ) : (
              (['assets', 'liabilities', 'equity'] as const).map((section) => (
                <ErpGrid key={section} maxHeight="min(22vh, 220px)">
                  <Table className={t.table}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={cn(t.head, 'capitalize')}>{section}</TableHead>
                        <TableHead className={cn(t.head, 'text-right')}>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(balance[section] || []).map((r: any) => (
                        <TableRow
                          key={`${section}-${r.code}`}
                          data-clickable="true"
                          className={clickRow}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            openLedger(
                              {
                                ...r,
                                type:
                                  section === 'assets'
                                    ? 'Asset'
                                    : section === 'liabilities'
                                      ? 'Liability'
                                      : 'Equity',
                              },
                              'Balance Sheet'
                            )
                          }
                        >
                          <TableCell className={cn(t.cell, 'text-primary')}>
                            {r.code} — {r.name}
                          </TableCell>
                          <TableCell className={cn(t.cell, 'text-right font-mono tabular-nums')}>
                            {money(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell className={t.cell}>Total</TableCell>
                        <TableCell className={cn(t.cell, 'text-right font-mono')}>
                          {money(
                            section === 'assets'
                              ? balance.total_assets
                              : section === 'liabilities'
                                ? balance.total_liabilities
                                : balance.total_equity
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ErpGrid>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
