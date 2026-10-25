'use client';

import { memo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Hash, Phone, MapPin, ArrowRight, AlertTriangle, Truck } from 'lucide-react';

const VerificationForm = dynamic(() => import('@/components/verification-form'), {
  ssr: false,
});

export interface InvoiceRequestCardProps {
  request: any;
  userProfile: any;
  formatWeightValue: (value: any) => string | null;
  formatDateLabel: (date: string | Date) => string;
  formatServiceCode: (code?: string | null) => string;
  getStatusBadgeColor: (status: string) => string;
  renderActionControls: (request: any) => ReactNode;
  fetchInvoiceRequests: () => void;
  onOpenInvoice?: (invoiceKey: string) => void;
}

const InvoiceRequestCard = memo(function InvoiceRequestCard({
  request,
  userProfile,
  formatWeightValue,
  formatDateLabel,
  formatServiceCode,
  getStatusBadgeColor,
  renderActionControls,
  fetchInvoiceRequests,
  onOpenInvoice,
}: InvoiceRequestCardProps) {
  const shortId =
    request.invoice_number ||
    request.tracking_code ||
    (request._id ? request._id.slice(-8) : 'REQUEST');

  const awbNumber =
    request.tracking_code ||
    request.awb_number ||
    request.request_id?.tracking_code ||
    request.request_id?.awb_number ||
    'N/A';

  const weightDisplay =
    formatWeightValue(request.weight) ||
    formatWeightValue(request.weight_kg) ||
    formatWeightValue(request.verification?.actual_weight);
  const routeFrom = request.origin_place || 'Not set';
  const routeTo = request.destination_place || 'Not set';
  const createdLabel = formatDateLabel(request.createdAt);
  const totalBoxes =
    request.verification?.number_of_boxes ||
    request.number_of_boxes ||
    request.verification?.boxes?.length;
  const actions = renderActionControls(request);

  const hasInvoice = !!(request.invoice_id || request.invoice_number);
  const invoiceKey = request.invoice_id || request.invoice_number || request.tracking_code;
  const canOpenInvoice = Boolean(hasInvoice && invoiceKey && onOpenInvoice);
  const isSales = userProfile?.department?.name === 'Sales';

  // Service label from database (for Sales view)
  const serviceLabel =
    request.service ||
    request.service_code ||
    request.request_id?.service ||
    request.request_id?.service_code ||
    request.booking?.service ||
    request.booking?.service_code ||
    '';

  return (
    <div
      key={request._id}
      role={canOpenInvoice ? 'button' : undefined}
      tabIndex={canOpenInvoice ? 0 : undefined}
      onClick={canOpenInvoice ? () => onOpenInvoice?.(invoiceKey) : undefined}
      onKeyDown={
        canOpenInvoice
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenInvoice?.(invoiceKey);
              }
            }
          : undefined
      }
      className={`rounded-2xl border p-4 transition ${
        hasInvoice
          ? 'cursor-pointer border-emerald-200 bg-emerald-50/40 shadow-[0_12px_28px_-22px_rgba(16,185,129,0.45)] hover:border-emerald-300 hover:bg-emerald-50/70'
          : 'border-slate-200/80 bg-white shadow-[0_12px_28px_-22px_rgba(15,23,42,0.28)] hover:border-brand-200'
      }`}
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-slate-900">{awbNumber}</span>
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
            {shortId}
          </Badge>
          <span className="text-xs text-slate-400">Created {createdLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={getStatusBadgeColor(request.status)}>
            {request.status}
          </Badge>
          {request.has_delivery && (
            <Badge variant="secondary">Delivery</Badge>
          )}
          {canOpenInvoice && (
            <span className="text-[11px] font-medium text-emerald-700">View invoice</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Customer</p>
          <p className="font-semibold text-slate-900">{request.customer_name || '—'}</p>
          {!isSales && request.customer_phone && (
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Phone className="h-3.5 w-3.5" />
              <span>{request.customer_phone}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Receiver</p>
          <p className="font-semibold text-slate-900">{request.receiver_name || '—'}</p>
          {request.receiver_company && (
            <p className="text-sm text-slate-500">{request.receiver_company}</p>
          )}
          {!isSales && request.receiver_phone && (
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Phone className="h-3.5 w-3.5" />
              <span>{request.receiver_phone}</span>
            </div>
          )}
        </div>

        {isSales ? (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Service</p>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-brand-500" />
              <span className="font-semibold text-slate-900">
                {serviceLabel ? formatServiceCode(serviceLabel) : 'Not set'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Route</p>
            <div className="flex items-start gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1 font-medium text-slate-900">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <span className="break-words">{routeFrom}</span>
                </div>
                <p className="pl-5 text-[11px] uppercase tracking-wide text-slate-400">Origin</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1 font-medium text-slate-900">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                  <span className="break-words">{routeTo}</span>
                </div>
                <p className="pl-5 text-[11px] uppercase tracking-wide text-slate-400">Destination</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Shipment</p>
          <p className="text-sm text-slate-700">
            {request.shipment_type === 'DOCUMENT' ? 'Document' : 'Non-document'}
            {weightDisplay ? ` · ${weightDisplay} kg` : ''}
            {totalBoxes ? ` · ${totalBoxes} boxes` : ''}
          </p>
          <p className="font-mono text-xs text-slate-400">
            <Hash className="mr-1 inline h-3 w-3" />
            {awbNumber}
          </p>
        </div>
      </div>

      {userProfile?.department?.name === 'Operations' && request.status === 'IN_PROGRESS' && (
        <div className="mt-4 rounded-lg border border-dashed border-orange-200 bg-orange-50 p-4" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            <span>Complete the verification before sending to Finance</span>
          </div>
          <div className="mt-3">
            <VerificationForm
              request={request}
              onVerificationComplete={fetchInvoiceRequests}
              currentUser={userProfile}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Badge variant="outline" className="rounded-full">
            {formatServiceCode(request.service_code)}
          </Badge>
          {request.has_delivery && <Badge variant="secondary" className="rounded-full">Delivery required</Badge>}
          {request.is_leviable && <Badge variant="outline" className="rounded-full">VAT applicable</Badge>}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
            {actions}
          </div>
        ) : (
          <div className="text-xs text-slate-400">No actions available</div>
        )}
      </div>
    </div>
  );
});

export default InvoiceRequestCard;
