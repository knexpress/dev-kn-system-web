'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileSpreadsheet, Link2, Loader2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { ErpEmptyState, erpOutlineControlClass, erpPrimaryButtonClass } from './erp-shell';
import { fmtDate, money } from './erp-format';
import { cn } from '@/lib/utils';

function aed(n: number | undefined) {
  return `AED ${money(n)}`;
}

function signed(n: number) {
  const v = Number(n) || 0;
  return `${v < 0 ? '−' : '+'}${money(Math.abs(v))}`;
}

export default function BankReconciliationPanel({ accounts }: { accounts: any[] }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const wallets = useMemo(
    () => (accounts || []).filter((a) => a.is_active !== false && a.account_type === 'BANK'),
    [accounts]
  );
  const [accountId, setAccountId] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [rec, setRec] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stmtPick, setStmtPick] = useState<number | null>(null);
  const [bookPick, setBookPick] = useState<string | null>(null);
  const [filter, setFilter] = useState<'UNMATCHED' | 'MATCHED' | 'ALL'>('UNMATCHED');

  const loadList = async () => {
    const result = await apiClient.getBankReconciliations(accountId || undefined);
    if (result.success) setSessions((result.data as any[]) || []);
  };

  useEffect(() => {
    void loadList();
  }, [accountId]);

  useEffect(() => {
    if (!accountId && wallets[0]?._id) setAccountId(wallets[0]._id);
  }, [wallets, accountId]);

  const upload = async (file: File) => {
    if (!accountId) {
      toast({ variant: 'destructive', title: 'Choose a bank account' });
      return;
    }
    setUploading(true);
    const result = await apiClient.uploadBankStatement(accountId, file);
    setUploading(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not read the statement', description: result.error });
      return;
    }
    setRec(result.data);
    setStmtPick(null);
    setBookPick(null);
    setFilter('UNMATCHED');
    toast({
      title: 'Statement analysed',
      description: `${result.data?.summary?.statement_count || 0} bank lines · ${result.data?.summary?.matched || 0} auto-matched`,
    });
    void loadList();
  };

  const openSession = async (id: string) => {
    const result = await apiClient.getBankReconciliation(id);
    if (!result.success) {
      toast({ variant: 'destructive', title: result.error || 'Could not open reconciliation' });
      return;
    }
    setRec(result.data);
    setStmtPick(null);
    setBookPick(null);
  };

  const apply = (next: any) => {
    setRec(next);
    void loadList();
  };

  const matchSelected = async () => {
    if (!rec || stmtPick == null || !bookPick) return;
    setBusy(true);
    const result = await apiClient.matchBankReconciliation(rec._id, stmtPick, bookPick);
    setBusy(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: result.error || 'Could not match' });
      return;
    }
    apply(result.data);
    setStmtPick(null);
    setBookPick(null);
  };

  const unmatch = async (lineNo: number) => {
    if (!rec) return;
    setBusy(true);
    const result = await apiClient.unmatchBankReconciliation(rec._id, lineNo);
    setBusy(false);
    if (result.success) apply(result.data);
  };

  const complete = async () => {
    if (!rec) return;
    setBusy(true);
    const result = await apiClient.completeBankReconciliation(rec._id);
    setBusy(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: result.error || 'Could not complete' });
      return;
    }
    apply(result.data);
    toast({ title: 'Reconciliation completed', description: rec.recon_no });
  };

  const summary = rec?.summary || {};
  const closed = rec?.status === 'COMPLETED';
  const stmtLines = (rec?.statement_lines || []).filter((l: any) => filter === 'ALL' || l.status === filter);
  const bookLines = (rec?.book_lines || []).filter((l: any) => filter === 'ALL' || l.status === filter);
  const map = rec?.column_map || {};

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] space-y-1">
            <Label>Bank account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className={cn(erpOutlineControlClass(), 'w-full')}>
                <SelectValue placeholder="Choose account" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name} · {a.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            className={erpPrimaryButtonClass()}
            disabled={uploading || !accountId}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Upload statement
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          CSV or Excel. The system detects the date range, debit/credit columns, and matches them to posted journals on
          this account.
        </p>
      </section>

      {!rec && sessions.length === 0 ? (
        <ErpEmptyState message="Upload a bank statement to open a reconciliation workspace." />
      ) : null}

      {!rec && sessions.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">Recon</th>
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Matched</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s._id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-brand-50/50"
                  onClick={() => void openSession(s._id)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-600">{s.recon_no}</td>
                  <td className="px-4 py-3">{s.bank_cash_account_name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {fmtDate(s.period_start)} – {fmtDate(s.period_end)}
                  </td>
                  <td className="px-4 py-3">
                    {s.summary?.matched || 0}/{s.summary?.statement_count || 0}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {rec ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4">
            <div>
              <p className="font-mono text-sm font-semibold text-slate-900">
                {rec.recon_no} · {rec.bank_cash_account_name}
              </p>
              <p className="text-xs text-slate-500">
                {rec.file_name} · {fmtDate(rec.period_start)} to {fmtDate(rec.period_end)} · sheet {rec.sheet_name}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Columns: {['date', 'description', 'money_out', 'money_in', 'amount', 'balance']
                  .filter((k) => map[k])
                  .map((k) => `${k.replace('_', ' ')} → ${map[k]}`)
                  .join(' · ') || 'auto-detected'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => setRec(null)}>
                All sessions
              </Button>
              {!closed ? (
                <Button type="button" className={erpPrimaryButtonClass()} disabled={busy} onClick={() => void complete()}>
                  <Check className="h-4 w-4" />
                  Complete recon
                </Button>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Completed
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Bank lines', value: summary.statement_count || 0 },
              { label: 'Book lines', value: summary.book_count || 0 },
              { label: 'Matched', value: summary.matched || 0 },
              { label: 'Unmatched bank', value: summary.unmatched_statement || 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <p className="text-[11px] text-slate-400">{item.label}</p>
                <p className="text-lg font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['UNMATCHED', 'MATCHED', 'ALL'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold',
                  filter === f ? 'bg-brand-500 text-white' : 'bg-canvas text-slate-500 ring-1 ring-slate-200/70'
                )}
              >
                {f === 'UNMATCHED' ? 'To match' : f === 'MATCHED' ? 'Matched' : 'All'}
              </button>
            ))}
            {!closed && (
              <Button
                type="button"
                size="sm"
                className="ml-auto h-9 rounded-xl"
                disabled={busy || stmtPick == null || !bookPick}
                onClick={() => void matchSelected()}
              >
                <Link2 className="mr-1 h-4 w-4" />
                Match selected
              </Button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-sky-50/70 px-4 py-2 text-sm font-semibold text-sky-900">
                <Scale className="h-4 w-4" />
                Bank statement
              </div>
              <div className="max-h-[480px] overflow-auto">
                {stmtLines.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No lines in this view.</p>
                ) : (
                  stmtLines.map((l: any) => (
                    <button
                      key={l.line_no}
                      type="button"
                      disabled={closed || l.status === 'MATCHED'}
                      onClick={() => setStmtPick(l.line_no)}
                      className={cn(
                        'flex w-full items-start justify-between gap-3 border-b border-slate-50 px-4 py-2.5 text-left text-sm',
                        stmtPick === l.line_no && 'bg-brand-50',
                        l.status === 'MATCHED' && 'bg-emerald-50/50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{l.description || '—'}</p>
                        <p className="text-[11px] text-slate-400">
                          {fmtDate(l.date)}
                          {l.reference ? ` · ${l.reference}` : ''}
                          {l.status === 'MATCHED' ? ' · matched' : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn('font-semibold tabular-nums', l.amount < 0 ? 'text-rose-700' : 'text-emerald-700')}>
                          {signed(l.amount)}
                        </p>
                        {l.status === 'MATCHED' && !closed && (
                          <span
                            role="button"
                            className="text-[11px] text-slate-500 hover:text-rose-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              void unmatch(l.line_no);
                            }}
                          >
                            Unmatch
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-violet-50/70 px-4 py-2 text-sm font-semibold text-violet-900">
                <Link2 className="h-4 w-4" />
                System (books)
              </div>
              <div className="max-h-[480px] overflow-auto">
                {bookLines.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No posted bank journals in this period.</p>
                ) : (
                  bookLines.map((l: any) => (
                    <button
                      key={l.book_id}
                      type="button"
                      disabled={closed || l.status === 'MATCHED'}
                      onClick={() => setBookPick(l.book_id)}
                      className={cn(
                        'flex w-full items-start justify-between gap-3 border-b border-slate-50 px-4 py-2.5 text-left text-sm',
                        bookPick === l.book_id && 'bg-brand-50',
                        l.status === 'MATCHED' && 'bg-emerald-50/50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{l.description || l.journal_no}</p>
                        <p className="text-[11px] text-slate-400">
                          {fmtDate(l.date)} · {l.journal_no}
                          {l.source_reference ? ` · ${l.source_reference}` : ''}
                        </p>
                      </div>
                      <p className={cn('shrink-0 font-semibold tabular-nums', l.amount < 0 ? 'text-rose-700' : 'text-emerald-700')}>
                        {signed(l.amount)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Statement in {aed(summary.statement_in)} · out {aed(summary.statement_out)} · books close {aed(rec.book_closing)}
            {rec.statement_closing != null ? ` · statement close ${aed(rec.statement_closing)}` : ''}.
            Select one line from each side, then Match. Auto-matched rows are already in Matched.
          </p>
        </div>
      ) : null}
    </div>
  );
}
