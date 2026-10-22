'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
  DashboardPageShell,
  ErpToolbar,
  ErpGrid,
} from '@/components/dashboard/maglo-shell';

interface BookingLogItem {
  _id: string;
  awb?: string;
  awb_number?: string;
  tracking_code?: string;
  customer_name?: string;
  receiver_name?: string;
  sender?: {
    fullName?: string;
  };
  receiver?: {
    fullName?: string;
  };
  review_status?: string;
  reviewed_at?: string;
  reviewed_by_employee_id?: string | { _id?: string; full_name?: string; email?: string };
}

interface UserListItem {
  _id: string;
  full_name?: string;
  employee_id?: string | { _id?: string };
}

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
};

const formatTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
};

const getAwb = (booking: BookingLogItem) =>
  booking.awb || booking.awb_number || booking.tracking_code || '-';

const getReviewer = (reviewedBy: BookingLogItem['reviewed_by_employee_id']) => {
  if (!reviewedBy) return '-';
  if (typeof reviewedBy === 'string') return reviewedBy;
  return reviewedBy.full_name || reviewedBy.email || reviewedBy._id || '-';
};

const getCustomerName = (booking: BookingLogItem) =>
  booking.sender?.fullName || booking.customer_name || '-';

const getReceiverName = (booking: BookingLogItem) =>
  booking.receiver?.fullName || booking.receiver_name || '-';

export default function LogsPage() {
  const [bookings, setBookings] = useState<BookingLogItem[]>([]);
  const [reviewerMap, setReviewerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const { department } = useAuth();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const [bookingsResult, usersResult] = await Promise.all([
          apiClient.getAllBookings(undefined, false),
          apiClient.getUsers(false),
        ]);

        if (!bookingsResult.success || !bookingsResult.data) {
          throw new Error((bookingsResult as { error?: string }).error || 'Failed to fetch booking logs');
        }

        const data = Array.isArray(bookingsResult.data) ? (bookingsResult.data as BookingLogItem[]) : [];
        const reviewedOnly = data
          .filter((booking) => booking.reviewed_at || booking.review_status === 'reviewed' || booking.review_status === 'rejected')
          .sort((a, b) => {
            const t1 = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0;
            const t2 = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0;
            return t2 - t1;
          });
        setBookings(reviewedOnly);

        if (usersResult.success && Array.isArray(usersResult.data)) {
          const map: Record<string, string> = {};
          for (const user of usersResult.data as UserListItem[]) {
            if (!user.full_name) continue;
            if (user._id) map[user._id] = user.full_name;
            const employeeId = typeof user.employee_id === 'string' ? user.employee_id : user.employee_id?._id;
            if (employeeId) map[employeeId] = user.full_name;
          }
          setReviewerMap(map);
        }
      } catch (error) {
        console.error('Failed to fetch booking logs:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load booking logs',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [toast]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bookings;

    return bookings.filter((booking) => {
      const searchable = [
        getAwb(booking),
        getCustomerName(booking),
        getReceiverName(booking),
        booking.review_status || '',
        (() => {
          const reviewerRaw = getReviewer(booking.reviewed_by_employee_id);
          return reviewerMap[reviewerRaw] || reviewerRaw;
        })(),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [bookings, search, reviewerMap]);

  if (department && department.name !== 'Management' && department.name !== 'IT') {
    return (
      <DashboardPageShell title="Logs">
        <div className="flex h-48 items-center justify-center px-6 text-sm text-slate-500">
          You do not have access to booking logs.
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell title="Logs">
      <ErpToolbar
        title="Booking logs"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="AWB, customer, reviewer, status…"
      />
      <ErpGrid>
        {loading ? (
          <div className="flex h-36 items-center justify-center text-sm text-slate-500">
            Loading booking logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-36 items-center justify-center text-sm text-slate-500">
            No reviewed booking logs found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AWB</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewed By</TableHead>
                <TableHead>Date (dd/mm/yy)</TableHead>
                <TableHead>Time (hh:mm:ss)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((booking) => (
                <TableRow key={booking._id}>
                  <TableCell className="font-mono text-xs">{getAwb(booking)}</TableCell>
                  <TableCell>{getCustomerName(booking)}</TableCell>
                  <TableCell>{getReceiverName(booking)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 text-[11px] text-slate-600"
                    >
                      {booking.review_status || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const reviewerRaw = getReviewer(booking.reviewed_by_employee_id);
                      return reviewerMap[reviewerRaw] || reviewerRaw;
                    })()}
                  </TableCell>
                  <TableCell>{formatDate(booking.reviewed_at)}</TableCell>
                  <TableCell>{formatTime(booking.reviewed_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ErpGrid>
    </DashboardPageShell>
  );
}
