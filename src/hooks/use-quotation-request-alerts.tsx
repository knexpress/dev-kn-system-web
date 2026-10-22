'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

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
    // Storage full or blocked; alerts may repeat but nothing breaks
  }
}

/** Three-note chime synthesised with Web Audio, so no sound asset is needed. */
export function playQuotationChime() {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    ctx.resume().catch(() => {});
    [880, 1174.66, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.16;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    // Audio blocked until the user interacts with the page
  }
}

/** Polls Operations quotation requests for Finance and alerts (sound + toast) on new ones. */
export function useQuotationRequestAlerts(enabled: boolean) {
  const { toast } = useToast();
  const router = useRouter();
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
      const fresh = rows.filter((row) => !seen.has(String(row._id)));
      writeSeen(rows.map((row) => String(row._id)));
      if (!fresh.length) return;

      playQuotationChime();
      const first = fresh[0];
      const awb = first.tracking_code || first.awb_number || '';
      toast({
        title: fresh.length > 1 ? `${fresh.length} new quotation requests` : 'New quotation request',
        description:
          fresh.length > 1
            ? 'Operations sent shipments that need a quotation.'
            : `${awb ? `AWB ${awb} · ` : ''}${first.customer_name || 'Customer'} needs a quotation.`,
        action: (
          <ToastAction altText="Open quotations" onClick={() => router.push('/dashboard/quotations')}>
            Open
          </ToastAction>
        ),
      });
      window.dispatchEvent(new CustomEvent('quotation-requests:updated'));
    };

    poll();
    const timer = window.setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, toast, router]);

  return { pendingCount };
}
