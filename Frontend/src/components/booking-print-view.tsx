'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon } from 'lucide-react';

interface BookingPrintViewProps {
  booking: any;
  onClose?: () => void;
}

export default function BookingPrintView({ booking, onClose }: BookingPrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Helper function to get image source
  const getImageSrc = (imageField: string | undefined) => {
    if (!imageField) return null;
    if (imageField.startsWith('data:image') || imageField.startsWith('http')) {
      return imageField;
    }
    return imageField;
  };

  // Helper to format values
  const formatValue = (value: any): string => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, any>;
      if (obj.fullName) return String(obj.fullName);
      if (obj.name) return String(obj.name);
      if (obj.completeAddress || obj.address) return String(obj.completeAddress || obj.address);
      if (obj.emailAddress || obj.email) return String(obj.emailAddress || obj.email);
      if (obj.contactNo || obj.phone || obj.phoneNumber) return String(obj.contactNo || obj.phone || obj.phoneNumber);
      try {
        const s = JSON.stringify(obj);
        return s.length > 120 ? s.slice(0, 117) + '...' : s;
      } catch {
        return 'Object';
      }
    }
    return String(value);
  };

  const sender = booking.sender || {};
  const receiver = booking.receiver || {};
  const items: any[] = (
    Array.isArray(booking.items) ? booking.items :
    Array.isArray(booking.orderItems) ? booking.orderItems :
    Array.isArray(booking.listedItems) ? booking.listedItems :
    []
  ).filter(Boolean);

  const idFrontImage = getImageSrc(
    booking.id_front_image ||
    booking.idFrontImage ||
    booking.identityDocuments?.eidFrontImage ||
    booking.collections?.identityDocuments?.eidFrontImage
  );
  const idBackImage = getImageSrc(
    booking.id_back_image ||
    booking.idBackImage ||
    booking.identityDocuments?.eidBackImage ||
    booking.collections?.identityDocuments?.eidBackImage
  );
  const faceScanImage = getImageSrc(
    booking.face_scan_image ||
    booking.faceScanImage
  );

  const customerImages: string[] = (
    Array.isArray(booking.customerImages) ? booking.customerImages :
    Array.isArray(booking.identityDocuments?.customerImages) ? booking.identityDocuments.customerImages :
    Array.isArray(booking.collections?.identityDocuments?.customerImages) ? booking.collections.identityDocuments.customerImages :
    []
  ).filter(Boolean);

  useEffect(() => {
    // Generate and download PDF automatically
    const generatePDF = async () => {
      if (!printRef.current) return;

      try {
        // Dynamically import html2pdf.js
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        
        const element = printRef.current;
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `booking-${booking._id || 'form'}-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(element).save();
        
        // Close the view after PDF is generated
        setTimeout(() => {
          if (onClose) onClose();
        }, 500);
      } catch (error) {
        console.error('Error generating PDF:', error);
        // Fallback to print dialog if PDF generation fails
        window.print();
      }
    };

    // Small delay to ensure images are loaded
    setTimeout(() => {
      generatePDF();
    }, 1000);
  }, [onClose]);

  return (
    <div ref={printRef} className="print-container p-8 max-w-4xl mx-auto bg-white">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container,
          .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none;
          }
          .page-break {
            page-break-after: always;
          }
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .img-wrap {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        }
        @media screen {
          .print-container {
            display: block;
          }
        }
      `}</style>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Booking Request Form</h1>
        <p className="text-sm text-muted-foreground">
          Booking ID: {booking._id} | Created: {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}
        </p>
      </div>

      {/* Booking Details */}
      <Card className="mb-6 avoid-break">
        <CardHeader>
          <CardTitle className="text-xl">Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Customer Name</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.customer_name || booking.name || sender.fullName || sender.name)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Customer Email</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.customer_email || booking.email || sender.emailAddress || sender.email)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Customer Phone</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.customer_phone || booking.phone || sender.contactNo || sender.phone)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Agent Name</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.agentName || booking.customer_company || booking.company || sender.company)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Receiver Name</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.receiver_name || booking.receiverName || receiver.fullName || receiver.name)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Receiver Email</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.receiver_email || booking.receiverEmail || receiver.emailAddress || receiver.email)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Receiver Phone</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.receiver_phone || booking.receiverPhone || receiver.contactNo || receiver.phone)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Receiver Address</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.receiver_address || booking.receiverAddress || receiver.completeAddress || receiver.address)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Origin</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.origin_place || booking.origin || sender.completeAddress || sender.address)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Destination</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.destination_place || booking.destination || receiver.completeAddress || receiver.address)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Shipment Type</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {formatValue(booking.shipment_type || booking.shipmentType || booking.deliveryOption || booking.service_type)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Weight (kg)</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {booking.weight_kg || booking.weightKg || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Volume (CBM)</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {booking.volume_cbm || booking.volumeCbm || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Amount</Label>
              <p className="text-sm mt-1 border-b pb-1">
                {booking.amount ? parseFloat(booking.amount.toString()).toFixed(2) : 'N/A'}
              </p>
            </div>
          </div>
          {booking.notes && (
            <div>
              <Label className="text-sm font-semibold">Notes</Label>
              <p className="text-sm mt-1 border-b pb-1">{booking.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items - keep with booking details, avoid page breaks within */}
      {items.length > 0 && (
        <Card className="mb-6 avoid-break">
          <CardHeader>
            <CardTitle className="text-xl">Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-left p-2">Quantity</th>
                    <th className="text-left p-2">Weight (kg)</th>
                    <th className="text-left p-2">Value/Amount</th>
                    <th className="text-left p-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const name = it?.name || it?.description || it?.item || it?.title || `Item ${idx + 1}`;
                    const qty = it?.quantity || it?.qty || it?.count || 'N/A';
                    const wt = it?.weight || it?.weightKg || it?.kg || 'N/A';
                    const val = it?.value || it?.amount || it?.price || 'N/A';
                    const note = it?.notes || it?.remarks || '';
                    return (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{formatValue(name)}</td>
                        <td className="p-2">{formatValue(qty)}</td>
                        <td className="p-2">{formatValue(wt)}</td>
                        <td className="p-2">{formatValue(val)}</td>
                        <td className="p-2">{formatValue(note)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Images - start on a new page */}
      <Card className="mb-6 page-break avoid-break">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Verification Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* ID Front Image */}
            {idFrontImage && (
              <div className="space-y-2 img-wrap">
                <Label className="text-sm font-semibold">ID Front Image</Label>
                <div className="border rounded-md p-2">
                  <img
                    src={idFrontImage}
                    alt="ID Front"
                    className="w-full max-w-md mx-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* ID Back Image */}
            {idBackImage && (
              <div className="space-y-2 img-wrap">
                <Label className="text-sm font-semibold">ID Back Image</Label>
                <div className="border rounded-md p-2">
                  <img
                    src={idBackImage}
                    alt="ID Back"
                    className="w-full max-w-md mx-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* Face Scan Image */}
            {faceScanImage && (
              <div className="space-y-2 img-wrap">
                <Label className="text-sm font-semibold">Face Scan Image</Label>
                <div className="border rounded-md p-2">
                  <img
                    src={faceScanImage}
                    alt="Face Scan"
                    className="w-full max-w-md mx-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* Client Face Images (chunked with page breaks) */}
            {customerImages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Client Face Images ({customerImages.length})</Label>
                {(() => {
                  const chunks: string[][] = [];
                  const size = 4; // 4 images per page chunk
                  for (let i = 0; i < customerImages.length; i += size) {
                    chunks.push(customerImages.slice(i, i + size));
                  }
                  return chunks.map((chunk, cidx) => (
                    <div key={cidx} className={`space-y-2 ${cidx < chunks.length - 1 ? 'page-break' : ''}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {chunk.map((img, idx) => (
                          <div key={`${cidx}-${idx}`} className="border rounded-md p-2 img-wrap">
                            <img
                              src={img}
                              alt={`Client Face ${cidx * size + idx + 1}`}
                              className="w-full max-w-xs mx-auto object-contain"
                            />
                            <p className="text-xs text-center mt-2 text-muted-foreground">Image {cidx * size + idx + 1}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground mt-6 no-print">
        <p>This document was generated on {new Date().toLocaleString()}</p>
        <p className="mt-2">Click the browser's print button or press Ctrl+P to print/download</p>
      </div>
    </div>
  );
}

