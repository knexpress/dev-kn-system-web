'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, X, Loader2, Image as ImageIcon, XCircle, MapPin, ExternalLink, Printer } from 'lucide-react';

interface BookingReviewModalProps {
  booking: any;
  open: boolean;
  onClose: () => void;
  onReviewComplete: () => void;
  currentUser: any;
  viewOnly?: boolean; // If true, hide approve/reject buttons and make it view-only
  onPrint?: (booking: any) => void; // Optional print handler
}

export default function BookingReviewModal({
  booking,
  open,
  onClose,
  onReviewComplete,
  currentUser,
  viewOnly = false,
  onPrint,
}: BookingReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingImageTitle, setViewingImageTitle] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  // Helpers to safely format nested values
  const formatValue = (value: any): string => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      const obj = value as Record<string, any>;
      if (obj.fullName) return String(obj.fullName);
      if (obj.name) return String(obj.name);
      if (obj.completeAddress || obj.address) return String(obj.completeAddress || obj.address);
      if (obj.emailAddress || obj.email) return String(obj.emailAddress || obj.email);
      if (obj.contactNo || obj.phone || obj.phoneNumber) return String(obj.contactNo || obj.phone || obj.phoneNumber);
      try { const s = JSON.stringify(obj); return s.length > 120 ? s.slice(0,117)+'...' : s; } catch { return 'Object'; }
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

  // Helper function to normalize service code
  const normalizeServiceCode = (code?: string | null) =>
    (code || '')
      .toString()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

  // Helper function to check if service is UAE TO PINAS
  const isUaeToPinasService = (code?: string | null) => {
    const normalized = normalizeServiceCode(code);
    return normalized === 'UAE_TO_PH' || 
           normalized === 'UAE_TO_PINAS' ||
           normalized.startsWith('UAE_TO_PH_') ||
           normalized.startsWith('UAE_TO_PINAS_') ||
           normalized.includes('UAE_TO_PINAS');
  };

  // Helper function to parse numeric values (for declaredAmount)
  const parseNumericValue = (value: any): number | string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 'N/A' : parsed;
    }
    if (value && typeof value === 'object') {
      // Handle MongoDB Decimal128 format
      if (value.$numberDecimal) {
        return parseFloat(value.$numberDecimal);
      }
      if (typeof value.toString === 'function') {
        const parsed = parseFloat(value.toString());
        return isNaN(parsed) ? 'N/A' : parsed;
      }
    }
    return 'N/A';
  };

  // Helper function to extract coordinates from various possible locations
  const getCoordinates = (source: any, type: 'sender' | 'receiver') => {
    // Try various possible field names for longitude and latitude
    const possibleFields = [
      // Form filler fields (specific to sender)
      { lat: source?.formFillerLatitude || source?.form_filler_latitude, lng: source?.formFillerLongitude || source?.form_filler_longitude },
      // Direct fields
      { lat: source?.latitude || source?.lat, lng: source?.longitude || source?.lng || source?.long },
      // Nested in location object
      { lat: source?.location?.latitude || source?.location?.lat, lng: source?.location?.longitude || source?.location?.lng || source?.location?.long },
      // Nested in coordinates object
      { lat: source?.coordinates?.latitude || source?.coordinates?.lat, lng: source?.coordinates?.longitude || source?.coordinates?.lng || source?.coordinates?.long },
      // Booking level fields
      { lat: booking?.[`${type}_latitude`] || booking?.[`${type}_lat`], lng: booking?.[`${type}_longitude`] || booking?.[`${type}_lng`] || booking?.[`${type}_long`] },
      // Booking level nested
      { lat: booking?.[`${type}_location`]?.latitude || booking?.[`${type}_location`]?.lat, lng: booking?.[`${type}_location`]?.longitude || booking?.[`${type}_location`]?.lng || booking?.[`${type}_location`]?.long },
      // Receiver specific fields (if they exist)
      { lat: source?.receiverLatitude || source?.receiver_latitude, lng: source?.receiverLongitude || source?.receiver_longitude },
    ];

    for (const field of possibleFields) {
      if (field.lat && field.lng) {
        const lat = typeof field.lat === 'string' ? parseFloat(field.lat) : field.lat;
        const lng = typeof field.lng === 'string' ? parseFloat(field.lng) : field.lng;
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }
    return null;
  };

  const senderCoordinates = getCoordinates(sender, 'sender');
  const receiverCoordinates = getCoordinates(receiver, 'receiver');

  // Helper function to create Google Maps URL
  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);

      if (!currentUser?.employee_id && !currentUser?.uid) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User information not found',
        });
        return;
      }

      // Review and approve booking (converts to invoice request)
      const result = await apiClient.reviewBooking(booking._id, {
        reviewed_by_employee_id: currentUser.employee_id || currentUser.uid,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Booking reviewed and converted to invoice request successfully',
        });
        onReviewComplete();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to review booking',
        });
      }
    } catch (error) {
      console.error('Error reviewing booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to review booking',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide a rejection reason',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (!currentUser?.employee_id && !currentUser?.uid) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User information not found',
        });
        return;
      }

      // Update booking status to rejected with reason
      const result = await apiClient.updateBookingStatus(booking._id, {
        review_status: 'rejected',
        reviewed_by_employee_id: currentUser.employee_id || currentUser.uid,
        reason: rejectionReason.trim(),
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Booking has been rejected',
        });
        setShowRejectModal(false);
        setRejectionReason('');
        onReviewComplete();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to reject booking',
        });
      }
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject booking',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get image source
  const getImageSrc = (imageField: string | undefined) => {
    if (!imageField) return null;
    
    // If it's a base64 string
    if (imageField.startsWith('data:image')) {
      return imageField;
    }
    
    // If it's a URL
    if (imageField.startsWith('http')) {
      return imageField;
    }
    
    // Otherwise return as is (might be a path)
    return imageField;
  };

  // Helper function to open image viewer
  const openImageViewer = (imageSrc: string, title: string) => {
    setViewingImage(imageSrc);
    setViewingImageTitle(title);
  };

  const idFrontImage = getImageSrc(
    booking.id_front_image 
    || booking.idFrontImage 
    || booking.identityDocuments?.eidFrontImage 
    || booking.collections?.identityDocuments?.eidFrontImage
  );
  const idBackImage = getImageSrc(
    booking.id_back_image 
    || booking.idBackImage 
    || booking.identityDocuments?.eidBackImage 
    || booking.collections?.identityDocuments?.eidBackImage
  );
  const philippinesIdFront = getImageSrc(
    booking.philippinesIdFront 
    || booking.philippines_id_front
    || booking.identityDocuments?.philippinesIdFront
    || booking.collections?.identityDocuments?.philippinesIdFront
  );
  const philippinesIdBack = getImageSrc(
    booking.philippinesIdBack 
    || booking.philippines_id_back
    || booking.identityDocuments?.philippinesIdBack
    || booking.collections?.identityDocuments?.philippinesIdBack
  );
  const faceScanImage = getImageSrc(
    booking.face_scan_image 
    || booking.faceScanImage
  );

  const baseCustomerImages: string[] = (
    Array.isArray(booking.customerImages) ? booking.customerImages :
    Array.isArray(booking.identityDocuments?.customerImages) ? booking.identityDocuments.customerImages :
    Array.isArray(booking.collections?.identityDocuments?.customerImages) ? booking.collections.identityDocuments.customerImages :
    []
  ).filter(Boolean);
  
  // Add singular customerImage if it exists and is not already in the array
  const singularCustomerImage = booking.customerImage || booking.identityDocuments?.customerImage;
  const customerImages: string[] = singularCustomerImage && !baseCustomerImages.includes(singularCustomerImage)
    ? [...baseCustomerImages, singularCustomerImage]
    : baseCustomerImages;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
            <DialogTitle>{viewOnly ? 'View Booking Request' : 'Review Booking Request'}</DialogTitle>
            <DialogDescription>
              Review booking details and images before approving
            </DialogDescription>
            <p className="text-sm font-bold text-center mt-3 px-4 py-2 bg-primary/10 text-primary rounded-md">
              Service: {formatValue(
                booking.service || 
                booking.service_code ||
                booking.request_id?.service ||
                booking.request_id?.service_code ||
                'N/A'
              ).toUpperCase()}
            </p>
              </div>
              {onPrint && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    onPrint(booking);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Customer Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.customer_name || booking.name || sender.fullName || sender.name)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Customer Last Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(
                      booking.customer_last_name || 
                      booking.lastName || 
                      sender.lastName || 
                      (() => {
                        const fullName = booking.customer_name || booking.name || sender.fullName || sender.name || '';
                        const parts = String(fullName).split(' ');
                        return parts.length > 1 ? parts.slice(1).join(' ') : 'N/A';
                      })()
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Customer Phone</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.customer_phone || booking.phone || sender.contactNo || sender.phone)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Sender Address</Label>
                  <p className="text-sm mt-1">
                    {formatValue(
                      booking.sender_address || 
                      booking.senderAddress || 
                      sender.completeAddress || 
                      sender.address ||
                      booking.origin_place || 
                      booking.origin
                    )}
                  </p>
                  {senderCoordinates && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        Location: {senderCoordinates.lat.toFixed(6)}, {senderCoordinates.lng.toFixed(6)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(getGoogleMapsUrl(senderCoordinates.lat, senderCoordinates.lng), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on Maps
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.receiver_name || booking.receiverName || receiver.fullName || receiver.name)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver Address</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.receiver_address || booking.receiverAddress || receiver.completeAddress || receiver.address)}
                  </p>
                  {receiverCoordinates && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        Location: {receiverCoordinates.lat.toFixed(6)}, {receiverCoordinates.lng.toFixed(6)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(getGoogleMapsUrl(receiverCoordinates.lat, receiverCoordinates.lng), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on Maps
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver Phone</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.receiver_phone || booking.receiverPhone || receiver.contactNo || receiver.phone)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Sender Email</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.customer_email || booking.email || sender.emailAddress || sender.email || 'N/A')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver Email</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.receiver_email || booking.receiverEmail || receiver.emailAddress || receiver.email || 'N/A')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Sales Agent Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(
                      sender.agentName ||
                      booking.sales_agent_name || 
                      booking.agentName || 
                      booking.agent?.name || 
                      booking.agent?.full_name || 
                      booking.agent?.fullName ||
                      booking.salesAgent?.name ||
                      booking.salesAgent?.full_name ||
                      booking.salesAgent?.fullName ||
                      booking.created_by_employee?.full_name ||
                      booking.created_by_employee?.fullName ||
                      booking.created_by_employee?.name ||
                      booking.createdByEmployee?.full_name ||
                      booking.createdByEmployee?.fullName ||
                      booking.createdByEmployee?.name ||
                      'N/A'
                    )}
                  </p>
                </div>
                {/* Insurance Information - Only for UAE TO PINAS service when insured is true */}
                {(() => {
                  const serviceCode = booking.service || 
                                    booking.service_code ||
                                    booking.request_id?.service ||
                                    booking.request_id?.service_code ||
                                    '';
                  const isUaeToPinas = isUaeToPinasService(serviceCode);
                  // Check insured in multiple locations: sender object, booking object, request_id
                  const insured = sender.insured || 
                                 booking.insured || 
                                 booking.request_id?.insured ||
                                 booking.request_id?.sender?.insured ||
                                 false;
                  // Check declaredAmount in multiple locations: sender object, booking object, request_id
                  const declaredAmount = sender.declaredAmount || 
                                       sender.declared_amount ||
                                       booking.declaredAmount || 
                                       booking.declared_amount ||
                                       booking.request_id?.declaredAmount ||
                                       booking.request_id?.declared_amount ||
                                       booking.request_id?.sender?.declaredAmount ||
                                       booking.request_id?.sender?.declared_amount ||
                                       null;
                  
                  if (isUaeToPinas && insured === true && declaredAmount) {
                    const amount = parseNumericValue(declaredAmount);
                    return (
                      <div>
                        <Label className="text-sm font-semibold">Insurance</Label>
                        <p className="text-sm mt-1">
                          {amount === 'N/A' ? 'N/A' : `${typeof amount === 'number' ? amount.toFixed(2) : amount} AED`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                {/* OTP Verification */}
                {booking.otpVerification && (
                  <div>
                    <Label className="text-sm font-semibold">OTP Code</Label>
                    <p className="text-sm mt-1">
                      {formatValue(booking.otpVerification.otp || 'N/A')}
                    </p>
                  </div>
                )}
              </div>
              {booking.notes && (
                <div>
                  <Label className="text-sm font-semibold">Notes</Label>
                  <p className="text-sm mt-1">{booking.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Coordinates Section */}
          {(senderCoordinates || receiverCoordinates) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Coordinates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sender Location */}
                  {senderCoordinates && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Sender Location
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getGoogleMapsUrl(senderCoordinates.lat, senderCoordinates.lng), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on Google Maps
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Latitude</Label>
                          <p className="text-sm font-mono">{senderCoordinates.lat.toFixed(6)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Longitude</Label>
                          <p className="text-sm font-mono">{senderCoordinates.lng.toFixed(6)}</p>
                        </div>
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-muted-foreground">Address</Label>
                          <p className="text-sm">
                            {formatValue(
                              booking.sender_address || 
                              booking.senderAddress || 
                              sender.completeAddress || 
                              sender.address ||
                              booking.origin_place || 
                              booking.origin
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Receiver Location */}
                  {receiverCoordinates && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Receiver Location
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getGoogleMapsUrl(receiverCoordinates.lat, receiverCoordinates.lng), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on Google Maps
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Latitude</Label>
                          <p className="text-sm font-mono">{receiverCoordinates.lat.toFixed(6)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Longitude</Label>
                          <p className="text-sm font-mono">{receiverCoordinates.lng.toFixed(6)}</p>
                        </div>
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-muted-foreground">Address</Label>
                          <p className="text-sm">
                            {formatValue(booking.receiver_address || booking.receiverAddress || receiver.completeAddress || receiver.address)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Commodities */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commodities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-2">Commodity</th>
                      <th className="text-left p-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const commodity = it?.commodity || it?.name || it?.description || it?.item || it?.title || 'N/A';
                      const qty = it?.qty || it?.quantity || it?.count || 'N/A';
                      return (
                        <tr key={it?.id || idx} className="border-t">
                          <td className="p-2">{formatValue(commodity)}</td>
                          <td className="p-2">{formatValue(qty)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verification Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ID Front Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    ID Front
                  </Label>
                  {idFrontImage ? (
                    <div 
                      className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in"
                      onClick={() => openImageViewer(idFrontImage, 'ID Front')}
                    >
                      <img
                        src={idFrontImage}
                        alt="ID Front"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video border rounded-md flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">No image available</p>
                    </div>
                  )}
                </div>

                {/* ID Back Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    ID Back
                  </Label>
                  {idBackImage ? (
                    <div 
                      className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in"
                      onClick={() => openImageViewer(idBackImage, 'ID Back')}
                    >
                      <img
                        src={idBackImage}
                        alt="ID Back"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video border rounded-md flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">No image available</p>
                    </div>
                  )}
                </div>

                {/* Philippines ID Front Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Philippines ID Front
                  </Label>
                  {philippinesIdFront ? (
                    <div 
                      className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in"
                      onClick={() => openImageViewer(philippinesIdFront, 'Philippines ID Front')}
                    >
                      <img
                        src={philippinesIdFront}
                        alt="Philippines ID Front"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video border rounded-md flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">No image available</p>
                    </div>
                  )}
                </div>

                {/* Philippines ID Back Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Philippines ID Back
                  </Label>
                  {philippinesIdBack ? (
                    <div 
                      className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in"
                      onClick={() => openImageViewer(philippinesIdBack, 'Philippines ID Back')}
                    >
                      <img
                        src={philippinesIdBack}
                        alt="Philippines ID Back"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video border rounded-md flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">No image available</p>
                    </div>
                  )}
                </div>

                {/* Face Scan Image - Only show if image exists */}
                {faceScanImage && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Face Scan
                    </Label>
                    <div 
                      className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in"
                      onClick={() => openImageViewer(faceScanImage, 'Face Scan')}
                    >
                      <img
                        src={faceScanImage}
                        alt="Face Scan"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Client Face Images (Multiple) */}
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Client Face Images
                  </Label>
                  {customerImages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {customerImages.map((img, idx) => (
                        <div 
                          key={idx}
                          className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in"
                          onClick={() => openImageViewer(img, `Client Face ${idx + 1}`)}
                        >
                          <img
                            src={img}
                            alt={`Client Face ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full border rounded-md flex items-center justify-center text-muted-foreground py-6">
                      <p className="text-sm">No client face images</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!viewOnly && (
            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmitting || booking.review_status === 'reviewed' || booking.review_status === 'rejected'}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isSubmitting || booking.review_status === 'reviewed' || booking.review_status === 'rejected'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Convert to Invoice Request
                  </>
                )}
              </Button>
            </div>
          )}
          {viewOnly && (
            <div className="flex justify-end gap-4 pt-4">
              {onPrint && (
                <Button
                  variant="outline"
                  onClick={() => onPrint(booking)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{viewingImageTitle}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {viewingImage && (
              <div className="relative w-full h-[calc(95vh-120px)] flex items-center justify-center bg-black/5 rounded-md overflow-hidden">
                <img
                  src={viewingImage}
                  alt={viewingImageTitle}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this booking request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Submit Rejection
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

