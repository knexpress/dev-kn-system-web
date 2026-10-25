'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api-client';
import { DashboardPageShell } from '@/components/dashboard/maglo-shell';

const AuditReportTable = dynamic(() => import('@/components/audit-report-table'), {
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-slate-500">
      Loading audit table...
    </div>
  ),
  ssr: false,
});

const PAGE_SIZE = 25;

export default function AuditReportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (nextPage: number, query: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const result = await apiClient.searchAuditTransactions({
        q: query || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (controller.signal.aborted) return;
      const payload = result as any;
      const list = Array.isArray(payload?.data) ? payload.data : [];
      const pagination = payload?.pagination || {};
      setRows(list);
      setTotal(Number(pagination.total) || list.length);
      setPages(Number(pagination.pages) || 1);
    } catch {
      if (!controller.signal.aborted) {
        setRows([]);
        setTotal(0);
        setPages(1);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, debouncedSearch);
    return () => abortRef.current?.abort();
  }, [load, page, debouncedSearch]);

  return (
    <DashboardPageShell
      title="Audit Report"
      subtitle="Search every shipment in the system. Results load one page at a time."
    >
      <AuditReportTable
        data={rows}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        page={page}
        pages={pages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </DashboardPageShell>
  );
}
