# Quick Reference: UAE to PH Flowmic Tax Calculation Change

## TL;DR
For **UAE to PH Flowmic/Personal** invoices: VAT is included in subtotal, so `total_amount = subtotal` (not `subtotal + tax_amount`).

---

## Detection
```javascript
const isUaeToPh = serviceCode.includes('UAE_TO_PH') || serviceCode.includes('UAE_TO_PINAS');
const isFlowmicOrPersonal = checkClassification(['FLOWMIC', 'PERSONAL']);
const shouldUseInclusiveTax = isUaeToPh && isFlowmicOrPersonal;
```

## Calculation

### UAE to PH Flowmic/Personal (NEW):
```javascript
subtotal = shipping + delivery + pickup + insurance;
taxAmount = subtotal * 0.05; // 5% for display
totalAmount = subtotal; // VAT already included
```

### All Others (EXISTING - NO CHANGE):
```javascript
subtotal = shipping + delivery + pickup + insurance;
taxAmount = calculateTax(...); // Based on route
totalAmount = subtotal + taxAmount; // VAT added on top
```

## Database Fields
For **UAE to PH Flowmic/Personal**:
- `amount` = subtotal (includes VAT)
- `tax_amount` = subtotal × 5% (for display)
- `total_amount` = subtotal (same as amount)

## Example
```
Shipping: 650, Delivery: 20
Subtotal: 670 (includes VAT)
VAT 5%: 33.5 (display only)
Total: 670 ✅ (NOT 703.5)
```

## Files to Update
- `POST /api/invoices-unified` - Invoice creation
- `PUT /api/invoices-unified/:id` - Invoice update
- Any invoice recalculation functions

## ⚠️ Important
- **ONLY** change UAE to PH Flowmic/Personal
- **DO NOT** change PH to UAE or other routes
- Frontend already updated - backend must match

