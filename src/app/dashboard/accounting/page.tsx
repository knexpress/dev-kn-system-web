'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, BookOpen } from 'lucide-react';
import ChartOfAccountsTab from '@/components/accounting/chart-of-accounts-tab';
import GeneralLedgerTab from '@/components/accounting/general-ledger-tab';
import InventoryTab from '@/components/accounting/inventory-tab';
import FinancialReportsTab from '@/components/accounting/financial-reports-tab';
import type { AccountPreview } from '@/components/accounting/accounts-data';

const ALLOWED_DEPARTMENTS = new Set(['Finance', 'Management', 'Auditor', 'IT']);

export default function AccountingPage() {
  const { userProfile } = useAuth();
  const departmentName = userProfile?.department?.name;
  const [mainTab, setMainTab] = useState('coa');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string | null>(null);
  const [glSubTab, setGlSubTab] = useState<'journals' | 'ledger'>('journals');

  const handleAccountClick = (account: AccountPreview) => {
    setSelectedAccountCode(account.code);
    setGlSubTab('ledger');
    setMainTab('gl');
  };

  if (departmentName && !ALLOWED_DEPARTMENTS.has(departmentName)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Accounting is available to Finance, Management, Auditor, and IT users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Chart of Accounts, General Ledger, Inventory, and financial reports — click through
            reports and stock to ledgers and journals.
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="gl">General Ledger</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <ChartOfAccountsTab onAccountClick={handleAccountClick} />
        </TabsContent>
        <TabsContent value="gl">
          <GeneralLedgerTab
            selectedAccountCode={selectedAccountCode}
            initialSubTab={glSubTab}
          />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
        <TabsContent value="reports">
          <FinancialReportsTab onAccountClick={handleAccountClick} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
