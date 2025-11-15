'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

interface NotificationCounts {
  invoices: number;
  chat: number;
  tickets: number;
  invoiceRequests: number;
  requests: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  updateCount: (type: keyof NotificationCounts, count: number) => void;
  incrementCount: (type: keyof NotificationCounts) => void;
  decrementCount: (type: keyof NotificationCounts) => void;
  clearCount: (type: keyof NotificationCounts) => Promise<void>;
  refreshCounts: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [counts, setCounts] = useState<NotificationCounts>({
    invoices: 0,
    chat: 0,
    tickets: 0,
    invoiceRequests: 0,
    requests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const updateCount = (type: keyof NotificationCounts, count: number) => {
    setCounts(prev => ({
      ...prev,
      [type]: count,
    }));
  };

  const incrementCount = (type: keyof NotificationCounts) => {
    setCounts(prev => ({
      ...prev,
      [type]: prev[type] + 1,
    }));
  };

  const decrementCount = (type: keyof NotificationCounts) => {
    setCounts(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] - 1),
    }));
  };

  const clearCount = async (type: keyof NotificationCounts) => {
    // First update local state immediately for better UX
    setCounts(prev => ({
      ...prev,
      [type]: 0,
    }));
    
    // Then call backend API to mark all notifications of this type as viewed
    try {
      await apiClient.markAllAsViewed(type);
      console.log(`✅ Marked all ${type} notifications as viewed`);
    } catch (error) {
      console.error(`❌ Failed to mark ${type} notifications as viewed:`, error);
      // If the API call fails, we could optionally revert the local state
      // But for now, we'll keep the optimistic update
    }
  };

  const refreshCounts = async () => {
    // Prevent too frequent calls (minimum 30 seconds between calls)
    const now = Date.now();
    if (now - lastFetchTime < 30000) {
      console.log('Skipping notification refresh - too frequent');
      return;
    }

    try {
      setIsLoading(true);
      setLastFetchTime(now);
      const response = await apiClient.getNotificationCounts();
      if (response.success && response.data) {
        console.log('🔔 Notification counts received:', response.data);
        setCounts(response.data as NotificationCounts);
      } else {
        console.log('❌ Failed to get notification counts:', response);
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      // If rate limited, don't show error to user, just silently fail
      if (error instanceof Error && error.message.includes('429')) {
        console.log('Rate limited, skipping notification refresh');
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch counts on mount and set up periodic refresh
  useEffect(() => {
    refreshCounts();
    
    // Refresh counts every 2 minutes (further reduced frequency to avoid rate limiting)
    const interval = setInterval(refreshCounts, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const value: NotificationContextType = {
    counts,
    updateCount,
    incrementCount,
    decrementCount,
    clearCount,
    refreshCounts,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
