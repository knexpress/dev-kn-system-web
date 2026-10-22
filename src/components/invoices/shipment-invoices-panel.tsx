'use client';

import InvoicesTable from "@/components/invoices-table";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { InvoiceNoteDialog } from "@/components/invoice-notes/invoice-note-dialog";
import { CancellationInvoiceDialog } from "@/components/cancellation-invoice-dialog";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from '@/contexts/NotificationContext';
import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePlus2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureLog } from '@/lib/secure-logger';
import {
  ErpToolbar,
  erpOutlineControlClass,
  erpPrimaryButtonClass,
} from "@/components/dashboard/maglo-shell";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 50;

/** Shipment (booking) invoices: list, filters, payments, notes, remit/cancel and cancellation invoices. */
export default function ShipmentInvoicesPanel() {
  const { department } = useAuth();
  const { clearCount } = useNotifications();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [noteInvoice, setNoteInvoice] = useState<any | null>(null);
  const [showCancellationInvoice, setShowCancellationInvoice] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterStatus, filterDateFrom, filterDateTo]);

  const refresh = useCallback(async () => {
    const updatedResult = await apiClient.getInvoicesUnified({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearchQuery || undefined,
      useCache: false,
    });
    if (updatedResult.success && updatedResult.data) {
      setInvoices(Array.isArray(updatedResult.data) ? updatedResult.data : []);
      setPagination((updatedResult as any).pagination || null);
    }
  }, [currentPage, debouncedSearchQuery]);

  useEffect(() => {
    clearCount('invoices');

    const loadInvoiceData = async () => {
      setLoading(true);
      try {
        const result = await apiClient.getInvoicesUnified({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearchQuery || undefined,
          useCache: currentPage === 1 && !debouncedSearchQuery,
        });

        if (result && result.success && result.data) {
          const invoiceData = result.data as any;
          setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
          setPagination((result as any).pagination || null);
        } else {
          secureLog.error('Error loading invoices', result?.error || 'Unknown error');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result?.error || 'Failed to load invoices',
          });
          setInvoices([]);
          setPagination(null);
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load invoices: ' + (error instanceof Error ? error.message : 'Unknown error'),
        });
        setInvoices([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceData();
  }, [currentPage, debouncedSearchQuery, clearCount]);

  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    if (filterStatus !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === filterStatus);
    }

    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((invoice) => {
        if (!invoice.issue_date) return false;
        const issueDate = new Date(invoice.issue_date);
        issueDate.setHours(0, 0, 0, 0);
        return issueDate >= fromDate;
      });
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((invoice) => {
        if (!invoice.issue_date) return false;
        const issueDate = new Date(invoice.issue_date);
        issueDate.setHours(0, 0, 0, 0);
        return issueDate <= toDate;
      });
    }

    return filtered;
  }, [invoices, filterStatus, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleRemitInvoice = async (invoiceId: string) => {
    try {
      const invoice = invoices.find((inv) => inv._id === invoiceId);
      const currentStatus = invoice?.status;

      const result = currentStatus === 'UNPAID'
        ? await apiClient.updateInvoiceUnified(invoiceId, { status: 'COLLECTED_BY_DRIVER' })
        : await apiClient.remitInvoiceUnified(invoiceId);

      if (result.success) {
        const gl = (result as any).gl;
        const receiptJe: string | undefined = (gl?.receipts ?? gl)?.posted?.[0];
        toast({
          title: 'Success',
          description: `${currentStatus === 'UNPAID'
            ? 'Invoice marked as collected successfully'
            : 'Invoice marked as remitted successfully'}${receiptJe ? ` · Finance JE ${receiptJe} posted` : ''}`,
        });
        await refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update invoice',
        });
      }
    } catch (error) {
      secureLog.error('Error updating invoice', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update invoice' });
    }
  };

  const handlePaymentUpdated = (updated: any) => {
    if (!updated?._id) return;
    apiClient.invalidateCache('/invoices-unified');
    setInvoices((prev) => prev.map((inv) => (inv._id === updated._id ? { ...inv, ...updated } : inv)));
    setPaymentInvoice((current: any) => (current?._id === updated._id ? { ...current, ...updated } : current));
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      if (!invoiceId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invoice ID not found. Please ensure the invoice exists.',
        });
        return;
      }

      if (!confirm('Are you sure you want to cancel this invoice? This will cancel the invoice, invoice request, booking, delivery assignments, and empost (if applicable).')) {
        return;
      }

      const result = await apiClient.cancelInvoiceUnified(invoiceId);

      if (result.success) {
        toast({ title: 'Success', description: 'Invoice and related entities cancelled successfully' });
        apiClient.invalidateCache('/invoice-requests');
        apiClient.invalidateCache('/invoices-unified');
        await refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to cancel invoice',
        });
      }
    } catch (error: any) {
      secureLog.error('Error cancelling invoice', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to cancel invoice',
      });
    }
  };

  const totalInvoices = pagination?.total || 0;
  const totalPages = pagination?.pages || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalInvoices);
  const hasActiveFilters = !!(searchQuery || filterStatus !== 'all' || filterDateFrom || filterDateTo);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90">
      <ErpToolbar
        title="Shipment invoices"
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Invoice ID, AWB, Batch, Receiver..."
        filters={
          <>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className={cn(erpOutlineControlClass(), 'w-[160px]')}>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="COLLECTED_BY_DRIVER">Collected by Driver</SelectItem>
                <SelectItem value="REMITTED">Remitted</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className={cn(erpOutlineControlClass(), 'w-[140px]')}
              aria-label="Date from"
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className={cn(erpOutlineControlClass(), 'w-[140px]')}
              aria-label="Date to"
            />
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className={erpOutlineControlClass()}>
                <X className="mr-1.5 h-4 w-4" />
                Clear
              </Button>
            )}
          </>
        }
        actions={
          <Button
            type="button"
            className={erpPrimaryButtonClass()}
            onClick={() => setShowCancellationInvoice(true)}
          >
            <FilePlus2 className="mr-1.5 h-4 w-4" />
            Cancellation invoice
          </Button>
        }
      />

      {loading && invoices.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <p className="text-sm text-slate-500">Loading invoices...</p>
        </div>
      ) : (
        <InvoicesTable
          invoices={filteredInvoices}
          department={department?.name as any}
          onRemit={handleRemitInvoice}
          onCancel={handleCancelInvoice}
          onRecordPayment={setPaymentInvoice}
          onRaiseNote={setNoteInvoice}
        />
      )}

      <RecordPaymentDialog
        invoice={paymentInvoice}
        open={Boolean(paymentInvoice)}
        onOpenChange={(open) => !open && setPaymentInvoice(null)}
        onUpdated={handlePaymentUpdated}
      />

      <InvoiceNoteDialog
        invoice={noteInvoice}
        open={Boolean(noteInvoice)}
        onOpenChange={(open) => !open && setNoteInvoice(null)}
      />

      <CancellationInvoiceDialog
        open={showCancellationInvoice}
        onOpenChange={setShowCancellationInvoice}
        onCreated={refresh}
      />

      {!loading && pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <div className="text-sm text-slate-500">
            Showing {startIndex} to {endIndex} of {totalInvoices} invoices
            {debouncedSearchQuery && ` (matching "${debouncedSearchQuery}")`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={erpOutlineControlClass()}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <div className="text-sm text-slate-700">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={erpOutlineControlClass()}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
