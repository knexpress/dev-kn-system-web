'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InvoiceTemplate from "@/components/invoice-template";
import TaxInvoiceTemplate from "@/components/tax-invoice-template";
import { apiClient } from "@/lib/api-client";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Receipt, AlertCircle, Download, Printer } from 'lucide-react';
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

    // Helper function to parse and round decimals
    const parseDecimal = (value: any, decimals: number = 2): number => {
        let num = 0;
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            num = parseFloat(value) || 0;
        } else if (value && typeof value.toString === 'function') {
            num = parseFloat(value.toString()) || 0;
        }
        // Round to specified decimal places
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    // Parse amounts from API (round to 2 decimals)
    const baseAmount = parseDecimal(invoice.amount, 2);
    const taxAmount = parseDecimal(invoice.tax_amount, 2);
    const totalAmount = parseDecimal(invoice.total_amount, 2);
    
    // Calculate shipping and delivery charges from line items or split base amount
    let shippingCharge = 0;
    let deliveryCharge = 0;
    
    if (invoice.line_items && invoice.line_items.length > 0) {
        // Calculate from line items
        invoice.line_items.forEach((item: any) => {
            const itemTotal = parseDecimal(item.total || item.unit_price, 2);
            if (item.description?.toLowerCase().includes('shipping') || 
                item.description?.toLowerCase().includes('freight')) {
                shippingCharge += itemTotal;
            } else if (item.description?.toLowerCase().includes('delivery')) {
                deliveryCharge += itemTotal;
            } else {
                shippingCharge += itemTotal;
            }
        });
        // Round after calculation
        shippingCharge = parseDecimal(shippingCharge, 2);
        deliveryCharge = parseDecimal(deliveryCharge, 2);
    } else {
        // Split base amount: 80% shipping, 20% delivery
        shippingCharge = parseDecimal(baseAmount * 0.8, 2);
        deliveryCharge = parseDecimal(baseAmount * 0.2, 2);
    }
    
    // Ensure shipping + delivery = base amount (adjust if needed)
    const calculatedBase = shippingCharge + deliveryCharge;
    if (calculatedBase > 0 && Math.abs(calculatedBase - baseAmount) > 0.01) {
        const ratio = baseAmount / calculatedBase;
        shippingCharge = parseDecimal(shippingCharge * ratio, 2);
        deliveryCharge = parseDecimal(deliveryCharge * ratio, 2);
    }
    
    const subtotal = baseAmount;
    const taxRate = invoice.tax_rate || (taxAmount > 0 && baseAmount > 0 ? parseDecimal((taxAmount / baseAmount) * 100, 2) : 0);
    const total = totalAmount;

    // Get AWB number - check direct field first, then request_id
    const awbNumber = invoice.awb_number || invoice.request_id?.awb_number || invoice.request_id?.request_id || 'N/A';
    
    // Get receiver info - use direct fields first, then fallback to request_id
    const receiverName = invoice.receiver_name || invoice.request_id?.receiver?.name || invoice.client_id?.contact_name || invoice.client_id?.company_name || 'N/A';
    const receiverAddress = invoice.receiver_address || invoice.request_id?.receiver?.address || 'Address not provided';
    const receiverPhone = invoice.receiver_phone || invoice.request_id?.receiver?.phone || '+971XXXXXXXXX';
    
    // Parse receiver address to extract city/emirate
    const addressParts = receiverAddress.split(',').map((p: string) => p.trim());
    const emirate = addressParts.length > 1 ? addressParts[addressParts.length - 2] : (invoice.request_id?.receiver?.city || 'Dubai');
    
    // Get shipment details - use direct fields first
    const weight = parseDecimal(invoice.weight_kg || invoice.request_id?.shipment?.weight, 2);
    const volume = parseDecimal(invoice.volume_cbm || invoice.request_id?.shipment?.volume, 2);
    const numberOfBoxes = invoice.request_id?.shipment?.number_of_boxes || 1;
    const weightType = invoice.request_id?.shipment?.weight_type || 'ACTUAL';
    
    // Calculate rate from amount and weight if not provided
    let rate = 25.00;
    if (invoice.base_rate) {
        rate = parseDecimal(invoice.base_rate, 2);
    } else if (weight > 0 && baseAmount > 0) {
        rate = parseDecimal(baseAmount / weight, 2);
    }

    // Convert invoice to template format
    const invoiceData = {
        invoiceNumber: invoice.invoice_id || invoice._id,
        awbNumber: awbNumber,
        trackingNumber: awbNumber !== 'N/A' ? `TRK${awbNumber.toUpperCase()}` : 'N/A',
        date: invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        receiverInfo: {
            name: receiverName.toUpperCase(),
            address: receiverAddress,
            emirate: emirate,
            mobile: receiverPhone
        },
        senderInfo: {
            address: '11th Street Warehouse No. 19, Rocky Warehouses Al Qusais Industrial 1, Dubai - UAE',
            email: 'customercare@knexpress.ae',
            phone: '+971 56 864 3473'
        },
        shipmentDetails: {
            numberOfBoxes: numberOfBoxes,
            weight: weight,
            weightType: weightType,
            rate: rate
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
            agent: invoice.created_by?.full_name || 'SYSTEM'
        },
        termsAndConditions: 'Cash Upon Receipt of Goods',
        qrCode: qrCodeData ? {
            url: qrCodeData.qr_url || '',
            code: qrCodeData.qr_code || ''
        } : undefined
    };

    // Print/Download PDF function
    const handlePrint = () => {
        window.print();
    };

    // Download as PDF function
    const handleDownloadPDF = async () => {
        try {
            const invoiceElement = document.getElementById('invoice-content');
            if (!invoiceElement) {
                handlePrint();
                return;
            }

            // Dynamically import html2pdf.js
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default || html2pdfModule;

            const opt = {
                margin: 0.5,
                filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            await html2pdf().set(opt).from(invoiceElement).save();
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Fallback to print dialog
            handlePrint();
        }
    };

    return (
        <div className="space-y-4">
            {/* Navigation Bar */}
            <Card className="p-4 no-print">
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
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePrint}
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button
                            onClick={handleDownloadPDF}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Invoice Template */}
            <div id="invoice-content">
                {invoiceType === 'tax' ? (
                    <TaxInvoiceTemplate data={invoiceData} />
                ) : (
                    <InvoiceTemplate data={invoiceData} />
                )}
            </div>
        </div>
    );
}
