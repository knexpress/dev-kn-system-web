'use client';

import { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { ACCOUNTING_MODULES } from '@/components/accounting/erp-shell';
import { ACCOUNTING_ROUTES } from '@/components/accounting/erp-format';
import { useAuth } from '@/hooks/use-auth';
import { getNavigationLinks } from '@/lib/navigation';

export type StarredShortcut = {
  href: string;
  title: string;
  description?: string;
};

const storageKey = (userId: string) => `knex.starredShortcuts.${userId}`;

function readStarred(userId: string): StarredShortcut[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.href === 'string' && typeof row.title === 'string');
  } catch {
    return [];
  }
}

function writeStarred(userId: string, items: StarredShortcut[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    // Storage blocked; starring still works for this session.
  }
}

export function iconForShortcut(href: string): LucideIcon {
  if (href === '/dashboard/finance-setup') return SlidersHorizontal;
  const module = ACCOUNTING_MODULES.find((m) => ACCOUNTING_ROUTES[m.id].href === href);
  if (module) return module.icon;
  return SlidersHorizontal;
}

export function useStarredShortcuts() {
  const { userProfile, department } = useAuth();
  const userId = userProfile?._id || 'anon';
  const [starred, setStarred] = useState<StarredShortcut[]>([]);

  useEffect(() => {
    setStarred(readStarred(userId));
  }, [userId]);

  const isStarred = useCallback(
    (href: string) => starred.some((item) => item.href === href),
    [starred]
  );

  const toggle = useCallback(
    (item: StarredShortcut) => {
      setStarred((prev) => {
        const exists = prev.some((row) => row.href === item.href);
        const next = exists ? prev.filter((row) => row.href !== item.href) : [...prev, item];
        writeStarred(userId, next);
        return next;
      });
    },
    [userId]
  );

  const extras = starred.filter(
    (item) => !getNavigationLinks(department).some((link) => link.href === item.href)
  );

  return { starred, extras, isStarred, toggle, iconForShortcut };
}