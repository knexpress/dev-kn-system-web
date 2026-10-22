'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { secureLog } from '@/lib/secure-logger';
import { erpOutlineControlClass, erpPrimaryButtonClass } from '@/components/dashboard/maglo-shell';
import { Loader2 } from 'lucide-react';

type DriveTokenStatus = {
  configured?: boolean;
  source?: 'database' | 'environment' | 'none';
  hint?: string;
  updated_at?: string | null;
  warning?: string | null;
  connection?: { displayName?: string; emailAddress?: string } | null;
};

export function GoogleDriveTokenCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<DriveTokenStatus | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      const result = await apiClient.getGoogleDriveRefreshTokenStatus();
      if (result.success) {
        setStatus((result.data || {}) as DriveTokenStatus);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to load Drive token status',
        });
      }
    } catch (error) {
      secureLog.error('Failed to load Drive token status', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load Drive token status',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextToken = token.trim();
    if (nextToken.length < 20) {
      toast({
        variant: 'destructive',
        title: 'Invalid token',
        description: 'Paste the full Google Drive refresh token.',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.setGoogleDriveRefreshToken(nextToken);
      if (result.success) {
        setStatus((result.data || {}) as DriveTokenStatus);
        setToken('');
        toast({
          title: (result.data as DriveTokenStatus | undefined)?.warning ? 'Token saved with warning' : 'Token updated',
          description: result.message || 'Google Drive refresh token updated.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update refresh token',
        });
      }
    } catch (error) {
      secureLog.error('Failed to update Drive refresh token', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update refresh token',
      });
    } finally {
      setSaving(false);
    }
  };

  const sourceLabel =
    status?.source === 'database'
      ? 'Saved in system'
      : status?.source === 'environment'
        ? 'From environment'
        : 'Not set';

  return (
    <div className="max-w-xl space-y-5 px-5 py-6 sm:px-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Google Drive refresh token</h3>
        <p className="mt-1 text-sm text-slate-500">
          Super Admin only. The new token is stored in system settings and used immediately for booking PDF uploads. The full token is never shown again.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading current token status…
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600">Current token</span>
            <Badge variant={status?.configured ? 'default' : 'secondary'}>
              {status?.configured ? 'Configured' : 'Missing'}
            </Badge>
            <span className="text-slate-400">{sourceLabel}</span>
          </div>
          {status?.hint ? (
            <p className="mt-2 font-mono text-xs text-slate-600">{status.hint}</p>
          ) : null}
          {status?.updated_at ? (
            <p className="mt-1 text-xs text-slate-400">
              Last updated {new Date(status.updated_at).toLocaleString()}
            </p>
          ) : null}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Label htmlFor="drive_refresh_token">New refresh token</Label>
          <Textarea
            id="drive_refresh_token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste GOOGLE_DRIVE_REFRESH_TOKEN"
            autoComplete="off"
            spellCheck={false}
            rows={4}
            className={erpOutlineControlClass()}
          />
        </div>
        <Button
          type="submit"
          disabled={saving || token.trim().length < 20}
          className={erpPrimaryButtonClass()}
        >
          {saving ? 'Saving…' : 'Update refresh token'}
        </Button>
      </form>
    </div>
  );
}
