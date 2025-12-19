'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNotifications } from '@/contexts/NotificationContext';
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RequestsPage() {
    const { clearCount } = useNotifications();
    const [invoiceRequests, setInvoiceRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25; // Show 25 items per page for better performance
    const { toast } = useToast();

    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Debounce search query to avoid too many API calls while typing
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500); // Wait 500ms after user stops typing
        
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Use ref to store the latest fetch function to avoid dependency issues
    const fetchInvoiceRequestsRef = useRef<((page: number) => Promise<void>) | null>(null);

    const fetchInvoiceRequests = useCallback(async (page: number = currentPage, search: string = debouncedSearchQuery) => {
        try {
            setLoading(true);
            // Always fetch only the requested page with the limit (25 items per page)
            // Request only minimal fields needed for the table to improve performance
            const minimalFields = [
                '_id',                    // Request ID
                'awb',                    // AWB Number
                'awb_number',             // AWB Number (alternative)
                'tracking_code',          // AWB Number (alternative)
                'customer_name',          // Customer
                'receiver_name',          // Receiver
                'origin_place',           // Origin
                'destination_place',      // Destination
                'status',                 // Status
                'invoice_id',             // Invoice (check if exists)
                'invoice_number',         // Invoice (check if exists)
                'verification',           // Verification (check if exists)
                'createdAt',              // Created At
                'created_at',             // Created At (alternative)
                'created'                 // Created At (alternative)
            ];
            
            const result = await apiClient.getInvoiceRequests(
                page, // Specific page number (1, 2, 3, etc.)
                itemsPerPage, // Limit: 25 items per page
                {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: search.trim() || undefined
                },
                false, // Don't use cache to ensure fresh data for each page
                minimalFields // Request only minimal fields for faster loading
            );
            if (result.success) {
                // Handle paginated response
                const pagination = (result as any).pagination;
                if (pagination && Array.isArray(result.data)) {
                    // Paginated response: { success: true, data: [...], pagination: {...} }
                    setInvoiceRequests(result.data);
                    setTotalCount(pagination.total || result.data.length);
                    setTotalPages(pagination.pages || 1);
                } else if (result.data && typeof result.data === 'object' && (result.data as any).pagination) {
                    // Paginated response: { success: true, data: { data: [...], pagination: {...} } }
                    const responseData = result.data as any;
                    setInvoiceRequests(Array.isArray(responseData.data) ? responseData.data : []);
                    setTotalCount(responseData.pagination?.total || 0);
                    setTotalPages(responseData.pagination?.pages || 1);
                } else if (Array.isArray(result.data)) {
                    // Non-paginated response (backward compatibility)
                    setInvoiceRequests(result.data);
                    setTotalCount(result.data.length);
                    setTotalPages(1);
                } else {
                    setInvoiceRequests([]);
                    setTotalCount(0);
                    setTotalPages(1);
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to fetch invoice requests',
                });
            }
        } catch (error) {
            console.error('Error loading invoice requests:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch invoice requests',
            });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, itemsPerPage, toast, debouncedSearchQuery]); // Use debouncedSearchQuery instead of searchQuery

    // Update ref whenever fetchInvoiceRequests changes
    useEffect(() => {
        fetchInvoiceRequestsRef.current = fetchInvoiceRequests;
    }, [fetchInvoiceRequests]);

    // Clear requests notification count when page is visited (runs once on mount)
    useEffect(() => {
        clearCount('requests');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch invoice requests when filters or page changes (using debounced search)
    useEffect(() => {
        if (fetchInvoiceRequestsRef.current) {
            fetchInvoiceRequestsRef.current(currentPage);
        }
    }, [currentPage, statusFilter, debouncedSearchQuery]);

    // Auto-refresh disabled - user can manually refresh using the refresh button
    // Uncomment below to re-enable auto-refresh every 30 seconds
    // useEffect(() => {
    //     const intervalId = setInterval(() => {
    //         if (fetchInvoiceRequestsRef.current) {
    //             fetchInvoiceRequestsRef.current(currentPage);
    //         }
    //     }, 30000);
    //     
    //     return () => clearInterval(intervalId);
    // }, [currentPage]);

    // Use invoiceRequests directly since backend handles filtering and pagination
    const paginatedRequests = invoiceRequests;
    
    // Calculate display indices
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + paginatedRequests.length, totalCount);

    // Reset to page 1 when filters change (using debounced search)
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, debouncedSearchQuery]);

    // Get status badge - prioritize status field over invoice existence
    const getStatusBadge = (request: any) => {
        const status = request.status?.toUpperCase() || 'DRAFT';
        const hasInvoice = request.invoice_id || request.invoice_number;

        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
        let label = status;
        let icon = null;

        // Check status first, then show invoice status if applicable
        if (status === 'SUBMITTED') {
            label = 'Submitted';
            badgeVariant = 'secondary';
            icon = <Clock className="h-3 w-3 mr-1" />;
        } else if (status === 'VERIFIED') {
            label = 'Verified';
            badgeVariant = 'default';
            icon = <CheckCircle className="h-3 w-3 mr-1" />;
        } else if (status === 'IN_PROGRESS') {
            label = 'In Progress';
            badgeVariant = 'secondary';
            icon = <Clock className="h-3 w-3 mr-1" />;
        } else if (status === 'COMPLETED') {
            // If completed and has invoice, show "Invoice Generated", otherwise "Completed"
            if (hasInvoice) {
                label = 'Invoice Generated';
                badgeVariant = 'default';
                icon = <FileText className="h-3 w-3 mr-1" />;
            } else {
                label = 'Completed';
                badgeVariant = 'default';
                icon = <CheckCircle className="h-3 w-3 mr-1" />;
            }
        } else if (status === 'CANCELLED') {
            label = 'Cancelled';
            badgeVariant = 'destructive';
            icon = <AlertCircle className="h-3 w-3 mr-1" />;
        } else {
            // For other statuses, check if invoice exists
            if (hasInvoice) {
                label = 'Invoice Generated';
                badgeVariant = 'default';
                icon = <FileText className="h-3 w-3 mr-1" />;
            } else {
                label = 'Draft';
                badgeVariant = 'outline';
            }
        }

        return (
            <Badge variant={badgeVariant} className="flex items-center gap-1">
                {icon}
                {label}
            </Badge>
        );
    };

    // Get AWB number
    const getAwbNumber = (request: any): string => {
        return (
            request.awb ||
            request.tracking_code ||
            request.awb_number ||
            request.request_id?.awb ||
            request.request_id?.tracking_code ||
            request.request_id?.awb_number ||
            'N/A'
        );
    };

    if (loading && invoiceRequests.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading invoice requests...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Invoice Requests</h1>
                    <p className="text-muted-foreground mt-1">
                        Complete information and live status tracking
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => {
                        if (fetchInvoiceRequestsRef.current) {
                            fetchInvoiceRequestsRef.current(currentPage);
                        }
                    }}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search by customer, receiver, AWB, invoice ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="status-filter">Status</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger id="status-filter">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Invoice Requests ({totalCount > 0 ? `${totalCount} total` : 'Loading...'})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request ID</TableHead>
                                    <TableHead>AWB Number</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Receiver</TableHead>
                                    <TableHead>Origin → Destination</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Verification</TableHead>
                                    <TableHead>Created At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            Loading invoice requests...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedRequests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            No invoice requests found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedRequests.map((request) => (
                                        <TableRow key={request._id}>
                                            <TableCell className="font-mono text-xs">
                                                {request._id?.slice(-8) || 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {getAwbNumber(request)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {request.customer_name || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {request.receiver_name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {request.origin_place || 'N/A'} → {request.destination_place || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(request)}
                                            </TableCell>
                                            <TableCell>
                                                {request.invoice_id || request.invoice_number ? (
                                                    <Badge variant="default" className="flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {request.invoice_number || request.invoice_id?.slice(-8) || 'Generated'}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Not Generated</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {request.verification && Object.keys(request.verification).length > 0 ? (
                                                    <Badge variant="default" className="flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Verified
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Pending</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {(() => {
                                                    // Try multiple possible field names for createdAt
                                                    const createdAt = request.createdAt || request.created_at || request.created;
                                                    if (createdAt) {
                                                        try {
                                                            const date = new Date(createdAt);
                                                            // Check if date is valid
                                                            if (!isNaN(date.getTime())) {
                                                                return date.toLocaleString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                });
                                                            }
                                                        } catch (e) {
                                                            console.error('Error parsing date:', e);
                                                        }
                                                    }
                                                    return 'N/A';
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {!loading && totalCount > itemsPerPage && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {startIndex + 1} to {endIndex} of {totalCount} requests
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const newPage = Math.max(1, currentPage - 1);
                                        setCurrentPage(newPage);
                                        fetchInvoiceRequests(newPage);
                                    }}
                                    disabled={currentPage === 1 || loading}
                                >
                                    Previous
                                </Button>
                                <div className="text-sm">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const newPage = Math.min(totalPages, currentPage + 1);
                                        setCurrentPage(newPage);
                                        fetchInvoiceRequests(newPage);
                                    }}
                                    disabled={currentPage === totalPages || loading}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
