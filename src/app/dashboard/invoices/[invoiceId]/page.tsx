'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InvoiceTemplate from "@/components/invoice-template";
import TaxInvoiceTemplate from "@/components/tax-invoice-template";
import { apiClient } from "@/lib/api-client";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Receipt, AlertCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function InvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const invoiceId = params?.invoiceId as string;
    const typeParam = searchParams?.get('type');
    const [invoiceType, setInvoiceType] = useState<'normal' | 'tax'>(typeParam === 'tax' ? 'tax' : 'normal');
    
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [qrCodeData, setQrCodeData] = useState<any>(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!invoiceId) {
                setError('Invoice ID is required');
                setLoading(false);
                return;
            }

            console.log('🔍 Fetching invoice with ID:', invoiceId);
            
            try {
                const result = await apiClient.getInvoiceUnified(invoiceId);
                console.log('📄 Invoice API result:', result);
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
                    setError(result.error || 'Invoice not found');
                }
            } catch (err: any) {
                console.error('Error fetching invoice:', err);
                setError(err.message || 'Failed to load invoice');
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [invoiceId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-lg">Loading invoice...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="p-8 space-y-4">
                <Card className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Invoice Not Found</AlertTitle>
                        <AlertDescription>
                            {error || 'The invoice you are looking for does not exist or could not be loaded.'}
                        </AlertDescription>
                    </Alert>
                    <div className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard/invoices')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Invoices
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // Get invoice amounts (handle Decimal128 conversion)
    const parseDecimal = (value: any): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || 0;
        if (value && typeof value.toString === 'function') return parseFloat(value.toString()) || 0;
        return 0;
    };

    // Base amount without tax
    const baseAmount = parseDecimal(invoice.amount);
    // Tax amount
    const taxAmount = parseDecimal(invoice.tax_amount);
    // Total amount (includes tax) = amount + tax_amount
    const totalAmount = parseDecimal(invoice.total_amount);
    
    // Calculate shipping and delivery charges from base amount (without tax)
    // If line_items exist, use them; otherwise split base amount
    let shippingCharge = 0;
    let deliveryCharge = 0;
    
    if (invoice.line_items && invoice.line_items.length > 0) {
        // Calculate from line items
        invoice.line_items.forEach((item: any) => {
            const itemTotal = parseDecimal(item.total || item.unit_price);
            // Assume shipping charge is the main charge, delivery is separate if exists
            if (item.description?.toLowerCase().includes('shipping') || 
                item.description?.toLowerCase().includes('freight')) {
                shippingCharge += itemTotal;
            } else if (item.description?.toLowerCase().includes('delivery')) {
                deliveryCharge += itemTotal;
            } else {
                // Default to shipping charge
                shippingCharge += itemTotal;
            }
        });
    } else {
        // Split base amount: 80% shipping, 20% delivery
        shippingCharge = baseAmount * 0.8;
        deliveryCharge = baseAmount * 0.2;
    }
    
    // Ensure shipping + delivery = base amount
    const calculatedBase = shippingCharge + deliveryCharge;
    if (calculatedBase > 0 && Math.abs(calculatedBase - baseAmount) > 0.01) {
        // Adjust to match base amount exactly
        const ratio = baseAmount / calculatedBase;
        shippingCharge = shippingCharge * ratio;
        deliveryCharge = deliveryCharge * ratio;
    }
    
    // Subtotal = base amount (shipping + delivery)
    const subtotal = baseAmount;
    // Tax rate
    const taxRate = invoice.tax_rate || (taxAmount > 0 && baseAmount > 0 ? (taxAmount / baseAmount) * 100 : 0);
    // Total = base amount + tax
    const total = totalAmount; // Use invoice.total_amount directly

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
