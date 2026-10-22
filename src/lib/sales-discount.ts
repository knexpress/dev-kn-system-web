export type SalesDiscountType = 'PERCENT' | 'AMOUNT' | '';

export function computeSalesDiscount(shipping: number, type?: string | null, value?: number | string | null) {
  const kind = String(type || '').toUpperCase();
  const entered = Number(value) || 0;
  const ship = Math.round((Number(shipping) || 0) * 100) / 100;
  if (!(entered > 0) || !(ship > 0)) {
    return { type: '' as SalesDiscountType, value: 0, amount: 0 };
  }
  if (kind === 'PERCENT') {
    const pct = Math.min(entered, 100);
    return {
      type: 'PERCENT' as const,
      value: Math.round(pct * 100) / 100,
      amount: Math.round(ship * (pct / 100) * 100) / 100,
    };
  }
  if (kind === 'AMOUNT') {
    const amt = Math.min(entered, ship);
    const rounded = Math.round(amt * 100) / 100;
    return { type: 'AMOUNT' as const, value: rounded, amount: rounded };
  }
  return { type: '' as SalesDiscountType, value: 0, amount: 0 };
}

export function salesDiscountLabel(type?: string | null, value?: number | null, amount?: number | null) {
  if (!(Number(amount) > 0)) return '';
  if (String(type || '').toUpperCase() === 'PERCENT' && Number(value) > 0) {
    return `Sales Discount (${Number(value)}%)`;
  }
  return 'Sales Discount';
}
