/** VAT-inclusive Tabby / Card fee shown as an extra invoice line after payment. */

export type InvoiceGatewayChargeLine = {
  label: string;
  /** Gross fee (VAT-inclusive), e.g. 4% or 10% of the settled amount. */
  gross: number;
  /** Ex-VAT amount booked to Payment Gateway Revenue (4040). */
  net: number;
  /** VAT portion booked to VAT output (2200). */
  vat: number;
  /** Unit price with extra precision for the description column (gross ÷ 1.05). */
  unitPrice: number;
  /**
   * true = fee was carved out of the invoice total (prepaid UAE→PH).
   * false = fee was collected on top of the invoice (record payment).
   */
  includedInTotal: boolean;
  mode: 'TABBY' | 'CARD';
};

const GATEWAY_VAT_RATE = 0.05;

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function modeLabel(mode: string): { label: string; key: 'TABBY' | 'CARD' } | null {
  const key = String(mode || '').toUpperCase();
  if (key === 'TABBY') return { label: 'Tabby charges', key: 'TABBY' };
  if (key === 'CARD') return { label: 'Card payment charges', key: 'CARD' };
  return null;
}

function fromGross(gross: number, mode: string, includedInTotal: boolean): InvoiceGatewayChargeLine | null {
  const named = modeLabel(mode);
  const g = round2(gross);
  if (!named || !(g > 0)) return null;
  const unitPrice = g / (1 + GATEWAY_VAT_RATE);
  const net = round2(unitPrice);
  const vat = round2(g - net);
  return {
    label: named.label,
    gross: g,
    net,
    vat,
    unitPrice,
    includedInTotal,
    mode: named.key,
  };
}

/**
 * Build the gateway charge line for a paid invoice.
 * Prefers posted payment rows; falls back to prepaid carve stored on gl_sync.
 */
export function gatewayChargeLineFromInvoice(invoice: any): InvoiceGatewayChargeLine | null {
  if (!invoice || invoice.status === 'CANCELLED') return null;

  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const active = payments.filter((p: any) => String(p?.status || 'POSTED').toUpperCase() !== 'VOID');
  let gross = 0;
  let net = 0;
  let vat = 0;
  let mode =
    invoice.payment_mode ||
    active.find((p: any) => p?.mode)?.mode ||
    invoice.gl_sync?.gateway_included_mode ||
    '';

  for (const p of active) {
    const g = Number(p?.gateway_charge) || 0;
    if (!(g > 0)) continue;
    gross = round2(gross + g);
    net = round2(net + (Number(p?.gateway_net) || 0));
    vat = round2(vat + (Number(p?.gateway_vat) || 0));
    if (p?.mode) mode = p.mode;
  }

  if (gross > 0) {
    const named = modeLabel(mode);
    if (!named) return null;
    // Prefer stored net/vat; recompute if a legacy payment only has the gross.
    if (!(net > 0) || Math.abs(round2(net + vat) - gross) > 0.02) {
      return fromGross(gross, mode, false);
    }
    return {
      label: named.label,
      gross,
      net,
      vat: vat > 0 ? vat : round2(gross - net),
      unitPrice: gross / (1 + GATEWAY_VAT_RATE),
      includedInTotal: false,
      mode: named.key,
    };
  }

  const sync = invoice.gl_sync || {};
  const includedGross =
    Number(sync.gateway_included_gross) ||
    round2((Number(sync.gateway_included_net) || 0) + (Number(sync.gateway_included_vat) || 0));
  if (includedGross > 0 || Number(sync.gateway_included_net) > 0) {
    const includedMode = sync.gateway_included_mode || mode;
    if (Number(sync.gateway_included_net) > 0 && Number(sync.gateway_included_vat) >= 0) {
      const named = modeLabel(includedMode);
      if (!named) return null;
      const n = round2(Number(sync.gateway_included_net));
      const v = round2(Number(sync.gateway_included_vat) || 0);
      const g = includedGross > 0 ? round2(includedGross) : round2(n + v);
      return {
        label: named.label,
        gross: g,
        net: n,
        vat: v,
        unitPrice: g / (1 + GATEWAY_VAT_RATE),
        includedInTotal: true,
        mode: named.key,
      };
    }
    return fromGross(includedGross, includedMode, true);
  }

  return null;
}
