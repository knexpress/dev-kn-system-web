# Backend Tax Calculation Update - UAE to PH Flowmic Invoices

## Overview
We need to update the tax calculation logic for **UAE to PH Flowmic/Personal invoices** so that VAT is **included in the subtotal** rather than added on top. This is a critical business requirement change.

---

## Current Behavior (❌ Needs to Change)

For **UAE to PH Flowmic/Personal** invoices:
- Subtotal = Shipping Charge + Delivery Charge + Insurance Charge
- VAT (5%) = Subtotal × 5 / 100
- **Total Amount = Subtotal + VAT** ❌

**Example:**
```
Shipping Charge: 650 AED
Delivery Charge: 20 AED
Subtotal: 670 AED
VAT (5%): 33.5 AED (670 × 5 / 100)
Total Amount: 703.5 AED (670 + 33.5) ❌ WRONG
```

---

## Desired Behavior (✅ Target)

For **UAE to PH Flowmic/Personal** invoices:
- Subtotal = Shipping Charge + Delivery Charge + Insurance Charge (this already includes VAT)
- VAT (5%) = Subtotal × 5 / 100 (calculated for display/compliance purposes)
- **Total Amount = Subtotal** ✅ (VAT is already included, not added on top)

**Example:**
```
Shipping Charge: 650 AED
Delivery Charge: 20 AED
Subtotal: 670 AED (includes VAT)
VAT (5%): 33.5 AED (670 × 5 / 100) - shown for display
Total Amount: 670 AED (same as subtotal) ✅ CORRECT
```

---

## Important: What NOT to Change

⚠️ **CRITICAL**: This change should **ONLY** apply to:
- **UAE to PH** route (`UAE_TO_PH` or `UAE_TO_PINAS`)
- **Flowmic** or **Personal** classification

**DO NOT change** the calculation for:
- ❌ PH to UAE invoices (they should continue adding VAT on top)
- ❌ Non-flowmic UAE to PH invoices
- ❌ Any other invoice types

---

## Detection Logic

To identify if an invoice should use the new calculation:

1. **Check Route**: Service code should be `UAE_TO_PH` or `UAE_TO_PINAS` (or variations)
2. **Check Classification**: 
   - Check `request.verification.boxes[].classification === 'FLOWMIC'` OR
   - Check `request.verification.boxes[].shipment_classification === 'FLOWMIC'` OR
   - Check `request.verification.shipment_classification === 'FLOWMIC'` OR
   - Check `request.verification.boxes[].classification === 'PERSONAL'` OR
   - Check `request.verification.boxes[].shipment_classification === 'PERSONAL'` OR
   - Check `request.verification.shipment_classification === 'PERSONAL'`

**Pseudocode:**
```javascript
const isUaeToPh = serviceCode.includes('UAE_TO_PH') || serviceCode.includes('UAE_TO_PINAS');
const isFlowmicOrPersonal = checkBoxClassification('FLOWMIC') || 
                            checkBoxClassification('PERSONAL') || 
                            checkShipmentClassification('FLOWMIC') || 
                            checkShipmentClassification('PERSONAL');

const shouldUseInclusiveTax = isUaeToPh && isFlowmicOrPersonal;
```

---

## Calculation Logic

### For UAE to PH Flowmic/Personal (NEW LOGIC):

```javascript
// Step 1: Calculate subtotal (this already includes VAT)
const subtotal = shippingCharge + deliveryCharge + pickupCharge + insuranceCharge;

// Step 2: Calculate VAT for display (5% of subtotal)
const taxRate = 5; // 5%
const taxAmount = subtotal * (taxRate / 100);

// Step 3: Total = Subtotal (VAT already included, not added)
const totalAmount = subtotal; // NOT subtotal + taxAmount

// Database fields:
invoice.amount = subtotal; // Base amount (which includes VAT)
invoice.tax_rate = 5;
invoice.tax_amount = taxAmount; // For display/compliance
invoice.total_amount = subtotal; // Same as amount (VAT included)
```

### For All Other Invoices (EXISTING LOGIC - DO NOT CHANGE):

```javascript
// Step 1: Calculate subtotal (without VAT)
const subtotal = shippingCharge + deliveryCharge + pickupCharge + insuranceCharge;

// Step 2: Calculate VAT (on delivery charge only for PH to UAE, or on subtotal for others)
const taxRate = 5; // or 0
const taxAmount = calculateTaxBasedOnRoute(subtotal, deliveryCharge, taxRate);

// Step 3: Total = Subtotal + VAT
const totalAmount = subtotal + taxAmount;

// Database fields:
invoice.amount = subtotal; // Base amount (without VAT)
invoice.tax_rate = taxRate;
invoice.tax_amount = taxAmount;
invoice.total_amount = subtotal + taxAmount; // Amount + Tax
```

---

## API Endpoints to Update

### 1. `POST /api/invoices-unified` (Create Invoice)

**Location**: Likely in `Backend/routes/invoices-unified.js` or similar

**What to change:**
- In the invoice creation logic, before calculating `tax_amount` and `total_amount`
- Add detection logic for UAE to PH Flowmic/Personal
- Apply new calculation if conditions match

**Example implementation:**
```javascript
// Detect if this is UAE to PH Flowmic/Personal
const isUaeToPh = checkIfUaeToPh(request);
const isFlowmicOrPersonal = checkIfFlowmicOrPersonal(request);

// Calculate subtotal
const subtotal = calculateSubtotal(lineItems);

// Calculate tax and total
let taxAmount = 0;
let totalAmount = 0;

if (isUaeToPh && isFlowmicOrPersonal && taxRate > 0) {
  // NEW LOGIC: VAT included in subtotal
  taxAmount = subtotal * (taxRate / 100); // For display
  totalAmount = subtotal; // VAT already included
} else {
  // EXISTING LOGIC: VAT added on top
  taxAmount = calculateTaxAmount(subtotal, deliveryCharge, taxRate, isPhToUae);
  totalAmount = subtotal + taxAmount;
}

// Save to database
const invoiceData = {
  amount: subtotal, // For flowmic UAE to PH, this includes VAT
  tax_rate: taxRate,
  tax_amount: taxAmount,
  total_amount: totalAmount, // For flowmic UAE to PH, this equals subtotal
  // ... other fields
};
```

### 2. `PUT /api/invoices-unified/:id` (Update Invoice)

**What to change:**
- Same logic as create invoice
- When recalculating tax/total on update, apply the same detection and calculation

### 3. Any Invoice Recalculation Functions

**What to change:**
- If there are any functions that recalculate invoice totals
- Apply the same detection and calculation logic

---

## Database Field Meanings (After Change)

For **UAE to PH Flowmic/Personal** invoices:
- `invoice.amount` = Subtotal (which includes VAT)
- `invoice.tax_rate` = 5
- `invoice.tax_amount` = Calculated VAT for display (subtotal × 5 / 100)
- `invoice.total_amount` = Subtotal (same as amount, VAT included)

**Important**: The `amount` field now represents the total amount (including VAT) for flowmic UAE to PH invoices, but still represents base amount (excluding VAT) for all other invoices.

---

## Testing Checklist

Please test the following scenarios:

### ✅ Should Use New Logic (VAT Included):
1. UAE to PH invoice with Flowmic classification
2. UAE to PH invoice with Personal classification
3. UAE to PH invoice with Flowmic in box classification
4. UAE to PH invoice with Personal in box classification

### ✅ Should Use Existing Logic (VAT Added):
1. PH to UAE invoice (any classification)
2. UAE to PH invoice with Commercial classification
3. UAE to PH invoice with no classification
4. Any other route/classification combination

### Test Cases:

**Test Case 1: UAE to PH Flowmic**
```
Input:
- Route: UAE_TO_PH
- Classification: FLOWMIC
- Shipping: 650 AED
- Delivery: 20 AED
- Insurance: 0 AED

Expected Output:
- Subtotal: 670 AED
- Tax Rate: 5%
- Tax Amount: 33.5 AED (670 × 5 / 100)
- Total Amount: 670 AED (NOT 703.5)
```

**Test Case 2: PH to UAE (Should NOT Change)**
```
Input:
- Route: PH_TO_UAE
- Classification: COMMERCIAL
- Shipping: 1000 AED
- Delivery: 25 AED
- Tax Rate: 5%

Expected Output:
- Subtotal: 1025 AED
- Tax Amount: 1.25 AED (25 × 5 / 100) - on delivery only
- Total Amount: 1026.25 AED (1025 + 1.25) ✅ Existing logic
```

---

## Integration Points to Verify

After making changes, verify these integrations still work correctly:

1. **EMpost Integration**: 
   - Check that `invoice.amount` is still used correctly for EMpost charges
   - For flowmic UAE to PH, `invoice.amount` now includes VAT (which may be correct for EMpost)

2. **QR Payment Integration**:
   - Verify QR payment amounts use `total_amount` correctly
   - For flowmic UAE to PH, `total_amount` = `amount` (both include VAT)

3. **Metrics/Reporting**:
   - Verify revenue calculations use `total_amount` correctly
   - For flowmic UAE to PH, `total_amount` = `amount` (both are the same)

---

## Frontend Changes (Already Done)

The frontend has already been updated to:
- Calculate VAT as 5% of subtotal for display
- Set total = subtotal (not subtotal + VAT) for flowmic UAE to PH
- Display correctly in invoice templates

**Backend must match this logic** to ensure consistency.

---

## Questions to Clarify

If unsure about any of the following, please ask:

1. Should `invoice.amount` for flowmic UAE to PH be stored as the subtotal (including VAT) or should we store a base amount separately?
2. How should this affect EMpost integration? Should EMpost receive the amount with or without VAT?
3. Are there any existing invoices that need to be recalculated/migrated?

---

## Summary

**Change**: For UAE to PH Flowmic/Personal invoices, VAT should be included in the subtotal, so `total_amount = subtotal` (not `subtotal + tax_amount`).

**Scope**: Only affects UAE to PH Flowmic/Personal invoices. All other invoice types remain unchanged.

**Impact**: Low risk if detection logic is correct. Only specific invoice type is affected.

**Priority**: High - This is a business requirement for correct invoicing.

---

## Contact

If you have questions or need clarification, please reach out. The frontend changes are complete and ready, so backend changes are needed to maintain consistency.

