'use client';

import InvoicesTable from "@/components/invoices-table";
import CSVUpload from "@/components/csv-upload";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from '@/contexts/NotificationContext';
import { useState, useEffect } from "react";
import { useToast } from '@/hooks/use-toast';

export default function InvoicesPage() {
    const { department } = useAuth();
    const { clearCount } = useNotifications();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const { toast } = useToast();
    const { userProfile } = useAuth();

    useEffect(() => {
        // Clear invoices notification count when page is visited
        clearCount('invoices');
        
        const loadInvoiceData = async () => {
            try {
                console.log('🔄 Loading invoices from API...');
                const result = await apiClient.getInvoicesUnified();
                console.log('📊 Invoices API result:', result);
                console.log('📊 Type of result:', typeof result);
                console.log('📊 Full result structure:', JSON.stringify(result, null, 2));
                
                if (result && result.success && result.data) {
                    console.log('✅ Invoices loaded successfully');
                    const invoiceData = result.data as any;
                    console.log('📋 Number of invoices:', Array.isArray(invoiceData) ? invoiceData.length : 0);
                    console.log('📋 Invoice data:', invoiceData);
                    setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
                } else {
                    console.error('❌ Error loading invoices:', result?.error || 'Unknown error');
                    console.error('❌ Full error result:', result);
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: result?.error || 'Failed to load invoices',
                    });
                    setInvoices([]); // Set empty array on error
                }
            } catch (error) {
                console.error('❌ Error loading invoice data:', error);
                console.error('❌ Error details:', error instanceof Error ? error.message : error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to load invoices: ' + (error instanceof Error ? error.message : 'Unknown error'),
                });
                setInvoices([]); // Set empty array on error
            } finally {
                setLoading(false);
            }
        };

        loadInvoiceData();
    }, [refreshKey]);

    const handleCSVUploadSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleGenerateQR = async (invoiceId: string) => {
        try {
            const invoice = invoices.find(inv => inv._id === invoiceId);
            if (!invoice) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Invoice not found'
                });
                return;
            }

            // Get or create client
            let clientId = invoice.client_id?._id || invoice.client_id;
            if (!clientId) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Client information missing. Please create a delivery assignment manually.'
                });
                return;
            }

            // Create delivery assignment with QR code
            const assignmentData = {
                request_id: invoice.request_id?._id || invoice.request_id,
                invoice_id: invoiceId,
                client_id: clientId,
                amount: invoice.total_amount || invoice.amount,
                delivery_type: 'COD',
                delivery_address: 'Address to be confirmed',
                delivery_instructions: 'Please contact customer for delivery details'
            };

            const result = await apiClient.createDeliveryAssignment(assignmentData);
            
            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'QR code generated successfully! Check Delivery Assignments.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to generate QR code'
                });
            }
        } catch (error) {
            console.error('Error generating QR:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to generate QR code'
            });
        }
    };

    const handleRemitInvoice = async (invoiceId: string) => {
        try {
            const invoice = invoices.find(inv => inv._id === invoiceId);
            const currentStatus = invoice?.status;
            
            // If UNPAID, mark as COLLECTED_BY_DRIVER; if COLLECTED_BY_DRIVER, mark as REMITTED
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
                // Refresh invoices list
                const updatedResult = await apiClient.getInvoicesUnified();
                if (updatedResult.success && updatedResult.data) {
                    setInvoices(Array.isArray(updatedResult.data) ? updatedResult.data : []);
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to update invoice'
                });
            }
        } catch (error) {
            console.error('Error updating invoice:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update invoice'
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading invoices...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CSVUpload onSuccess={handleCSVUploadSuccess} />
            <InvoicesTable 
                invoices={invoices}
                department={department?.name as any}
                onGenerateQR={handleGenerateQR}
                onRemit={handleRemitInvoice}
            />
        </div>
    );
}
