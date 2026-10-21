/** Staging KNEX 5-digit chart — keep in sync with backend data/knex-chart-of-accounts.js */

export const LEGACY_TO_FIVE: Record<string, string> = {
  '1000': '10200',
  '1020': '10220',
  '1100': '10100',
  '1200': '12000',
  '1300': '11000',
  '1310': '12100',
  '1320': '11030',
  '1330': '11020',
  '1500': '15000',
  '1510': '15090',
  '2000': '21010',
  '2200': '22000',
  '2210': '22010',
  '2310': '21020',
  '4000': '40000',
  '4010': '40000',
  '4020': '40010',
  '4030': '40020',
  '4040': '40050',
  '4900': '69060',
  '5000': '50000',
  '5100': '60170',
  '5200': '60080',
};

const useFiveDigit =
  String(process.env.NEXT_PUBLIC_COA_CODE_LENGTH || '5').trim() !== '4';

export function glCode(legacy: string): string {
  const key = String(legacy || '').trim();
  if (useFiveDigit) return LEGACY_TO_FIVE[key] || key;
  return key;
}

export const COA = {
  cash: glCode('1000'),
  bank: glCode('1100'),
  inventory: glCode('1200'),
  ar: glCode('1300'),
  vatInput: glCode('1310'),
  ap: glCode('2000'),
  vat: glCode('2200'),
  revenue: glCode('4000'),
  cogs: glCode('5000'),
  pettyExpense: glCode('5100'),
  depr: glCode('5200'),
  fixedAsset: glCode('1500'),
  accumDepr: glCode('1510'),
};