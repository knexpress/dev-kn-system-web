'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, type AppNotification } from '@/lib/api-client';
import { playAlertChime, primeAlertChime } from '@/lib/alert-chime';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

interface NotificationCounts {
  invoices: number;
  invoiceRequests: number;
  requests: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  items: AppNotification[];
  unreadCount: number;
  updateCount: (type: keyof NotificationCounts, count: number) => void;
  incrementCount: (type: keyof NotificationCounts) => void;
  decrementCount: (type: keyof NotificationCounts) => void;
  clearCount: (type: keyof NotificationCounts) => Promise<void>;
  refreshCounts: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const POLL_INTERVAL = 12000;

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

function countsFromItems(rows: AppNotification[]): NotificationCounts {
  const unread = rows.filter((row) => !row.is_read);
  return {
    invoices: unread.filter((row) => row.type === 'invoice' || row.type === 'collection').length,
    invoiceRequests: unread.filter((row) => row.type === 'invoice_request' || row.type === 'quotation_request').length,
    requests: unread.filter((row) => row.type === 'request').length,
  };
}

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [counts, setCounts] = useState<NotificationCounts>({
    invoices: 0,
    invoiceRequests: 0,
    requests: 0,
  });
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);
  const readyRef = useRef(false);

  const applyItems = useCallback((rows: AppNotification[], announce: boolean) => {
    setItems(rows);
    setCounts(countsFromItems(rows));
    setUnreadCount(rows.filter((row) => !row.is_read).length);

    const fresh = rows.filter((row) => !seenIdsRef.current.has(row._id));
    fresh.forEach((row) => seenIdsRef.current.add(row._id));
    if (!announce || !fresh.length) return;

    const unreadFresh = fresh.filter((row) => !row.is_read);
    if (!unreadFresh.length) return;

    playAlertChime();
    const first = unreadFresh[0];
    toast({
      title: unreadFresh.length > 1 ? `${unreadFresh.length} new requests` : first.title,
      description:
        unreadFresh.length > 1
          ? unreadFresh.slice(0, 3).map((row) => row.message).join(' · ')
          : first.message,
      action: first.href ? (
        <ToastAction altText="Open" onClick={() => router.push(first.href as string)}>
          Open
        </ToastAction>
      ) : undefined,
    });
  }, [router, toast]);

  const refreshCounts = useCallback(async (announce = true) => {
    const result = await apiClient.getNotifications();
    if (!result.success || !result.data) {
      setIsLoading(false);
      return;
    }
    const payload = result.data as { items?: AppNotification[]; unread?: number } | AppNotification[];
    const rows = Array.isArray(payload) ? payload : (payload.items || []);
    applyItems(rows, Boolean(announce && primedRef.current && readyRef.current));
    readyRef.current = true;
    if (typeof (payload as { unread?: number }).unread === 'number') {
      setUnreadCount((payload as { unread: number }).unread);
    }
    setIsLoading(false);
  }, [applyItems]);

  const updateCount = useCallback((type: keyof NotificationCounts, count: number) => {
    setCounts((prev) => ({ ...prev, [type]: count }));
  }, []);

  const incrementCount = useCallback((type: keyof NotificationCounts) => {
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
  }, []);

  const decrementCount = useCallback((type: keyof NotificationCounts) => {
    setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
  }, []);

  const clearCount = useCallback(async (type: keyof NotificationCounts) => {
    await apiClient.markAllAsViewed(type);
    await refreshCounts(false);
  }, [refreshCounts]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((row) => (row._id === id ? { ...row, is_read: true } : row)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await apiClient.markNotificationRead(id);
    await refreshCounts(false);
  }, [refreshCounts]);

  const markAllRead = useCallback(async () => {
    await apiClient.markAllAsViewed();
    await refreshCounts(false);
  }, [refreshCounts]);

  useEffect(() => {
    const unlock = () => {
      primedRef.current = true;
      primeAlertChime();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active) return;
      await refreshCounts(primedRef.current);
    };
    poll();
    const timer = window.setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshCounts]);

  const value: NotificationContextType = useMemo(() => ({
    counts,
    items,
    unreadCount,
    updateCount,
    incrementCount,
    decrementCount,
    clearCount,
    refreshCounts: () => refreshCounts(false),
    markRead,
    markAllRead,
    isLoading,
  }), [counts, items, unreadCount, updateCount, incrementCount, decrementCount, clearCount, refreshCounts, markRead, markAllRead, isLoading]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
