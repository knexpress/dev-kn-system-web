# EMpost API Integration - Validation Document

**Date:** January 11, 2025  
**System:** KNEX Finance System  
**Environment:** Production  
**API Base URL:** https://api.epgl.ae

---

## Integration Overview

We have successfully integrated our KNEX Finance System with the EMpost Regulatory and Licensing API. This document provides test data and validation information for your review and confirmation.

### Integration Details

- **Authentication:** OAuth2 with JWT Bearer tokens
- **TLS Version:** TLS 1.3 (automatic negotiation)
- **API Endpoints Used:**
  - `/api/v1/auth/authenticate` - Authentication
  - `/api/v1/shipment/create` - Shipment creation
  - `/api/v1/shipment/issueInvoice` - Invoice issuance

### Integration Flow

1. **Invoice Creation in Our System**
   - When an invoice is created, we automatically:
     - Create a shipment in EMpost
     - Issue an invoice in EMpost
     - Store the returned UHAWB in our system

2. **Data Mapping**
   - Tracking Number: Uses invoice ID or AWB number
   - Sender: Mapped from client information
   - Receiver: Mapped from invoice receiver details
   - Currency: **AED** (UAE Dirham)
   - Weight: From invoice weight_kg (minimum 0.1 KG enforced)
   - Dimensions: Calculated from volume_cbm (minimum 1 CM enforced)

---

## Test Data for Validation

### Test Invoice #1

**Tracking Number:** `6911b19bc0ad28e6ff812cf8`  
**EMpost UHAWB:** `AE20253169119538`  
**Invoice Number:** `6911b19bc0ad28e6ff812cf8`

#### Invoice Details

- **Invoice Date:** 2025-01-11T09:35:29.052Z
- **Due Date:** 2025-12-10T09:35:29.052Z
- **Status:** UNPAID
- **Currency:** AED
- **Delivery Type:** COD

#### Charges Breakdown

| Description | Amount (AED) |
|------------|--------------|
| Base Amount | 813.75 |
| Tax (5%) | 40.6875 |
| **Total Amount** | **854.4375** |

#### Line Items

| Description | Quantity | Unit Price | Total |
|------------|----------|------------|-------|
| Shipping - ACTUAL weight | 1 | 775.00 | 775.00 |

#### Sender Information

- **Name:** Ali
- **Email:** customer@example.com
- **Phone:** +971XXXXXXXXX
- **Address:** Al Ain
- **City:** Al Ain
- **Country:** UAE (AE)

#### Receiver Information

- **Name:** [From invoice receiver_name]
- **Phone:** [From invoice receiver_phone]
- **Address:** [From invoice receiver_address]
- **Country:** UAE (AE)

---

## API Payloads Sent to EMpost

### 1. Shipment Creation Payload

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
    "name": "[From invoice.receiver_name]",
    "email": "",
    "phone": "[From invoice.receiver_phone]",
    "secondPhone": "",
    "countryCode": "AE",
    "state": "",
    "postCode": "",
    "city": "[Parsed from invoice.receiver_address]",
    "line1": "[From invoice.receiver_address]",
    "line2": "",
    "line3": ""
  },
  "details": {
    "weight": {
      "unit": "KG",
      "value": [From invoice.weight_kg, minimum 0.1]
    },
    "declaredWeight": {
      "unit": "KG",
      "value": [From invoice.weight_kg, minimum 0.1]
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
      "length": [Calculated from volume_cbm, minimum 1],
      "width": [Calculated from volume_cbm, minimum 1],
      "height": [Calculated from volume_cbm, minimum 1],
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
        "value": [From invoice.weight_kg / item_count, minimum 0.1]
      },
      "dimensions": {
        "length": [Calculated from volume_cbm, minimum 1],
        "width": [Calculated from volume_cbm, minimum 1],
        "height": [Calculated from volume_cbm, minimum 1],
        "unit": "CM"
      }
    }
  ]
}
```

### 2. Invoice Issuance Payload

```json
{
  "trackingNumber": "6911b19bc0ad28e6ff812cf8",
  "chargeableWeight": {
    "unit": "KG",
    "value": [From invoice.weight_kg, minimum 0.1]
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

## API Response Received

### Shipment Creation Response

```json
{
  "status": "Success",
  "message": "Shipment created successfully.",
  "data": {
    "trackingNumber": "6911b19bc0ad28e6ff812cf8",
    "uhawb": "AE20253169119538",
    ...
  },
  "errors": null,
  "correlationId": "...",
  "timestamp": "2025-01-11T09:35:29.052Z"
}
```

### Invoice Issuance Response

```json
{
  "status": "Success",
  "message": "Shipment invoice issued successfully.",
  "data": {
    "trackingNumber": "6911b19bc0ad28e6ff812cf8",
    ...
  },
  "errors": null,
  "correlationId": "...",
  "timestamp": "2025-01-11T09:35:29.052Z"
}
```

---

## Validation Checklist

Please verify the following in your EMpost staging system:

### Shipment Validation

- [ ] Shipment exists with UHAWB: `AE20253169119538`
- [ ] Tracking number: `6911b19bc0ad28e6ff812cf8` is correctly linked
- [ ] Sender information matches our data
- [ ] Receiver information matches our data
- [ ] Shipment status is correctly set
- [ ] Weight and dimensions are correctly recorded
- [ ] COD amount is correctly set (854.4375 AED)

### Invoice Validation

- [ ] Invoice exists with number: `6911b19bc0ad28e6ff812cf8`
- [ ] Invoice amount: 854.4375 AED
- [ ] Tax amount: 40.6875 AED
- [ ] Base rate: 813.75 AED
- [ ] Currency code: AED
- [ ] Invoice date and due date are correct
- [ ] Charges breakdown matches our data

### Data Mapping Validation

- [ ] Tracking number mapping is correct
- [ ] UHAWB is correctly returned and stored
- [ ] Currency (AED) is correctly handled
- [ ] Weight and dimension validations are working
- [ ] COD handling is correct for COD delivery types

---

## Technical Implementation Notes

### Currency Handling

- **All amounts are sent in AED** (UAE Dirham)
- Currency code: `AED` in all API payloads
- Frontend displays amounts in AED format

### Data Validation

- **Weight:** Minimum 0.1 KG enforced (if weight is missing or 0, defaults to 0.1 KG)
- **Dimensions:** Minimum 1 CM enforced (calculated from volume_cbm)
- **Tracking Number:** Uses `invoice.awb_number || invoice.invoice_id`
- **UHAWB:** Stored in `invoice.empost_uhawb` field after shipment creation

### Error Handling

- Retry logic with exponential backoff (3 attempts)
- Authentication token caching (1 hour expiry)
- Automatic token refresh when expired
- Graceful error handling with detailed logging

### Security

- TLS 1.3 for secure connections
- OAuth2 authentication with JWT tokens
- Secure credential management via environment variables
- User-Agent header: `KNEX-Finance-System/1.0 (Platform Integration)`

---

## Request for Confirmation

We request your confirmation on the following:

1. **Data Format:** Please confirm that the data format and structure we're sending matches your requirements.

2. **Currency:** Please confirm that AED (UAE Dirham) is the correct currency code for your system.

3. **Field Mappings:** Please confirm that our field mappings (sender, receiver, weight, dimensions, etc.) are correct.

4. **Validation Rules:** Please confirm that our validation rules (minimum weight, dimensions) align with your requirements.

5. **Integration Status:** Please confirm that the integration is working correctly from your end and that all data is being received and processed as expected.

---

## Contact Information

If you need any clarification or have questions about our integration, please contact us:

**System:** KNEX Finance System  
**Environment:** Staging  
**API Base URL:** https://api-stg.epgl.ae

---

## Additional Notes

- This integration is currently in **staging environment**
- All test data provided is from our staging system
- We are ready to proceed to production after your confirmation
- We follow all best practices as outlined in your API documentation:
  - TLS 1.3 for secure connections
  - OAuth2 authentication
  - Proper error handling with retry logic
  - Rate limiting compliance
  - Descriptive User-Agent strings

---

**Thank you for your review and confirmation.**

*This document was generated on January 11, 2025*

