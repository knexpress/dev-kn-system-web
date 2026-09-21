'use client';

import InvoicesTable from "@/components/invoices-table";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from '@/contexts/NotificationContext';
import { useState, useEffect, useMemo } from "react";
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureLog } from '@/lib/secure-logger';
import { Loader2 } from "lucide-react";
import {
  DashboardPageShell,
  ErpToolbar,
  erpOutlineControlClass,
} from "@/components/dashboard/maglo-shell";
import { cn } from "@/lib/utils";

export default function InvoicesPage() {
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
    const itemsPerPage = 50;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, filterStatus, filterDateFrom, filterDateTo]);

    useEffect(() => {
        clearCount('invoices');
        
        const loadInvoiceData = async () => {
            setLoading(true);
            try {
                secureLog.debug('Loading invoices from API', {
                    page: currentPage,
                    limit: itemsPerPage,
                    search: debouncedSearchQuery || undefined
                });

                const result = await apiClient.getInvoicesUnified({
                    page: currentPage,
                    limit: itemsPerPage,
                    search: debouncedSearchQuery || undefined,
                    useCache: currentPage === 1 && !debouncedSearchQuery
                });
                
                secureLog.debug('Invoices API result', { success: result?.success });

                if (result && result.success && result.data) {
                    const invoiceData = result.data as any;
                    const paginationData = (result as any).pagination;
                    secureLog.debug('Invoices loaded', { count: Array.isArray(invoiceData) ? invoiceData.length : 0, pagination: paginationData });

                    setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
                    setPagination(paginationData || null);
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
                console.error('❌ Error loading invoice data:', error);
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
            filtered = filtered.filter((invoice) => {
                return invoice.status === filterStatus;
            });
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
            const invoice = invoices.find(inv => inv._id === invoiceId);
            const currentStatus = invoice?.status;
            
            const result = currentStatus === 'UNPAID'
                ? await apiClient.updateInvoiceUnified(invoiceId, { status: 'COLLECTED_BY_DRIVER' })
                : await apiClient.remitInvoiceUnified(invoiceId);
            
            if (result.success) {
                toast({
                    title: 'Success',
                    description: currentStatus === 'UNPAID' 
                        ? 'Invoice marked as collected successfully'
                        : 'Invoice marked as remitted successfully',
                });
                const updatedResult = await apiClient.getInvoicesUnified({
                    page: currentPage,
                    limit: itemsPerPage,
                    search: debouncedSearchQuery || undefined,
                    useCache: false
                });
                if (updatedResult.success && updatedResult.data) {
                    setInvoices(Array.isArray(updatedResult.data) ? updatedResult.data : []);
                    const paginationData = (updatedResult as any).pagination;
                    setPagination(paginationData || null);
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to update invoice'
                });
            }
        } catch (error) {
            secureLog.error('Error updating invoice', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update invoice'
            });
        }
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
                toast({
                    title: 'Success',
                    description: 'Invoice and related entities cancelled successfully',
                });
                apiClient.invalidateCache('/invoice-requests');
                apiClient.invalidateCache('/invoices-unified');
                const updatedResult = await apiClient.getInvoicesUnified({
                    page: currentPage,
                    limit: itemsPerPage,
                    search: debouncedSearchQuery || undefined,
                    useCache: false
                });
                if (updatedResult.success && updatedResult.data) {
                    setInvoices(Array.isArray(updatedResult.data) ? updatedResult.data : []);
                    const paginationData = (updatedResult as any).pagination;
                    setPagination(paginationData || null);
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to cancel invoice'
                });
            }
        } catch (error: any) {
            secureLog.error('Error cancelling invoice', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to cancel invoice'
            });
        }
    };

    const totalInvoices = pagination?.total || 0;
    const totalPages = pagination?.pages || 1;
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalInvoices);
    const hasActiveFilters = !!(searchQuery || filterStatus !== 'all' || filterDateFrom || filterDateTo);

    if (loading && invoices.length === 0) {
        return (
            <DashboardPageShell title="Invoices">
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    <p className="text-sm text-slate-500">Loading invoices...</p>
                </div>
            </DashboardPageShell>
        );
    }

    return (
        <DashboardPageShell title="Invoices">
            <div className="flex h-full min-h-0 flex-col">
                <ErpToolbar
                    title="All invoices"
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className={erpOutlineControlClass()}
                                >
                                    <X className="mr-1.5 h-4 w-4" />
                                    Clear
                                </Button>
                            )}
                        </>
                    }
                />

                <InvoicesTable 
                    invoices={filteredInvoices}
                    department={department?.name as any}
                    onRemit={handleRemitInvoice}
                    onCancel={handleCancelInvoice}
                />

                {!loading && pagination && pagination.pages > 1 && (
                    <div className="sticky bottom-0 z-10 mx-5 mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur sm:mx-6">
                        <div className="text-sm text-slate-500">
                            Showing {startIndex} to {endIndex} of {totalInvoices} invoices
                            {debouncedSearchQuery && ` (matching "${debouncedSearchQuery}")`}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className={erpOutlineControlClass()}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage >= totalPages || loading}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardPageShell>
    );
}
