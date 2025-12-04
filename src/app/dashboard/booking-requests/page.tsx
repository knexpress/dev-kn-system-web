'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { apiCache } from '@/lib/api-cache';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Eye, CheckCircle, XCircle, Image as ImageIcon, Printer } from 'lucide-react';
import BookingReviewModal from '@/components/booking-review-modal';
import BookingPrintView from '@/components/booking-print-view';

export default function BookingRequestsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('not reviewed'); // Default to showing only unreviewed
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [bookingToPrint, setBookingToPrint] = useState<any>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  const fetchBookings = async (useCache: boolean = true) => {
    try {
      // Check cache first for instant display
      const cacheKey = filterStatus === 'all' ? '/bookings' : `/bookings/status/${filterStatus}`;
      const cached = apiCache.get(cacheKey, {});
      
      if (cached && cached.success && cached.data && useCache) {
        // Show cached data immediately
        const bookingData = Array.isArray(cached.data) ? cached.data : [];
        setBookings(bookingData);
        setLoading(false);
        
        // Continue fetching fresh data in background (stale-while-revalidate)
        // Don't set loading to true to avoid flicker
      } else {
        setLoading(true);
      }

      let result;
      
      if (filterStatus === 'all') {
        result = await apiClient.getBookings(useCache);
      } else {
        result = await apiClient.getBookingsByStatus(filterStatus, useCache);
      }

      if (result.success) {
        const bookingData = Array.isArray(result.data) ? result.data : [];
        setBookings(bookingData);
      } else {
        // Only show error if we don't have cached data
        if (!cached || !cached.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error || 'Failed to fetch bookings',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Only show error if we don't have cached data
      const cacheKey = filterStatus === 'all' ? '/bookings' : `/bookings/status/${filterStatus}`;
      const cached = apiCache.get(cacheKey, {});
      if (!cached || !cached.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch bookings',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (booking: any) => {
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  const handleView = (booking: any) => {
    setSelectedBooking(booking);
    setShowViewModal(true);
  };

  const handleReviewComplete = () => {
    setShowReviewModal(false);
    setSelectedBooking(null);
    // Invalidate cache and fetch fresh data
    apiCache.invalidate('/bookings');
    fetchBookings(false); // Don't use cache, get fresh data
  };

  const handlePrint = (booking: any) => {
    setBookingToPrint(booking);
    setShowPrintView(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'not reviewed': { label: 'Not Reviewed', variant: 'secondary' },
      'reviewed': { label: 'Reviewed', variant: 'default' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };

    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  // Helper: get a field by trying multiple aliases (case-insensitive, supports loose matching)
  const getField = (obj: any, aliases: string[]): any => {
    if (!obj || typeof obj !== 'object') return undefined;
    
    // Try exact matches first (all variations)
    for (const alias of aliases) {
      if (obj[alias] !== undefined && obj[alias] !== null && obj[alias] !== '') {
        return obj[alias];
      }
    }
    
    // Try case-insensitive matches
    const objKeys = Object.keys(obj);
    for (const alias of aliases) {
      const lowerAlias = alias.toLowerCase();
      const foundKey = objKeys.find(k => k.toLowerCase() === lowerAlias);
      if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && obj[foundKey] !== '') {
        return obj[foundKey];
      }
    }
    
    // Try partial matches (contains)
    for (const alias of aliases) {
      const parts = alias.toLowerCase().split('_');
      for (const part of parts) {
        const foundKey = objKeys.find(k => k.toLowerCase().includes(part));
        if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && obj[foundKey] !== '') {
          return obj[foundKey];
        }
      }
    }
    
    return undefined;
  };

  // Helper: format any value into a safe, readable string for table cells
  const formatValue = (value: any): string => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) return value.toLocaleString();

    // If it's an object, try common readable fields
    if (typeof value === 'object') {
      const obj = value as Record<string, any>;
      // Common person/company fields
      if (obj.fullName) return String(obj.fullName);
      if (obj.name) return String(obj.name);
      if (obj.firstName || obj.lastName) return [obj.firstName, obj.lastName].filter(Boolean).join(' ').trim() || 'N/A';
      if (obj.company || obj.companyName) return String(obj.company || obj.companyName);
      if (obj.email || obj.emailAddress) return String(obj.email || obj.emailAddress);
      if (obj.contactNo || obj.phone || obj.phoneNumber) return String(obj.contactNo || obj.phone || obj.phoneNumber);
      if (obj.completeAddress || obj.address) return String(obj.completeAddress || obj.address);

      // If numbers/strings inside, try to build a compact string
      const primitiveEntries = Object.entries(obj)
        .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`);
      if (primitiveEntries.length > 0) return primitiveEntries.join(', ');

      // Fallback to compact JSON
      try {
        const s = JSON.stringify(obj);
        return s.length > 120 ? s.slice(0, 117) + '...' : s;
      } catch {
        return 'Object';
      }
    }

    // Arrays or other types
    try {
      const s = JSON.stringify(value);
      return s.length > 120 ? s.slice(0, 117) + '...' : s;
    } catch {
      return String(value);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filterStatus === 'all') {
      // When showing all, still exclude reviewed bookings by default
      return booking.review_status !== 'reviewed';
    }
    return booking.review_status === filterStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not reviewed">Not Reviewed</SelectItem>
                <SelectItem value="all">All (Excluding Reviewed)</SelectItem>
                <SelectItem value="reviewed">Reviewed (Archive)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No bookings found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Receiver Name</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Shipment Type</TableHead>
                    <TableHead>Review Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking._id}>
                      <TableCell className="font-medium">
                      {formatValue(getField(booking, ['customer_name','customerName','name','full_name','sender_name','customer','sender']))}
                      </TableCell>
                      <TableCell>
                      {formatValue(getField(booking, ['receiver_name','receiverName','consignee_name','to_name','receiver','consignee']))}
                      </TableCell>
                      <TableCell>
                      {formatValue(
                        getField(booking, ['origin_place','origin','from','pickup_location','pickup_city','pickup'])
                        || booking.sender?.completeAddress
                        || booking.sender?.address
                        || booking.sender?.city
                      )}
                      </TableCell>
                      <TableCell>
                      {formatValue(
                        getField(booking, ['destination_place','destination','to','delivery_location','delivery_city','dropoff','delivery'])
                        || booking.receiver?.completeAddress
                        || booking.receiver?.address
                        || booking.receiver?.city
                      )}
                      </TableCell>
                      <TableCell>
                      {formatValue(getField(booking, ['shipment_type','shipmentType','service_type','service']))}
                      </TableCell>
                    <TableCell>
                      {getStatusBadge(booking.review_status || 'not reviewed')}
                    </TableCell>
                    <TableCell>
                      {booking.submittedAt
                        ? new Date(booking.submittedAt).toLocaleDateString()
                        : booking.createdAt
                        ? new Date(booking.createdAt).toLocaleDateString()
                        : booking.created_at
                        ? new Date(booking.created_at).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(booking)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(booking)}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReview(booking)}
                            disabled={booking.review_status === 'reviewed'}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showReviewModal && selectedBooking && (
        <BookingReviewModal
          booking={selectedBooking}
          open={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
          }}
          onReviewComplete={handleReviewComplete}
          currentUser={userProfile}
        />
      )}

      {showViewModal && selectedBooking && (
        <BookingReviewModal
          booking={selectedBooking}
          open={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedBooking(null);
          }}
          onReviewComplete={() => {
            setShowViewModal(false);
            setSelectedBooking(null);
          }}
          currentUser={userProfile}
          viewOnly={true}
        />
      )}

      {showPrintView && bookingToPrint && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="absolute top-4 right-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPrintView(false);
                setBookingToPrint(null);
              }}
            >
              Close
            </Button>
          </div>
          <BookingPrintView booking={bookingToPrint} onClose={() => {
            setShowPrintView(false);
            setBookingToPrint(null);
          }} />
        </div>
      )}
    </div>
  );
}

