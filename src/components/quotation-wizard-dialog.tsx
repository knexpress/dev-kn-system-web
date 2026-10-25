'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { salesDiscountLabel } from '@/lib/sales-discount';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type QuoteWizardItem = {
  id: string;
  boxNumber: string;
  name: string;
  quantity: number;
};

export type QuoteWizardRoute = 'PH_TO_UAE' | 'UAE_TO_PH';
export type QuoteWizardPickup = 'INSIDE_DUBAI' | 'OUTSIDE_DUBAI' | 'DROP_OFF' | 'FREE_PICKUP';

type DiscountKind = 'PERCENT' | 'AMOUNT' | '';

const STEPS = [
  { id: 0, title: 'Sender details', hint: 'Who is shipping' },
  { id: 1, title: 'Receiver details', hint: 'Who is receiving' },
  { id: 2, title: 'Route', hint: 'Lane for this job' },
  { id: 3, title: 'Boxes', hint: 'How many boxes' },
  { id: 4, title: 'Weight', hint: 'Kg and rate' },
  { id: 5, title: 'Items', hint: 'What is inside' },
  { id: 6, title: 'Charges', hint: 'Pickup and extras' },
  { id: 7, title: 'Summary and notes', hint: 'Review and generate' },
] as const;

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function distinctBoxCount(boxNumbers: (string | undefined)[]) {
  return new Set(boxNumbers.map((box, index) => (box || String(index + 1)).trim().toLowerCase())).size;
}

function requiredText(value: string, label: string, min = 1) {
  const text = value.trim();
  if (!text) return `${label} is required.`;
  if (text.length < min) return `${label} is too short.`;
  return null;
}

function requiredPhone(value: string, label: string) {
  const text = value.trim();
  if (!text) return `${label} is required.`;
  const digits = text.replace(/\D/g, '');
  if (digits.length < 6) return `Enter a valid ${label.toLowerCase()}.`;
  return null;
}

function parseAmount(raw: string) {
  const text = raw.trim();
  if (!text) return { empty: true as const, value: NaN };
  if (!/^\d*\.?\d+$/.test(text)) return { empty: false as const, value: NaN };
  const value = Number(text);
  if (!Number.isFinite(value)) return { empty: false as const, value: NaN };
  return { empty: false as const, value };
}

function requiredPositive(raw: string, label: string) {
  const parsed = parseAmount(raw);
  if (parsed.empty) return `${label} is required.`;
  if (!Number.isFinite(parsed.value) || parsed.value <= 0) return `${label} must be a number greater than 0.`;
  return null;
}

function requiredWholeMin(raw: string, label: string, min: number) {
  const text = raw.trim();
  if (!text) return `${label} is required.`;
  if (!/^[1-9]\d*$/.test(text)) return `${label} must be a whole number of at least ${min}.`;
  const value = Number(text);
  if (value < min) return `${label} must be at least ${min}.`;
  return null;
}

function optionalMoney(raw: string, label: string) {
  if (!raw.trim()) return null;
  const parsed = parseAmount(raw);
  if (!Number.isFinite(parsed.value) || parsed.value < 0) return `${label} must be 0 or more.`;
  return null;
}

function FieldHint({ error, hint }: { error?: string | null; hint?: string }) {
  if (error) return <p className="mt-1 text-xs text-rose-600">{error}</p>;
  if (hint) return <p className="mt-1 text-xs text-muted-foreground">{hint}</p>;
  return null;
}

export type QuotationWizardDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  submitting: boolean;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  route: QuoteWizardRoute | '';
  actualWeight: string;
  volumetricWeight: string;
  ratePerKg: string;
  numberOfBoxes: string;
  pickupLocation: QuoteWizardPickup | '';
  deliveryCharge: string;
  insuranceCharge: string;
  discountType: DiscountKind;
  discountValue: string;
  notes: string;
  items: QuoteWizardItem[];
  chargeable: number;
  weightType: string;
  shippingAmount: number;
  pickupCharge: number;
  pickupVat: number;
  delivery: number;
  insurance: number;
  discount: { type: string; value: number; amount: number };
  finalAmount: number;
  onSenderName: (value: string) => void;
  onSenderPhone: (value: string) => void;
  onSenderAddress: (value: string) => void;
  onCustomerName: (value: string) => void;
  onCustomerPhone: (value: string) => void;
  onCustomerAddress: (value: string) => void;
  onRoute: (value: QuoteWizardRoute) => void;
  onActualWeight: (value: string) => void;
  onVolumetricWeight: (value: string) => void;
  onRatePerKg: (value: string) => void;
  onNumberOfBoxes: (value: string) => void;
  onPickupLocation: (value: QuoteWizardPickup) => void;
  onDeliveryCharge: (value: string) => void;
  onInsuranceCharge: (value: string) => void;
  onDiscountType: (value: DiscountKind) => void;
  onDiscountValue: (value: string) => void;
  onNotes: (value: string) => void;
  onItems: (items: QuoteWizardItem[]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export default function QuotationWizardDialog({
  open,
  title,
  submitLabel,
  submitting,
  senderName,
  senderPhone,
  senderAddress,
  customerName,
  customerPhone,
  customerAddress,
  route,
  actualWeight,
  volumetricWeight,
  ratePerKg,
  numberOfBoxes,
  pickupLocation,
  deliveryCharge,
  insuranceCharge,
  discountType,
  discountValue,
  notes,
  items,
  chargeable,
  weightType,
  shippingAmount,
  pickupCharge,
  pickupVat,
  delivery,
  insurance,
  discount,
  finalAmount,
  onSenderName,
  onSenderPhone,
  onSenderAddress,
  onCustomerName,
  onCustomerPhone,
  onCustomerAddress,
  onRoute,
  onActualWeight,
  onVolumetricWeight,
  onRatePerKg,
  onNumberOfBoxes,
  onPickupLocation,
  onDeliveryCharge,
  onInsuranceCharge,
  onDiscountType,
  onDiscountValue,
  onNotes,
  onItems,
  onClose,
  onSubmit,
}: QuotationWizardDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [tried, setTried] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      setStep(0);
      setReached(0);
      setTried({});
    }
  }, [open]);

  const validItems = items.filter((item) => item.name.trim() && item.quantity > 0 && item.boxNumber.trim());
  const boxCount = parseInt(numberOfBoxes, 10) || distinctBoxCount(items.map((item) => item.boxNumber));

  const fieldErrors = (index: number): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (index === 0) {
      const name = requiredText(senderName, 'Sender name', 2);
      const phone = requiredPhone(senderPhone, 'Sender phone');
      const address = requiredText(senderAddress, 'Sender address', 3);
      if (name) errors.senderName = name;
      if (phone) errors.senderPhone = phone;
      if (address) errors.senderAddress = address;
    }
    if (index === 1) {
      const name = requiredText(customerName, 'Receiver name', 2);
      const phone = requiredPhone(customerPhone, 'Receiver phone');
      const address = requiredText(customerAddress, 'Receiver address', 3);
      if (name) errors.customerName = name;
      if (phone) errors.customerPhone = phone;
      if (address) errors.customerAddress = address;
    }
    if (index === 2 && !route) errors.route = 'Select PH to UAE or UAE to PH.';
    if (index === 3) {
      const boxes = requiredWholeMin(numberOfBoxes, 'Number of boxes', 1);
      if (boxes) errors.numberOfBoxes = boxes;
    }
    if (index === 4) {
      const actual = requiredPositive(actualWeight, 'Actual weight');
      const volumetric = requiredPositive(volumetricWeight, 'Volumetric weight');
      const rate = requiredPositive(ratePerKg, 'Rate per kg');
      if (actual) errors.actualWeight = actual;
      if (volumetric) errors.volumetricWeight = volumetric;
      if (rate) errors.ratePerKg = rate;
    }
    if (index === 5) {
      if (!items.length) errors.items = 'Add at least one item.';
      items.forEach((item, itemIndex) => {
        if (!item.boxNumber.trim()) errors[`itemBox-${item.id}`] = `Box number is required for item ${itemIndex + 1}.`;
        if (!item.name.trim()) errors[`itemName-${item.id}`] = `Item ${itemIndex + 1} name is required.`;
        if (!(item.quantity >= 1) || !Number.isInteger(item.quantity)) {
          errors[`itemQty-${item.id}`] = `Item ${itemIndex + 1} quantity must be a whole number of at least 1.`;
        }
      });
    }
    if (index === 6) {
      if (!pickupLocation) errors.pickupLocation = 'Choose inside Dubai, outside Dubai, drop off, or free pickup.';
      const deliveryError = optionalMoney(deliveryCharge, 'Delivery charge');
      const insuranceError = optionalMoney(insuranceCharge, 'Insurance charge');
      if (deliveryError) errors.deliveryCharge = deliveryError;
      if (insuranceError) errors.insuranceCharge = insuranceError;
      if (discountType) {
        const discountError = requiredPositive(discountValue, discountType === 'PERCENT' ? 'Discount %' : 'Discount amount');
        if (discountError) errors.discountValue = discountError;
        else if (discountType === 'PERCENT' && Number(discountValue) > 100) {
          errors.discountValue = 'Discount % cannot be more than 100.';
        }
      } else if (discountValue.trim()) {
        errors.discountValue = 'Choose % off or AED off before entering a discount.';
      }
    }
    return errors;
  };

  const stepError = (index: number): string | null => {
    const errors = Object.values(fieldErrors(index));
    return errors[0] || null;
  };

  const currentErrors = fieldErrors(step);
  const showErrors = Boolean(tried[step]);
  const currentInvalid = Object.keys(currentErrors).length > 0;

  const markTried = (index = step) => setTried((current) => ({ ...current, [index]: true }));

  const goTo = (index: number) => {
    if (index > step) {
      for (let page = step; page < index; page += 1) {
        const error = stepError(page);
        if (error) {
          markTried(page);
          setStep(page);
          toast({ variant: 'destructive', title: 'Complete this step', description: error });
          return;
        }
      }
    }
    setStep(index);
  };

  const goNext = () => {
    const error = stepError(step);
    if (error) {
      markTried();
      toast({ variant: 'destructive', title: 'Complete this step', description: error });
      return;
    }
    const next = Math.min(step + 1, STEPS.length - 1);
    setReached((current) => Math.max(current, next));
    setStep(next);
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const error = stepError(index);
      if (error) {
        markTried(index);
        setStep(index);
        toast({ variant: 'destructive', title: STEPS[index].title, description: error });
        return;
      }
    }
    onSubmit(event);
  };

  const invalidClass = (key: string) =>
    showErrors && currentErrors[key]
      ? 'border-rose-400 focus-visible:ring-rose-400'
      : undefined;

  const routeLabel = route === 'PH_TO_UAE' ? 'Philippines to UAE' : route === 'UAE_TO_PH' ? 'UAE to Philippines' : 'Not set';
  const pickupLabel =
    pickupLocation === 'INSIDE_DUBAI'
      ? 'Inside Dubai'
      : pickupLocation === 'OUTSIDE_DUBAI'
        ? 'Outside Dubai'
        : pickupLocation === 'FREE_PICKUP'
          ? 'Free pickup'
          : pickupLocation === 'DROP_OFF'
            ? 'Drop off'
            : 'Not set';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="flex max-h-[92vh] w-[min(960px,calc(100vw-1.5rem))] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Complete each page, then review the summary before generating the quotation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ol className="grid shrink-0 grid-cols-2 gap-1 border-b bg-slate-50/80 p-3 md:w-56 md:grid-cols-1 md:border-b-0 md:border-r">
            {STEPS.map((item) => {
              const complete = reached > item.id && !stepError(item.id);
              const current = step === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(item.id)}
                    disabled={item.id > reached}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                      current && 'bg-white shadow-sm ring-1 ring-brand-100',
                      item.id > reached && 'cursor-not-allowed opacity-50',
                      !current && item.id <= reached && 'hover:bg-white/80'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                        complete && 'border-emerald-500 bg-emerald-500 text-white',
                        current && !complete && 'border-brand-500 bg-brand-500 text-white',
                        !current && !complete && 'border-slate-300 text-slate-500'
                      )}
                    >
                      {complete ? <Check className="h-3 w-3" /> : item.id + 1}
                    </span>
                    <span>
                      <span className={cn('block font-medium', current ? 'text-slate-900' : 'text-slate-600')}>
                        {item.title}
                      </span>
                      <span className="hidden text-[11px] text-slate-400 md:block">{item.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {step === 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Sender details</h3>
                  <div>
                    <Label htmlFor="wizard_sender_name">Name *</Label>
                    <Input id="wizard_sender_name" value={senderName} onChange={(e) => onSenderName(e.target.value)} className={invalidClass('senderName')} aria-invalid={showErrors && !!currentErrors.senderName} />
                    <FieldHint error={showErrors ? currentErrors.senderName : null} />
                  </div>
                  <div>
                    <Label htmlFor="wizard_sender_phone">Phone *</Label>
                    <Input id="wizard_sender_phone" type="tel" value={senderPhone} onChange={(e) => onSenderPhone(e.target.value)} className={invalidClass('senderPhone')} aria-invalid={showErrors && !!currentErrors.senderPhone} />
                    <FieldHint error={showErrors ? currentErrors.senderPhone : null} />
                  </div>
                  <div>
                    <Label htmlFor="wizard_sender_address">Address *</Label>
                    <Textarea id="wizard_sender_address" value={senderAddress} onChange={(e) => onSenderAddress(e.target.value)} rows={3} className={invalidClass('senderAddress')} aria-invalid={showErrors && !!currentErrors.senderAddress} />
                    <FieldHint error={showErrors ? currentErrors.senderAddress : null} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Receiver details</h3>
                  <div>
                    <Label htmlFor="wizard_customer_name">Name *</Label>
                    <Input id="wizard_customer_name" value={customerName} onChange={(e) => onCustomerName(e.target.value)} className={invalidClass('customerName')} aria-invalid={showErrors && !!currentErrors.customerName} />
                    <FieldHint error={showErrors ? currentErrors.customerName : null} />
                  </div>
                  <div>
                    <Label htmlFor="wizard_customer_phone">Phone *</Label>
                    <Input id="wizard_customer_phone" type="tel" value={customerPhone} onChange={(e) => onCustomerPhone(e.target.value)} className={invalidClass('customerPhone')} aria-invalid={showErrors && !!currentErrors.customerPhone} />
                    <FieldHint error={showErrors ? currentErrors.customerPhone : null} />
                  </div>
                  <div>
                    <Label htmlFor="wizard_customer_address">Address *</Label>
                    <Textarea id="wizard_customer_address" value={customerAddress} onChange={(e) => onCustomerAddress(e.target.value)} rows={3} className={invalidClass('customerAddress')} aria-invalid={showErrors && !!currentErrors.customerAddress} />
                    <FieldHint error={showErrors ? currentErrors.customerAddress : null} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Route</h3>
                  <div className="max-w-md">
                    <Label>Route *</Label>
                    <Select value={route} onValueChange={(value) => onRoute(value as QuoteWizardRoute)}>
                      <SelectTrigger className={invalidClass('route')} aria-invalid={showErrors && !!currentErrors.route}>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PH_TO_UAE">Philippines to UAE</SelectItem>
                        <SelectItem value="UAE_TO_PH">UAE to Philippines</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldHint error={showErrors ? currentErrors.route : null} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Boxes</h3>
                  <div className="max-w-md">
                    <Label htmlFor="wizard_number_of_boxes">Number of boxes *</Label>
                    <Input
                      id="wizard_number_of_boxes"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 1"
                      value={numberOfBoxes}
                      onChange={(e) => onNumberOfBoxes(e.target.value)}
                      className={invalidClass('numberOfBoxes')}
                      aria-invalid={showErrors && !!currentErrors.numberOfBoxes}
                    />
                    <FieldHint
                      error={showErrors ? currentErrors.numberOfBoxes : null}
                      hint="Enter a whole number of at least 1."
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Weight (kg)</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="wizard_actual_weight">Actual weight (kg) *</Label>
                      <Input id="wizard_actual_weight" type="number" min="0.01" step="0.01" value={actualWeight} onChange={(e) => onActualWeight(e.target.value)} className={invalidClass('actualWeight')} aria-invalid={showErrors && !!currentErrors.actualWeight} />
                      <FieldHint error={showErrors ? currentErrors.actualWeight : null} />
                    </div>
                    <div>
                      <Label htmlFor="wizard_volumetric_weight">Volumetric weight (kg) *</Label>
                      <Input id="wizard_volumetric_weight" type="number" min="0.01" step="0.01" value={volumetricWeight} onChange={(e) => onVolumetricWeight(e.target.value)} className={invalidClass('volumetricWeight')} aria-invalid={showErrors && !!currentErrors.volumetricWeight} />
                      <FieldHint error={showErrors ? currentErrors.volumetricWeight : null} />
                    </div>
                    <div>
                      <Label htmlFor="wizard_rate_per_kg">Rate per kg (AED) *</Label>
                      <Input id="wizard_rate_per_kg" type="number" min="0.01" step="0.01" placeholder="Enter rate" value={ratePerKg} onChange={(e) => onRatePerKg(e.target.value)} className={invalidClass('ratePerKg')} aria-invalid={showErrors && !!currentErrors.ratePerKg} />
                      <FieldHint error={showErrors ? currentErrors.ratePerKg : null} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/40 p-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Chargeable weight</p>
                      <p className="font-semibold">{chargeable > 0 ? `${chargeable.toFixed(2)} kg` : '—'}</p>
                      <p className="text-xs text-muted-foreground">{chargeable > 0 ? weightType : 'Higher of actual and volumetric'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quoted shipping</p>
                      <p className="font-semibold">{shippingAmount > 0 ? `AED ${money(shippingAmount)}` : '—'}</p>
                      <p className="text-xs text-muted-foreground">Chargeable weight × the rate you enter</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onItems([...items, { id: Date.now().toString(), boxNumber: String(items.length + 1), name: '', quantity: 1 }])}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add item
                    </Button>
                  </div>
                  <FieldHint error={showErrors ? currentErrors.items : null} />
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                      <div className="md:col-span-1">
                        <Label>S.No</Label>
                        <Input value={String(index + 1)} readOnly />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Box number *</Label>
                        <Input
                          value={item.boxNumber}
                          placeholder={String(index + 1)}
                          onChange={(e) => onItems(items.map((row) => (row.id === item.id ? { ...row, boxNumber: e.target.value } : row)))}
                          className={invalidClass(`itemBox-${item.id}`)}
                          aria-invalid={showErrors && !!currentErrors[`itemBox-${item.id}`]}
                        />
                        <FieldHint error={showErrors ? currentErrors[`itemBox-${item.id}`] : null} />
                      </div>
                      <div className="md:col-span-5">
                        <Label>Item {index + 1} *</Label>
                        <Input
                          value={item.name}
                          placeholder="Item name"
                          onChange={(e) => onItems(items.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)))}
                          className={invalidClass(`itemName-${item.id}`)}
                          aria-invalid={showErrors && !!currentErrors[`itemName-${item.id}`]}
                        />
                        <FieldHint error={showErrors ? currentErrors[`itemName-${item.id}`] : null} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) => {
                            const typed = e.target.value;
                            const qty = parseInt(typed, 10);
                            onItems(items.map((row) => (row.id === item.id ? { ...row, quantity: typed === '' || !Number.isFinite(qty) ? 0 : qty } : row)));
                          }}
                          className={invalidClass(`itemQty-${item.id}`)}
                          aria-invalid={showErrors && !!currentErrors[`itemQty-${item.id}`]}
                        />
                        <FieldHint error={showErrors ? currentErrors[`itemQty-${item.id}`] : null} />
                      </div>
                      <div className="md:col-span-2">
                        {items.length > 1 && (
                          <Button type="button" variant="outline" onClick={() => onItems(items.filter((row) => row.id !== item.id))}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Charges</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label>Pickup *</Label>
                      <Select value={pickupLocation} onValueChange={(value) => onPickupLocation(value as QuoteWizardPickup)}>
                        <SelectTrigger className={invalidClass('pickupLocation')} aria-invalid={showErrors && !!currentErrors.pickupLocation}>
                          <SelectValue placeholder="Inside Dubai, outside Dubai, drop off, or free pickup" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INSIDE_DUBAI">Inside Dubai — 20.00 AED</SelectItem>
                          <SelectItem value="OUTSIDE_DUBAI">Outside Dubai — 25.71 AED</SelectItem>
                          <SelectItem value="DROP_OFF">Drop off — 0.00 AED</SelectItem>
                          <SelectItem value="FREE_PICKUP">Free pickup — 0.00 AED</SelectItem>
                      </SelectContent>
                    </Select>
                      <FieldHint error={showErrors ? currentErrors.pickupLocation : null} hint="VAT 5% is added on the pickup charge only." />
                    </div>
                    <div>
                      <Label htmlFor="wizard_delivery_charge">Delivery charge (AED)</Label>
                      <Input id="wizard_delivery_charge" type="number" min="0" step="0.01" placeholder="0.00" value={deliveryCharge} onChange={(e) => onDeliveryCharge(e.target.value)} className={invalidClass('deliveryCharge')} aria-invalid={showErrors && !!currentErrors.deliveryCharge} />
                      <FieldHint error={showErrors ? currentErrors.deliveryCharge : null} />
                    </div>
                    <div>
                      <Label htmlFor="wizard_insurance_charge">Insurance charge (AED)</Label>
                      <Input id="wizard_insurance_charge" type="number" min="0" step="0.01" placeholder="0.00" value={insuranceCharge} onChange={(e) => onInsuranceCharge(e.target.value)} className={invalidClass('insuranceCharge')} aria-invalid={showErrors && !!currentErrors.insuranceCharge} />
                      <FieldHint error={showErrors ? currentErrors.insuranceCharge : null} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label>Sales discount</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['PERCENT', 'AMOUNT'] as const).map((kind) => (
                          <Button
                            key={kind}
                            type="button"
                            variant={discountType === kind ? 'default' : 'outline'}
                            onClick={() => onDiscountType(discountType === kind ? '' : kind)}
                          >
                            {kind === 'PERCENT' ? '% off' : 'AED off'}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="wizard_discount_value">
                        {discountType === 'PERCENT' ? 'Discount %' : discountType === 'AMOUNT' ? 'Discount amount (AED)' : 'Discount'}
                      </Label>
                      <Input
                        id="wizard_discount_value"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={discountType === 'PERCENT' ? 'e.g. 10' : '0.00'}
                        value={discountValue}
                        onChange={(e) => onDiscountValue(e.target.value)}
                        disabled={!discountType}
                        className={invalidClass('discountValue')}
                        aria-invalid={showErrors && !!currentErrors.discountValue}
                      />
                      <FieldHint error={showErrors ? currentErrors.discountValue : null} hint="Applied to the shipping charge only." />
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between"><span>Shipping</span><span>AED {money(shippingAmount)}</span></div>
                    <div className="flex justify-between"><span>Pickup</span><span>AED {money(pickupCharge)}</span></div>
                    <div className="flex justify-between"><span>VAT 5% on pickup</span><span>AED {money(pickupVat)}</span></div>
                    <div className="flex justify-between"><span>Delivery</span><span>AED {money(delivery)}</span></div>
                    <div className="flex justify-between"><span>Insurance</span><span>AED {money(insurance)}</span></div>
                    {discount.amount > 0 ? (
                      <div className="flex justify-between text-rose-700">
                        <span>{salesDiscountLabel(discount.type, discount.value, discount.amount)}</span>
                        <span>- AED {money(discount.amount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between pt-1 font-semibold"><span>Final price</span><span>AED {money(finalAmount)}</span></div>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Summary and notes</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Sender', value: `${senderName || '—'}\n${senderPhone}\n${senderAddress}`, step: 0 },
                      { label: 'Receiver', value: `${customerName || '—'}\n${customerPhone}\n${customerAddress}`, step: 1 },
                      { label: 'Route', value: routeLabel, step: 2 },
                      { label: 'Boxes', value: String(boxCount || '—'), step: 3 },
                      {
                        label: 'Weight',
                        value: `Actual ${actualWeight || '—'} kg · Vol ${volumetricWeight || '—'} kg · Chargeable ${chargeable > 0 ? `${chargeable.toFixed(2)} kg` : '—'} · AED ${ratePerKg || '0'}/kg`,
                        step: 4,
                      },
                      {
                        label: 'Items',
                        value: validItems.length
                          ? validItems.map((item) => `Box ${item.boxNumber || '—'}: ${item.name} × ${item.quantity}`).join('\n')
                          : 'No items',
                        step: 5,
                      },
                      { label: 'Pickup', value: pickupLabel, step: 6 },
                    ].map((card) => (
                      <button
                        key={card.label}
                        type="button"
                        onClick={() => goTo(card.step)}
                        className="rounded-xl border bg-slate-50/70 p-3 text-left transition-colors hover:border-brand-200 hover:bg-white"
                      >
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {stepError(card.step) ? <Circle className="h-3 w-3 text-amber-500" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          {card.label}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">{card.value}</p>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1 rounded-xl border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between"><span>Shipping</span><span>AED {money(shippingAmount)}</span></div>
                    <div className="flex justify-between"><span>Pickup + VAT</span><span>AED {money(pickupCharge + pickupVat)}</span></div>
                    <div className="flex justify-between"><span>Delivery</span><span>AED {money(delivery)}</span></div>
                    <div className="flex justify-between"><span>Insurance</span><span>AED {money(insurance)}</span></div>
                    {discount.amount > 0 ? (
                      <div className="flex justify-between text-rose-700">
                        <span>{salesDiscountLabel(discount.type, discount.value, discount.amount)}</span>
                        <span>- AED {money(discount.amount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between pt-1 text-base font-semibold"><span>Final price</span><span>AED {money(finalAmount)}</span></div>
                  </div>
                  <div>
                    <Label htmlFor="wizard_notes">Notes</Label>
                    <Textarea
                      id="wizard_notes"
                      value={notes}
                      onChange={(e) => onNotes(e.target.value)}
                      rows={3}
                      placeholder="Optional note for the client"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <div className="flex flex-col items-end gap-1">
                    {showErrors && currentInvalid ? (
                      <p className="max-w-xs text-right text-xs text-rose-600">{stepError(step)}</p>
                    ) : null}
                    <Button type="button" onClick={goNext}>
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    {showErrors && currentInvalid ? (
                      <p className="max-w-xs text-right text-xs text-rose-600">{stepError(step)}</p>
                    ) : null}
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Saving...' : submitLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
