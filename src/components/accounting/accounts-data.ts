export type AccountPreview = {
  code: string;
  name: string;
  type: string;
  subtype: string;
  active: boolean;
};

export const PLACEHOLDER_ACCOUNTS: AccountPreview[] = [
  { code: '1000', name: 'Cash', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: '1100', name: 'Cash at Bank', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: '1200', name: 'Inventory', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: '1300', name: 'Accounts Receivable', type: 'Asset', subtype: 'Current Asset', active: true },
  { code: '1310', name: 'VAT Input Recoverable', type: 'Asset', subtype: 'Tax', active: true },
  { code: '2000', name: 'Accounts Payable', type: 'Liability', subtype: 'Current Liability', active: true },
  { code: '2200', name: 'VAT Output Payable', type: 'Liability', subtype: 'Tax', active: true },
  { code: '3000', name: 'Owner Equity', type: 'Equity', subtype: 'Equity', active: true },
  { code: '4000', name: 'Sales Revenue', type: 'Revenue', subtype: 'Operating Revenue', active: true },
  { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', subtype: 'COGS', active: true },
  { code: '6000', name: 'Operating Expenses', type: 'Expense', subtype: 'Operating Expense', active: true },
];

export function findAccountByCode(code: string): AccountPreview | undefined {
  return PLACEHOLDER_ACCOUNTS.find((a) => a.code === code);
}
