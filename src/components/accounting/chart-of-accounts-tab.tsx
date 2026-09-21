'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { AccountPreview } from './accounts-data';
import AddAccountDialog from './add-account-dialog';

type ChartOfAccountsTabProps = {
  onAccountClick?: (account: AccountPreview) => void;
};

export default function ChartOfAccountsTab({ onAccountClick }: ChartOfAccountsTabProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getAccounts();
      if (result.success && Array.isArray(result.data)) {
        setAccounts(result.data);
      } else {
        setAccounts([]);
        setError(result.error || 'Failed to load accounts');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>
              Click an account to open its ledger.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subtype</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No accounts found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow
                      key={account._id || account.code}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                      onClick={() =>
                        onAccountClick?.({
                          code: account.code,
                          name: account.name,
                          type: account.type,
                          subtype: account.subtype || '',
                          active: account.is_active !== false,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onAccountClick?.({
                            code: account.code,
                            name: account.name,
                            type: account.type,
                            subtype: account.subtype || '',
                            active: account.is_active !== false,
                          });
                        }
                      }}
                    >
                      <TableCell className="font-mono font-medium text-primary">{account.code}</TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.type}</TableCell>
                      <TableCell>{account.subtype || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {account.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={load}
      />
    </>
  );
}
