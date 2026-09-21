'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { AccountPreview } from './accounts-data';

function money(n: number) {
  return Number(n || 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type FinancialReportsTabProps = {
  onAccountClick?: (account: AccountPreview) => void;
};

const rowClass =
  'cursor-pointer transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none';

export default function FinancialReportsTab({ onAccountClick }: FinancialReportsTabProps) {
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-09-30');
  const [loading, setLoading] = useState(false);
  const [pnl, setPnl] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [trial, setTrial] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  const openLedger = (row: { code?: string; name?: string; type?: string; subtype?: string }) => {
    if (!row?.code || !onAccountClick) return;
    onAccountClick({
      code: row.code,
      name: row.name || row.code,
      type: row.type || '',
      subtype: row.subtype || '',
      active: true,
    });
  };

  const clickableProps = (row: any) => ({
    role: 'button' as const,
    tabIndex: 0,
    className: rowClass,
    onClick: () => openLedger(row),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLedger(row);
      }
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
          <CardDescription>
            Generate reports from posted journals. Click any account line to open its ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-date">From</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button onClick={generate} disabled={loading}>
              <FileBarChart2 className="mr-2 h-4 w-4" />
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="trial">
        <TabsList>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="trial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trial Balance</CardTitle>
              <CardDescription>
                {trial
                  ? `Debits ${money(trial.total_debit)} | Credits ${money(trial.total_credit)} — click a row to open the account ledger`
                  : 'Generate to load Trial Balance.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!trial ? (
                <p className="text-sm text-muted-foreground">No report generated yet.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(trial.rows || []).map((r: any) => (
                        <TableRow key={r.code} {...clickableProps(r)}>
                          <TableCell className="font-mono text-primary">{r.code}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="text-right font-mono">{money(r.debit)}</TableCell>
                          <TableCell className="text-right font-mono">{money(r.credit)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-semibold">
                          Totals
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {money(trial.total_debit)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {money(trial.total_credit)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit &amp; Loss</CardTitle>
              <CardDescription>
                {pnl
                  ? `Net profit: ${money(pnl.net_profit)} AED — click a line to open its ledger`
                  : 'Generate to load P&L from posted journals.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!pnl ? (
                <p className="text-sm text-muted-foreground">No report generated yet.</p>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Revenue</TableHead>
                          <TableHead className="text-right">Amount (AED)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pnl.revenue || []).map((r: any) => (
                          <TableRow key={r.code} {...clickableProps({ ...r, type: 'Revenue' })}>
                            <TableCell className="text-primary">
                              {r.code} — {r.name}
                            </TableCell>
                            <TableCell className="text-right font-mono">{money(r.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-semibold">Total Revenue</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {money(pnl.total_revenue)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Expenses</TableHead>
                          <TableHead className="text-right">Amount (AED)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pnl.expenses || []).map((r: any) => (
                          <TableRow key={r.code} {...clickableProps({ ...r, type: 'Expense' })}>
                            <TableCell className="text-primary">
                              {r.code} — {r.name}
                            </TableCell>
                            <TableCell className="text-right font-mono">{money(r.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-semibold">Total Expenses</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {money(pnl.total_expenses)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>
                {balance
                  ? `Assets ${money(balance.total_assets)} | Liabilities ${money(balance.total_liabilities)} | Equity ${money(balance.total_equity)} — click a line to open its ledger`
                  : 'Generate to load Balance Sheet.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!balance ? (
                <p className="text-sm text-muted-foreground">No report generated yet.</p>
              ) : (
                (['assets', 'liabilities', 'equity'] as const).map((section) => (
                  <div key={section} className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="capitalize">{section}</TableHead>
                          <TableHead className="text-right">Amount (AED)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(balance[section] || []).map((r: any) => (
                          <TableRow
                            key={`${section}-${r.code}`}
                            {...clickableProps({
                              ...r,
                              type:
                                section === 'assets'
                                  ? 'Asset'
                                  : section === 'liabilities'
                                    ? 'Liability'
                                    : 'Equity',
                            })}
                          >
                            <TableCell className="text-primary">
                              {r.code} — {r.name}
                            </TableCell>
                            <TableCell className="text-right font-mono">{money(r.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
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
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
