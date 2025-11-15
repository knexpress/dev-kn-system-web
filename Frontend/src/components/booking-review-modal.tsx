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
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface BookingReviewModalProps {
  booking: any;
  open: boolean;
  onClose: () => void;
  onReviewComplete: () => void;
  currentUser: any;
}

export default function BookingReviewModal({
  booking,
  open,
  onClose,
  onReviewComplete,
  currentUser,
}: BookingReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    booking.identityDocuments?.philippinesIdFront
    || booking.collections?.identityDocuments?.philippinesIdFront
  );
  const philippinesIdBack = getImageSrc(
    booking.identityDocuments?.philippinesIdBack
    || booking.collections?.identityDocuments?.philippinesIdBack
  );
  const faceScanImage = getImageSrc(
    booking.face_scan_image 
    || booking.faceScanImage
  );

  const customerImages: string[] = (
    Array.isArray(booking.customerImages) ? booking.customerImages :
    Array.isArray(booking.identityDocuments?.customerImages) ? booking.identityDocuments.customerImages :
    Array.isArray(booking.collections?.identityDocuments?.customerImages) ? booking.collections.identityDocuments.customerImages :
    []
  ).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Booking Request</DialogTitle>
          <DialogDescription>
            Review booking details and images before approving
          </DialogDescription>
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
                  <Label className="text-sm font-semibold">Customer First Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(sender.firstName || booking.customer_first_name || booking.firstName)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Customer Last Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(sender.lastName || booking.customer_last_name || booking.lastName)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Customer Phone</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.customer_phone || booking.phone || sender.contactNo || sender.phone)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver First Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(receiver.firstName || booking.receiver_first_name)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver Last Name</Label>
                  <p className="text-sm mt-1">
                    {formatValue(receiver.lastName || booking.receiver_last_name)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver Address</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.receiver_address || booking.receiverAddress || receiver.completeAddress || receiver.address)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Receiver Phone</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.receiver_phone || booking.receiverPhone || receiver.contactNo || receiver.phone)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Origin</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.origin_place || booking.origin || sender.completeAddress || sender.address)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Destination</Label>
                  <p className="text-sm mt-1">
                    {formatValue(booking.destination_place || booking.destination || receiver.completeAddress || receiver.address)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Created At</Label>
                  <p className="text-sm mt-1">
                    {booking.submittedAt
                      ? new Date(booking.submittedAt).toLocaleString()
                      : booking.createdAt
                      ? new Date(booking.createdAt).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Items */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items ({items.length})</CardTitle>
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
                      const commodity = it?.commodity || it?.name || it?.description || it?.item || it?.title || `Item ${idx + 1}`;
                      const qty = it?.quantity || it?.qty || it?.count || 'N/A';
                      return (
                        <tr key={idx} className="border-t">
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
                {/* Note: Grid will expand to accommodate all images */}
                {/* ID Front Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    ID Front
                  </Label>
                  {idFrontImage ? (
                    <a href={idFrontImage} target="_blank" rel="noopener noreferrer">
                      <div className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in">
                        <img
                          src={idFrontImage}
                          alt="ID Front"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </a>
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
                    <a href={idBackImage} target="_blank" rel="noopener noreferrer">
                      <div className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in">
                        <img
                          src={idBackImage}
                          alt="ID Back"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </a>
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
                    <a href={philippinesIdFront} target="_blank" rel="noopener noreferrer">
                      <div className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in">
                        <img
                          src={philippinesIdFront}
                          alt="Philippines ID Front"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </a>
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
                    <a href={philippinesIdBack} target="_blank" rel="noopener noreferrer">
                      <div className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in">
                        <img
                          src={philippinesIdBack}
                          alt="Philippines ID Back"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </a>
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
                    <a href={faceScanImage} target="_blank" rel="noopener noreferrer">
                      <div className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in">
                        <img
                          src={faceScanImage}
                          alt="Face Scan"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </a>
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
                        <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                          <div className="relative w-full aspect-video border rounded-md overflow-hidden cursor-zoom-in">
                            <img
                              src={img}
                              alt={`Client Face ${idx + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </a>
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
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting || booking.review_status === 'reviewed'}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

