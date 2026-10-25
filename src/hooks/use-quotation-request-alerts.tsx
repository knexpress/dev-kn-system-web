'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

const SEEN_KEY = 'quotationRequests:seen';
const POLL_INTERVAL = 15000;

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    // Storage full or blocked; pending count still updates
  }
}

/** Polls Operations quotation requests for Finance so the nav badge stays in sync. Sound/toast come from NotificationContext. */
export function useQuotationRequestAlerts(enabled: boolean) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setPendingCount(0);
      return;
    }
    let active = true;

    const poll = async () => {
      const res = await apiClient.getQuotationRequests({ stage: 'REQUESTED', summary: true });
      if (!active || !res.success || !Array.isArray(res.data)) return;
      const rows = res.data as any[];
      setPendingCount(rows.length);
      const seen = new Set(readSeen());
      writeSeen(rows.map((row) => String(row._id)));
      if (rows.some((row) => !seen.has(String(row._id)))) {
        window.dispatchEvent(new CustomEvent('quotation-requests:updated'));
      }
    };

    poll();
    const timer = window.setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return { pendingCount };
}
