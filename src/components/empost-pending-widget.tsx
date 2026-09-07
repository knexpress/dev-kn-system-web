'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Package, FileText, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { secureLog } from '@/lib/secure-logger';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            EmPost Pending Queue
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Superadmin only — items that failed or still need EmPost push (ops continues without blocking).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pending shipment creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.shipment_creation}</div>
          </CardContent>
        </Card>
        <Card className="border-sky-200/60 bg-sky-50/40 dark:bg-sky-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pending invoice issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.invoice}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending EmPost items.</p>
          ) : (
            items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={item.type === 'shipment_creation' ? 'secondary' : 'outline'}
                    >
                      {typeLabel(item.type)}
                    </Badge>
                    <span className="font-mono text-sm font-semibold">
                      {item.tracking_code || '—'}
                    </span>
                    {item.invoice_number && (
                      <span className="text-xs text-muted-foreground">
                        {item.invoice_number}
                      </span>
                    )}
                    {item.knex_status && (
                      <Badge variant="outline" className="text-xs">
                        {item.knex_status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {(item.sender || '?') + ' → ' + (item.receiver || '?')}
                  </p>
                  {item.last_error && (
                    <p className="text-xs text-amber-800 dark:text-amber-200 break-words">
                      {item.last_error}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0"
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
        </CardContent>
      </Card>
    </div>
  );
}
