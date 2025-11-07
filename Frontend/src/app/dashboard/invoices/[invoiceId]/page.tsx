'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InvoiceTemplate from "@/components/invoice-template";
import TaxInvoiceTemplate from "@/components/tax-invoice-template";
import { apiClient } from "@/lib/api-client";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Receipt } from 'lucide-react';
import { Card } from "@/components/ui/card";

export default function InvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const invoiceId = params?.invoiceId as string;
    const typeParam = searchParams?.get('type');
    const [invoiceType, setInvoiceType] = useState<'normal' | 'tax'>(typeParam === 'tax' ? 'tax' : 'normal');
    
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [qrCodeData, setQrCodeData] = useState<any>(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const result = await apiClient.getInvoiceUnified(invoiceId);
                if (result.success && result.data) {
                    setInvoice(result.data);

                    // Fetch delivery assignment with QR code
                    try {
                        const assignmentResult = await apiClient.getDeliveryAssignmentByInvoice(invoiceId);
                        if (assignmentResult.success && assignmentResult.data) {
                            console.log('📱 QR Code data fetched:', assignmentResult.data);
                            setQrCodeData(assignmentResult.data);
                        } else {
                            console.log('ℹ️ No delivery assignment found for this invoice');
                        }
                    } catch (assignmentError) {
                        console.warn('Could not fetch delivery assignment:', assignmentError);
                        // Not a critical error - invoice might not have a delivery assignment yet
                    }
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error('Error fetching invoice:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (invoiceId) {
            fetchInvoice();
        }
    }, [invoiceId]);

    if (loading) {
        return <div className="p-8">Loading invoice...</div>;
    }

    if (error || !invoice) {
        notFound();
        return null;
    }

    // Calculate charges from invoice data
    const amount = typeof invoice.total_amount === 'number' ? invoice.total_amount : (typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : 0);
    const shippingCharge = amount * 0.8; // 80% shipping
    const deliveryCharge = amount * 0.2; // 20% delivery
    const subtotal = shippingCharge + deliveryCharge;
    const taxRate = invoice.tax_rate || 5; // Default 5% VAT
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Convert invoice to template format
    const invoiceData = {
        invoiceNumber: invoice.invoice_id || invoice._id,
        awbNumber: invoice.request_id?.awb_number || invoice.request_id?.request_id || 'N/A',
        trackingNumber: invoice.request_id?.request_id ? `TRK${invoice.request_id.request_id.toUpperCase()}` : 'N/A',
        date: invoice.issue_date || new Date().toISOString(),
        receiverInfo: {
            name: (invoice.client_id?.company_name || 'Unknown').toUpperCase(),
            address: invoice.request_id?.receiver?.address || 'Address not provided',
            emirate: invoice.request_id?.receiver?.city || 'Dubai',
            mobile: invoice.request_id?.receiver?.phone || '+971XXXXXXXXX'
        },
        senderInfo: {
            address: '11th Street Warehouse No. 19, Rocky Warehouses Al Qusais Industrial 1, Dubai - UAE',
            email: 'customercare@knexpress.ae',
            phone: '+971 56 864 3473'
        },
        shipmentDetails: {
            numberOfBoxes: invoice.request_id?.shipment?.number_of_boxes || 1,
            weight: invoice.request_id?.shipment?.weight ? parseFloat(invoice.request_id.shipment.weight.toString()) : 0,
            weightType: invoice.request_id?.shipment?.weight_type || 'ACTUAL',
            rate: invoice.base_rate ? parseFloat(invoice.base_rate.toString()) : 25.00
        },
        charges: {
            shippingCharge: shippingCharge,
            deliveryCharge: deliveryCharge,
            subtotal: subtotal,
            taxRate: taxRate,
            taxAmount: taxAmount,
            total: total
        },
        remarks: {
            boxNumbers: invoice.notes || 'No remarks',
            agent: 'SYSTEM'
        },
        termsAndConditions: 'Cash Upon Receipt of Goods',
        qrCode: qrCodeData ? {
            url: qrCodeData.qr_url || '',
            code: qrCodeData.qr_code || ''
        } : undefined
    };

    return (
        <div className="space-y-4">
            {/* Navigation Bar */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard/invoices')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Invoices
                        </Button>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Invoice View:</span>
                            <Button
                                variant={invoiceType === 'normal' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setInvoiceType('normal')}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Normal Invoice
                            </Button>
                            <Button
                                variant={invoiceType === 'tax' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setInvoiceType('tax')}
                            >
                                <Receipt className="h-4 w-4 mr-2" />
                                Tax Invoice
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Invoice Template */}
            {invoiceType === 'tax' ? (
                <TaxInvoiceTemplate data={invoiceData} />
            ) : (
                <InvoiceTemplate data={invoiceData} />
            )}
        </div>
    );
}
