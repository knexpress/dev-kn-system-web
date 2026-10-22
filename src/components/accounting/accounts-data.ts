import { COA } from '@/lib/coa-codes';

export type AccountPreview = {
  code: string;
  name: string;
  type: string;
  subtype: string;
  active: boolean;
};

export const PLACEHOLDER_ACCOUNTS: AccountPreview[] = [
  { code: COA.bank, name: 'ADCB', type: 'Asset', subtype: 'Bank', active: true },
  { code: COA.cash, name: 'Cash in Hand', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: COA.inventory, name: 'Inventory', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: COA.ar, name: 'Accounts Receivable', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: COA.vatInput, name: 'Input Vat', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: COA.ap, name: 'Accounts Payable', type: 'Liability', subtype: 'Current Liability', active: true },
  { code: COA.vat, name: 'Output Vat', type: 'Liability', subtype: 'Current Liability', active: true },
  { code: '30030', name: 'Owner A Share Capital', type: 'Equity', subtype: 'Equity', active: true },
  { code: COA.revenue, name: 'Sales - Shipping Charge', type: 'Revenue', subtype: 'Revenue', active: true },
  { code: COA.cogs, name: 'Cost of Goods Sold', type: 'Expense', subtype: 'Direct Costs', active: true },
  { code: COA.pettyExpense, name: 'Office Expenses', type: 'Expense', subtype: 'Expense', active: true },
];

export function findAccountByCode(code: string): AccountPreview | undefined {
  return PLACEHOLDER_ACCOUNTS.find((a) => a.code === code);
}
