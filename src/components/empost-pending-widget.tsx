'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Package, FileText, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { secureLog } from '@/lib/secure-logger';
import {
  MagloPanel,
  erpOutlineControlClass,
  erpPrimaryButtonClass,
} from '@/components/dashboard/maglo-shell';
import { cn } from '@/lib/utils';

type EmpostPendingType = 'shipment_creation' | 'invoice';

interface EmpostPendingItem {
  id: string;
  type: EmpostPendingType;
  source: string;
  tracking_code: string | null;
  invoice_number: string | null;
  knex_status: string | null;
  empost_uhawb: string | null;
  sender: string | null;
  receiver: string | null;
  last_error: string | null;
  last_attempt_at: string | null;
  updatedAt: string | null;
}

interface EmpostPendingSummary {
  shipment_creation: number;
  invoice: number;
  total: number;
}

export default function EmpostPendingWidget() {
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EmpostPendingSummary>({
    shipment_creation: 0,
    invoice: 0,
    total: 0,
  });
  const [items, setItems] = useState<EmpostPendingItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getEmpostPending(100);
      if (!res.success) {
        setError(res.error || 'Failed to load EmPost pending items');
        setItems([]);
        return;
      }
      const data = (res as any).data || {};
      setSummary(
        data.summary || { shipment_creation: 0, invoice: 0, total: 0 },
      );
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      secureLog.error('EmPost pending widget load failed', e);
      setError(e?.message || 'Failed to load EmPost pending items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRetry = async (item: EmpostPendingItem) => {
    setRetryingId(item.id);
    try {
      const res = await apiClient.retryEmpostPending(item.id, item.type);
      if (!res.success) {
        setError(res.error || 'Retry failed');
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const typeLabel = (type: EmpostPendingType) =>
    type === 'shipment_creation' ? 'Shipment creation' : 'Invoice issue';

  return (
    <MagloPanel padded className="min-h-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Operations
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            EmPost Pending Queue
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Superadmin only — items that failed or still need EmPost push (ops continues without blocking).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={erpOutlineControlClass()}
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-amber-50/80 to-white p-3.5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] ring-1 ring-amber-100/70">
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-400">
            <Package className="h-3.5 w-3.5" />
            Pending shipment creation
          </p>
          <p className="mt-1.5 font-semibold tabular-nums tracking-tight text-slate-900 text-[15px] sm:text-base">
            {summary.shipment_creation}
          </p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-sky-50/80 to-white p-3.5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] ring-1 ring-sky-100/80">
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-400">
            <FileText className="h-3.5 w-3.5" />
            Pending invoice issue
          </p>
          <p className="mt-1.5 font-semibold tabular-nums tracking-tight text-slate-900 text-[15px] sm:text-base">
            {summary.invoice}
          </p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-white to-slate-50/80 p-3.5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]">
          <p className="text-[11px] font-medium tracking-wide text-slate-400">Total pending</p>
          <p className="mt-1.5 font-semibold tabular-nums tracking-tight text-slate-900 text-[15px] sm:text-base">
            {summary.total}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
        <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Pending items
        </p>
        <div className="space-y-3">
          {loading && items.length === 0 ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No pending EmPost items.</p>
          ) : (
            items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/60 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={item.type === 'shipment_creation' ? 'secondary' : 'outline'}
                      className="rounded-lg"
                    >
                      {typeLabel(item.type)}
                    </Badge>
                    <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {item.tracking_code || '—'}
                    </span>
                    {item.invoice_number && (
                      <span className="text-xs text-slate-400">{item.invoice_number}</span>
                    )}
                    {item.knex_status && (
                      <Badge variant="outline" className="rounded-lg text-xs">
                        {item.knex_status}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {(item.sender || '?') + ' → ' + (item.receiver || '?')}
                  </p>
                  {item.last_error && (
                    <p className="break-words text-xs text-amber-700">{item.last_error}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  className={cn(erpPrimaryButtonClass(), 'h-9 shrink-0')}
                  disabled={retryingId === item.id}
                  onClick={() => onRetry(item)}
                >
                  {retryingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Retry EmPost'
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </MagloPanel>
  );
}
