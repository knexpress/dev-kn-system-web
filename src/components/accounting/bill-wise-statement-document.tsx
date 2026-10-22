'use client';

import type { CSSProperties } from 'react';
import { money } from './erp-format';

export function fmtBillDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${yy}`;
}

export function overdueByDays(due?: string | Date | null, asOf: Date = new Date()) {
  if (!due) return 0;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return 0;
  const end = new Date(asOf);
  end.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.floor((end.getTime() - d.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

/** Amount + Dr with a non-breaking space (stable in html2pdf / canvas). */
export function amountDr(n: number) {
  return `${money(n)}\u00A0Dr`;
}

export type BillWiseRow = {
  invoice_date?: string | Date | null;
  invoice_no?: string;
  reference?: string;
  total_amount?: number;
  outstanding?: number;
  due_date?: string | Date | null;
  customer_name?: string;
  kind?: string;
  status?: string;
  pay_status?: string;
};

type PartyBlock = {
  customer_name: string;
  rows: BillWiseRow[];
};

type Props = {
  parties: PartyBlock[];
  from?: string | null;
  to?: string | null;
  asOf?: string | Date | null;
  /** When true, show customer column (multi-party combined table) */
  showCustomerColumn?: boolean;
  reportTitle?: string;
};

/** Amount cell: number and Dr kept apart so PDF canvas never overlaps glyphs. */
function AmountCell({
  value,
  bold = false,
  footer = false,
}: {
  value: number;
  bold?: boolean;
  footer?: boolean;
}) {
  const style: CSSProperties = {
    padding: footer ? '10px 8px 6px' : '6px 8px',
    textAlign: 'right',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
    fontWeight: bold ? 700 : 400,
    fontVariantNumeric: 'normal',
    letterSpacing: 'normal',
    borderBottom: footer ? '2px solid #000' : '1px solid #e5e5e5',
    borderTop: footer ? '1px solid #000' : undefined,
  };

  return (
    <td style={style}>
      <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{money(value)}</span>
        <span style={{ marginLeft: '0.4em', fontFamily: 'Arial, Helvetica, sans-serif' }}>Dr</span>
      </span>
    </td>
  );
}

/** Printable bill-wise statement (AR or AP purchase history). */
export function BillWiseStatementDocument({
  parties,
  from,
  to,
  asOf,
  showCustomerColumn = false,
  reportTitle = 'Bill-wise Details',
}: Props) {
  const asOfDate = asOf ? new Date(asOf) : new Date();
  const rangeLabel = `${from ? fmtBillDate(from) : '…'} to ${to ? fmtBillDate(to) : fmtBillDate(asOfDate)}`;

  const allRows = parties.flatMap((p) =>
    p.rows.map((r) => ({ ...r, customer_name: r.customer_name || p.customer_name }))
  );
  const totalOpening = allRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPending = allRows.reduce((s, r) => s + Number(r.outstanding || 0), 0);

  return (
    <div
      className="theme-light"
      style={{
        margin: '0 auto',
        maxWidth: '210mm',
        background: '#fff',
        color: '#000',
        padding: '24px 28px',
        fontSize: '12px',
        lineHeight: 1.45,
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em' }}>
            KNEX DELIVERY SERVICES L.L.C.
          </p>
          <p style={{ margin: '2px 0 0' }}>Rocky Warehouse # 19, 11th Street</p>
          <p style={{ margin: 0 }}>Al Qusais, Industrial Area 1, Dubai, UAE</p>
          <p style={{ margin: '6px 0 0' }}>
            <span style={{ fontWeight: 600 }}>TRN:</span> 104131637100003
          </p>
        </div>
        <img
          src="/Screenshot 2026-06-29 132542.png"
          alt="KNEX"
          style={{ height: '64px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />
      </div>

      {parties.length === 1 ? (
        <p
          style={{
            margin: '0 0 4px',
            fontSize: '18px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {parties[0].customer_name}
        </p>
      ) : (
        <p
          style={{
            margin: '0 0 4px',
            fontSize: '18px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          All customers
        </p>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '14px',
          paddingBottom: '8px',
          borderBottom: '1px solid #000',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{reportTitle}</p>
          <p style={{ margin: '2px 0 0', fontSize: '12px' }}>{rangeLabel}</p>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>As of {fmtBillDate(asOfDate)}</p>
      </div>

      {parties.length > 1 && !showCustomerColumn
        ? parties.map((party) => {
            const opening = party.rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
            const pending = party.rows.reduce((s, r) => s + Number(r.outstanding || 0), 0);
            return (
              <div key={party.customer_name} style={{ marginBottom: '28px' }}>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {party.customer_name}
                </p>
                <BillWiseTable
                  rows={party.rows}
                  asOfDate={asOfDate}
                  totalOpening={opening}
                  totalPending={pending}
                />
              </div>
            );
          })
        : (
          <BillWiseTable
            rows={allRows}
            asOfDate={asOfDate}
            showCustomerColumn={showCustomerColumn && parties.length > 1}
            totalOpening={totalOpening}
            totalPending={totalPending}
          />
        )}
    </div>
  );
}

function BillWiseTable({
  rows,
  asOfDate,
  showCustomerColumn = false,
  totalOpening,
  totalPending,
}: {
  rows: BillWiseRow[];
  asOfDate: Date;
  showCustomerColumn?: boolean;
  totalOpening: number;
  totalPending: number;
}) {
  const th: CSSProperties = {
    padding: '8px 8px',
    textAlign: 'left',
    fontWeight: 700,
    borderBottom: '1px solid #000',
    verticalAlign: 'bottom',
    whiteSpace: 'nowrap',
  };
  const thRight: CSSProperties = { ...th, textAlign: 'right' };

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        fontSize: '11.5px',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <colgroup>
        {showCustomerColumn ? <col style={{ width: '16%' }} /> : null}
        <col style={{ width: showCustomerColumn ? '11%' : '12%' }} />
        <col style={{ width: showCustomerColumn ? '14%' : '16%' }} />
        <col style={{ width: showCustomerColumn ? '18%' : '20%' }} />
        <col style={{ width: showCustomerColumn ? '18%' : '20%' }} />
        <col style={{ width: showCustomerColumn ? '12%' : '14%' }} />
        <col style={{ width: showCustomerColumn ? '11%' : '18%' }} />
      </colgroup>
      <thead>
        <tr>
          {showCustomerColumn ? <th style={th}>Customer</th> : null}
          <th style={th}>Date</th>
          <th style={th}>Ref. No.</th>
          <th style={thRight}>Opening Amount</th>
          <th style={thRight}>Pending Amount</th>
          <th style={thRight}>Due on</th>
          <th style={thRight}>Overdue by days</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              style={{ padding: '16px 8px', color: '#666' }}
              colSpan={showCustomerColumn ? 7 : 6}
            >
              No bills in this period.
            </td>
          </tr>
        ) : (
          rows.map((r, idx) => (
            <tr key={`${r.invoice_no}-${idx}`}>
              {showCustomerColumn ? (
                <td
                  style={{
                    padding: '6px 8px',
                    verticalAlign: 'top',
                    borderBottom: '1px solid #e5e5e5',
                    wordBreak: 'break-word',
                  }}
                >
                  {r.customer_name}
                </td>
              ) : null}
              <td
                style={{
                  padding: '6px 8px',
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid #e5e5e5',
                }}
              >
                {fmtBillDate(r.invoice_date)}
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  verticalAlign: 'top',
                  borderBottom: '1px solid #e5e5e5',
                  wordBreak: 'break-word',
                }}
              >
                {r.invoice_no || r.reference || '—'}
              </td>
              <AmountCell value={Number(r.total_amount || 0)} />
              <AmountCell value={Number(r.outstanding || 0)} />
              <td
                style={{
                  padding: '6px 8px',
                  textAlign: 'right',
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid #e5e5e5',
                }}
              >
                {fmtBillDate(r.due_date || r.invoice_date)}
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  textAlign: 'right',
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid #e5e5e5',
                }}
              >
                {overdueByDays(r.due_date || r.invoice_date, asOfDate)}
              </td>
            </tr>
          ))
        )}
      </tbody>
      <tfoot>
        <tr>
          <td
            colSpan={showCustomerColumn ? 3 : 2}
            style={{
              padding: '10px 8px 6px',
              borderTop: '1px solid #000',
              borderBottom: '2px solid #000',
              fontWeight: 700,
            }}
          >
            Total
          </td>
          <AmountCell value={totalOpening} bold footer />
          <AmountCell value={totalPending} bold footer />
          <td
            style={{
              padding: '10px 8px 6px',
              borderTop: '1px solid #000',
              borderBottom: '2px solid #000',
            }}
          />
          <td
            style={{
              padding: '10px 8px 6px',
              borderTop: '1px solid #000',
              borderBottom: '2px solid #000',
            }}
          />
        </tr>
      </tfoot>
    </table>
  );
}
