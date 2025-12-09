'use client';

import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/api-client';

type ActivityMap = Record<string, string>;
type HasNewMap = Record<string, boolean>;

const LOCAL_KEY = 'activity:lastSeen';
const POLL_INTERVAL = 30000; // 30s

// Tabs we track; keys should match backend response
const TRACKED_KEYS = [
  'requests',
  'invoice_requests',
  'invoices',
  'delivery_assignments',
  'tickets',
  'collections',
  'jobs',
  'cash_flow',
  'reports',
];

export function useActivityBadges() {
  const [lastUpdated, setLastUpdated] = useState<ActivityMap>({});
  const [lastSeen, setLastSeen] = useState<ActivityMap>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as ActivityMap) : {};
    } catch {
      return {};
    }
  });

  const hasNew: HasNewMap = useMemo(() => {
    const result: HasNewMap = {};
    TRACKED_KEYS.forEach((key) => {
      const lu = lastUpdated[key];
      if (!lu) {
        result[key] = false;
        return;
      }
      const ls = lastSeen[key];
      result[key] = !ls || new Date(lu) > new Date(ls);
    });
    return result;
  }, [lastUpdated, lastSeen]);

  // Poll backend for last-updated timestamps
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const fetchData = async () => {
      const res = await apiClient.getActivityLastUpdated();
      if (!isMounted) return;
      if (res.success && res.data && typeof res.data === 'object') {
        setLastUpdated(res.data as ActivityMap);
      }
    };

    fetchData();
    timer = setInterval(fetchData, POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const markSeen = (key: string) => {
    const now = new Date().toISOString();
    setLastSeen((prev) => {
      const next = { ...prev, [key]: now };
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage errors to avoid crashes
        }
      }
      return next;
    });
  };

  return { hasNew, markSeen };
}

