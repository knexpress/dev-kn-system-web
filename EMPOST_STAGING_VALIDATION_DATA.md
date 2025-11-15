# EMpost Production Validation Data

## 🎯 Quick Reference Summary

**For EMpost Production Validation:**

| Field | Value |
|-------|-------|
| **Tracking Number** | `6911b19bc0ad28e6ff812cf8` |
| **EMpost UHAWB** | `AE20253169119538` |
| **Invoice Number** | `6911b19bc0ad28e6ff812cf8` |
| **Base Amount** | 813.75 AED |
| **Tax Amount** | 40.6875 AED |
| **Total Amount** | 854.4375 AED |
| **Currency** | AED |
| **Delivery Type** | COD |

**Use these values to search and validate in the EMpost production dashboard.**

---

## 📋 Test Invoice Data for Validation

### Invoice Information

**Invoice ID:** `6911b19bc0ad28e6ff812cf8`  
**EMpost UHAWB:** `AE20253169119538`  
**Tracking Number:** `6911b19bc0ad28e6ff812cf8` (using invoice_id as tracking number)

---

### Charges Breakdown

**Base Amount:** 813.75 AED  
**Tax Rate:** 5%  
**Tax Amount:** 40.6875 AED  
**Total Amount (Including Tax):** 854.4375 AED

#### Line Items

| Description | Quantity | Unit Price | Total |
|------------|----------|------------|-------|
| Shipping - ACTUAL weight | 1 | 775.00 AED | 775.00 AED |

**Additional Charges:**
- Tax (5%): 40.6875 AED
- **Grand Total:** 854.4375 AED

**Note:** All amounts are sent to EMpost in AED currency code, as per the API mapping.

---

### Invoice Details

- **Invoice Number:** `6911b19bc0ad28e6ff812cf8`
- **Invoice Date:** 2025-01-11T09:35:29.052Z
- **Due Date:** 2025-12-10T09:35:29.052Z
- **Status:** UNPAID
- **Currency:** AED (as sent to EMpost API)
- **Delivery Type:** COD

---

### Shipment Details

**Sender Information:**
- Company Name: Ali
- Contact Name: Ali
- Email: customer@example.com
- Phone: +971XXXXXXXXX
- Address: Al Ain
- City: Al Ain
- Country: UAE

**Receiver Information:**
- (To be extracted from invoice receiver fields)

---

### EMpost API Response

**Shipment Creation:**
- ✅ Status: Success
- UHAWB: `AE20253169119538`
- Created: 2025-01-11

**Invoice Issuance:**
- ✅ Status: Success
- Invoice issued successfully in EMpost

---

## 🔍 Validation Checklist

Use this data to validate in EMpost staging environment:

### 1. Shipment Validation
- [ ] Verify shipment exists with UHAWB: `AE20253169119538`
- [ ] Verify tracking number: `6911b19bc0ad28e6ff812cf8`
- [ ] Check sender information matches
- [ ] Check receiver information matches
- [ ] Verify shipment status

### 2. Invoice Validation
- [ ] Verify invoice exists with number: `6911b19bc0ad28e6ff812cf8`
- [ ] Check invoice amount: 854.4375 AED
- [ ] Verify tax amount: 40.6875 AED
- [ ] Check line items match
- [ ] Verify invoice date and due date

### 3. Charges Validation
- [ ] Base Rate: 813.75 AED (invoice.amount)
- [ ] Tax (5%): 40.6875 AED (invoice.tax_amount)
- [ ] Total Amount: 854.4375 AED (invoice.total_amount)
- [ ] Currency: AED (as per API mapping)
- [ ] COD Amount: 854.4375 AED (if delivery_type is COD)

### 4. Data Mapping Validation
- [ ] Tracking number mapping (invoice_id → trackingNumber)
- [ ] UHAWB storage in invoice.empost_uhawb
- [ ] Charge breakdown mapping
- [ ] Invoice details mapping

---

## 📊 Sample API Payloads Sent to EMpost

### Shipment Creation Payload
```json
{
  "trackingNumber": "6911b19bc0ad28e6ff812cf8",
  "uhawb": "",
  "sender": {
    "name": "Ali",
    "email": "customer@example.com",
    "phone": "+971XXXXXXXXX",
    "secondPhone": "",
    "countryCode": "AE",
    "state": "",
    "postCode": "",
    "city": "Al Ain",
    "line1": "Al Ain",
    "line2": "",
    "line3": ""
  },
  "receiver": {
    "name": "[from invoice.receiver_name]",
    "email": "",
    "phone": "[from invoice.receiver_phone]",
    "secondPhone": "",
    "countryCode": "AE",
    "state": "",
    "postCode": "",
    "city": "[parsed from invoice.receiver_address]",
    "line1": "[from invoice.receiver_address]",
    "line2": "",
    "line3": ""
  },
  "details": {
    "weight": {
      "unit": "KG",
      "value": [from invoice.weight_kg, minimum 0.1]
    },
    "declaredWeight": {
      "unit": "KG",
      "value": [from invoice.weight_kg, minimum 0.1]
    },
    "cod": {
      "currencyCode": "AED",
      "amount": 854.4375
    },
    "deliveryCharges": {
      "currencyCode": "AED",
      "amount": 854.4375
    },
    "numberOfPieces": 1,
    "pickupDate": "2025-01-11T09:35:29.052Z",
    "deliveryStatus": "In Transit",
    "deliveryAttempts": 0,
    "shippingType": "INT",
    "productCategory": "Electronics",
    "productType": "Parcel",
    "descriptionOfGoods": "Shipping - ACTUAL weight",
    "dimensions": {
      "length": [calculated from volume_cbm, minimum 1],
      "width": [calculated from volume_cbm, minimum 1],
      "height": [calculated from volume_cbm, minimum 1],
      "unit": "CM"
    }
  },
  "items": [
    {
      "description": "Shipping - ACTUAL weight",
      "countryOfOrigin": "AE",
      "quantity": 1,
      "hsCode": "8504.40",
      "customsValue": {
        "currencyCode": "AED",
        "amount": 775.00
      },
      "weight": {
        "unit": "KG",
        "value": [from invoice.weight_kg / item_count, minimum 0.1]
      },
      "dimensions": {
        "length": [calculated from volume_cbm, minimum 1],
        "width": [calculated from volume_cbm, minimum 1],
        "height": [calculated from volume_cbm, minimum 1],
        "unit": "CM"
      }
    }
  ]
}
```

### Invoice Issuance Payload
```json
{
  "trackingNumber": "6911b19bc0ad28e6ff812cf8",
  "chargeableWeight": {
    "unit": "KG",
    "value": [from invoice.weight_kg, minimum 0.1]
  },
  "charges": [
    {
      "type": "Base Rate",
      "amount": {
        "currencyCode": "AED",
        "amount": 813.75
      }
    },
    {
      "type": "Tax",
      "amount": {
        "currencyCode": "AED",
        "amount": 40.6875
      }
    }
  ],
  "invoice": {
    "invoiceNumber": "6911b19bc0ad28e6ff812cf8",
    "invoiceDate": "2025-01-11T09:35:29.052Z",
    "billingAccountNumber": "Ali",
    "billingAccountName": "Ali",
    "totalDiscountAmount": 0.00,
    "taxAmount": 40.6875,
    "totalAmountIncludingTax": 854.4375,
    "currencyCode": "AED"
  }
}
```

---

## 🎯 Next Steps for Validation

1. **Access EMpost Staging Dashboard**
   - URL: https://api-stg.epgl.ae
   - Use provided credentials

2. **Search by UHAWB**
   - Search for: `AE20253169119538`
   - Verify all shipment details

3. **Search by Tracking Number**
   - Search for: `6911b19bc0ad28e6ff812cf8`
   - Verify invoice linkage

4. **Verify Invoice in EMpost**
   - Check invoice number: `6911b19bc0ad28e6ff812cf8`
   - Verify charges breakdown:
     - Base Rate: 813.75 AED
     - Tax: 40.6875 AED
   - Verify total amount: 854.4375 AED

5. **Cross-Reference with Our System**
   - Check invoice in our database
   - Verify `empost_uhawb` field: `AE20253169119538`
   - Verify all amounts match

---

## 📝 Notes

- This is test data from staging environment
- **All amounts are sent to EMpost in AED** (as per API mapping)
- Dates are in ISO 8601 format (UTC)
- UHAWB format: `AE[YYYY][MM][DD][HH][MM][SS]` (e.g., AE20253169119538)
- Tracking number uses `invoice.awb_number || invoice.invoice_id`
- Weight minimum: 0.1 KG (enforced in code)
- Dimensions minimum: 1 CM (enforced in code)
- COD amount: Only included if `delivery_type === 'COD'`
- Default HS Code: `8504.40` (for general goods)
- Default Product Category: `Electronics`
- Default Product Type: `Parcel`
- Default Shipping Type: `INT` (International)

---

**Generated:** 2025-01-11  
**Environment:** Staging  
**Status:** Ready for Validation

