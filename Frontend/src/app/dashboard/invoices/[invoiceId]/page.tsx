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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const normalizeServiceCode = (code?: string | null) =>
  (code || '')
    .toString()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const isPhToUaeService = (code?: string | null) => {
  const normalized = normalizeServiceCode(code);
  return normalized === 'PH_TO_UAE' || normalized.startsWith('PH_TO_UAE_');
};

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
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editForm, setEditForm] = useState({
        receiver_name: '',
        receiver_address: '',
        receiver_phone: '',
        amount: '',
        delivery_charge: '',
        tax_rate: '',
        due_date: '',
        notes: ''
    });
    const { toast } = useToast();

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
                console.log('📄 Invoice API result.data:', result.data);
                console.log('📄 Invoice API result.success:', result.success);
                if (result.success && result.data) {
                    console.log('✅ Setting invoice data:', result.data);
                    setInvoice(result.data);
                    setEditForm({
                        receiver_name: result.data.receiver_name || '',
                        receiver_address: result.data.receiver_address || '',
                        receiver_phone: result.data.receiver_phone || '',
                        amount: result.data.amount ? parseFloat(result.data.amount).toString() : '',
                        delivery_charge: result.data.delivery_charge ? parseFloat(result.data.delivery_charge).toString() : '',
                        tax_rate: result.data.tax_rate != null ? result.data.tax_rate.toString() : '',
                        due_date: result.data.due_date ? new Date(result.data.due_date).toISOString().split('T')[0] : '',
                        notes: result.data.notes || ''
                    });

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

    // Debug: Log invoice data
    console.log('🔍 Invoice data for mapping:', invoice);
    if (!invoice) {
        console.error('❌ Invoice is null or undefined');
        return null;
    }

    // Helper function to parse and round decimals (handles Decimal128, numbers, strings)
    const parseDecimal = (value: any, decimals: number = 2): number => {
        let num = 0;
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            num = parseFloat(value) || 0;
        } else if (value && typeof value === 'object') {
            // Handle Decimal128 objects or objects with toString method
            if (value.toString && typeof value.toString === 'function') {
                num = parseFloat(value.toString()) || 0;
            } else if (value.$numberDecimal) {
                // MongoDB Decimal128 format
                num = parseFloat(value.$numberDecimal) || 0;
            } else {
                num = 0;
            }
        }
        // Round to specified decimal places
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    // Parse amounts from API (round to 2 decimals)
    console.log('💰 Raw invoice amount:', invoice.amount, typeof invoice.amount);
    console.log('💰 Raw invoice delivery_charge:', invoice.delivery_charge, typeof invoice.delivery_charge);
    console.log('💰 Raw invoice base_amount:', invoice.base_amount, typeof invoice.base_amount);
    console.log('💰 Raw invoice total_amount:', invoice.total_amount, typeof invoice.total_amount);
    
    const baseAmount = parseDecimal(invoice.amount, 2); // Shipping amount only
    const deliveryChargeFromInvoice = parseDecimal(invoice.delivery_charge || 0, 2); // Delivery charge from invoice
    const baseAmountWithDelivery = parseDecimal(invoice.base_amount || (baseAmount + deliveryChargeFromInvoice), 2); // Shipping + Delivery
    
    console.log('💰 Parsed amounts:', {
        baseAmount,
        deliveryChargeFromInvoice,
        baseAmountWithDelivery
    });
    
    // Get shipping and delivery charges
    let shippingCharge = baseAmount; // Base amount is shipping only
    let deliveryCharge = deliveryChargeFromInvoice; // Use delivery_charge from invoice
    
    // If delivery_charge is not in invoice, try to calculate from line items
    if (deliveryCharge === 0 && invoice.line_items && invoice.line_items.length > 0) {
        invoice.line_items.forEach((item: any) => {
            const itemTotal = parseDecimal(item.total || item.unit_price, 2);
            if (item.description?.toLowerCase().includes('delivery')) {
                deliveryCharge += itemTotal;
            }
        });
        deliveryCharge = parseDecimal(deliveryCharge, 2);
    }
    
    const serviceCodeRaw =
        invoice.service_code ||
        invoice.request_id?.service_code ||
        invoice.request_id?.verification?.service_code ||
        '';
    const isPhToUae = isPhToUaeService(serviceCodeRaw);

    // Calculate tax based on delivery charge only
    const taxRate = deliveryCharge > 0 && isPhToUae ? 5 : 0;
    const taxAmount = deliveryCharge > 0 && taxRate > 0 ? parseDecimal((deliveryCharge * taxRate) / 100, 2) : 0;
    
    const subtotal = baseAmountWithDelivery; // Shipping + Delivery
    const total = parseDecimal(subtotal + taxAmount, 2); // Subtotal + Tax

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
    const numberOfBoxes =
        invoice.request_id?.shipment?.number_of_boxes ||
        invoice.request_id?.verification?.number_of_boxes ||
        invoice.request_id?.number_of_boxes ||
        invoice.number_of_boxes ||
        1;
    const weightType = invoice.request_id?.shipment?.weight_type || 'ACTUAL';
    
    // Calculate rate from amount and weight if not provided
    let rate = 25.00;
    if (invoice.base_rate) {
        rate = parseDecimal(invoice.base_rate, 2);
    } else if (weight > 0 && baseAmount > 0) {
        rate = parseDecimal(baseAmount / weight, 2);
    }

    const senderName =
        invoice.customer_name ||
        invoice.request_id?.customer_name ||
        invoice.request_id?.sender?.name ||
        invoice.client_id?.company_name ||
        invoice.client_id?.contact_name ||
        'N/A';
    const senderAddress =
        invoice.origin_place ||
        invoice.request_id?.origin_place ||
        invoice.request_id?.sender?.address ||
        'Address not provided';
    const senderPhone =
        invoice.customer_phone ||
        invoice.request_id?.customer_phone ||
        invoice.request_id?.sender?.phone ||
        invoice.client_id?.contact_phone ||
        '+971XXXXXXXXX';
    const senderEmail =
        invoice.customer_email ||
        invoice.request_id?.customer_email ||
        invoice.request_id?.sender?.email ||
        invoice.client_id?.contact_email ||
        '';

    // Convert invoice to template format
    const invoiceData = {
        invoiceNumber: invoice.invoice_id || invoice._id,
        batchNumber: invoice.batch_number || invoice.request_id?.batch_number || '',
        awbNumber: awbNumber,
        trackingNumber: awbNumber,
        date: invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        receiverInfo: {
            name: receiverName.toUpperCase(),
            address: receiverAddress,
            emirate: emirate,
            mobile: receiverPhone
        },
        senderInfo: {
            name: senderName,
            address: senderAddress,
            email: senderEmail || undefined,
            phone: senderPhone
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

    const shouldShowDeliveryOnlyInTaxInvoice = isPhToUae;
    const deliveryOnlyTaxAmount = parseDecimal((deliveryCharge * taxRate) / 100, 2);
    const deliveryOnlyTotal = parseDecimal(deliveryCharge + deliveryOnlyTaxAmount, 2);
    const taxInvoiceData = shouldShowDeliveryOnlyInTaxInvoice
        ? {
            ...invoiceData,
            charges: {
                ...invoiceData.charges,
                shippingCharge: 0,
                subtotal: deliveryCharge,
                taxAmount: deliveryOnlyTaxAmount,
                total: deliveryOnlyTotal
            }
        }
        : invoiceData;

    // Debug: Log mapped invoice data
    console.log('📊 Mapped invoiceData:', invoiceData);

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

    const handleEditChange = (field: string, value: string) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSaveEdit = async () => {
        const invoiceIdentifier = invoice?._id || invoiceId;
        if (!invoiceIdentifier) return;
        setSavingEdit(true);
        try {
            const payload: any = {
                receiver_name: editForm.receiver_name.trim(),
                receiver_address: editForm.receiver_address.trim(),
                receiver_phone: editForm.receiver_phone.trim(),
                notes: editForm.notes?.trim() || ''
            };

            if (editForm.amount) payload.amount = parseFloat(editForm.amount);
            if (editForm.delivery_charge) payload.delivery_charge = parseFloat(editForm.delivery_charge);
            if (editForm.tax_rate) payload.tax_rate = parseFloat(editForm.tax_rate);
            if (editForm.due_date) payload.due_date = new Date(editForm.due_date).toISOString();

            const result = await apiClient.updateInvoiceUnified(invoiceIdentifier, payload);
            if (result.success && result.data) {
                setInvoice(result.data);
                toast({
                    title: 'Invoice updated',
                    description: 'Changes have been saved successfully.',
                });
                setShowEditDialog(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Update failed',
                    description: result.error || 'Unable to update invoice.',
                });
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: err.message || 'Unable to update invoice.',
            });
        } finally {
            setSavingEdit(false);
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
                            variant="outline"
                            onClick={() => setShowEditDialog(true)}
                        >
                            Edit Invoice
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
                {invoiceData && invoiceData.invoiceNumber ? (
                    invoiceType === 'tax' ? (
                        <TaxInvoiceTemplate data={taxInvoiceData} />
                    ) : (
                        <InvoiceTemplate data={invoiceData} />
                    )
                ) : (
                    <Card className="p-6">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Invoice Data Error</AlertTitle>
                            <AlertDescription>
                                Invoice data is missing or invalid. Please check the console for details.
                            </AlertDescription>
                        </Alert>
                        <div className="mt-4">
                            <p className="text-sm text-gray-600">Invoice Object:</p>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                                {JSON.stringify(invoice, null, 2)}
                            </pre>
                            <p className="text-sm text-gray-600 mt-4">Mapped Invoice Data:</p>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                                {JSON.stringify(invoiceData, null, 2)}
                            </pre>
                        </div>
                    </Card>
                )}
            </div>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Invoice</DialogTitle>
                        <DialogDescription>Adjust receiver and charge details. All changes are tracked.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Receiver Name</Label>
                                <Input
                                    value={editForm.receiver_name}
                                    onChange={(e) => handleEditChange('receiver_name', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Receiver Phone</Label>
                                <Input
                                    value={editForm.receiver_phone}
                                    onChange={(e) => handleEditChange('receiver_phone', e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Receiver Address</Label>
                            <Textarea
                                value={editForm.receiver_address}
                                onChange={(e) => handleEditChange('receiver_address', e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Shipping Charge (AED)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.amount}
                                    onChange={(e) => handleEditChange('amount', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Delivery Charge (AED)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.delivery_charge}
                                    onChange={(e) => handleEditChange('delivery_charge', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Tax Rate (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.tax_rate}
                                    onChange={(e) => handleEditChange('tax_rate', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.due_date}
                                    onChange={(e) => handleEditChange('due_date', e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Notes</Label>
                            <Textarea
                                value={editForm.notes}
                                rows={3}
                                onChange={(e) => handleEditChange('notes', e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowEditDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                        >
                            {savingEdit ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
