# EMPOST Shipment Creation - Field Analysis

## Required Fields for EMPOST Shipment Creation

Based on the EMPOST API payload structure, here's what's required vs what you have:

### ✅ Available from CSV Columns

| EMPOST Field | CSV Column | Status |
|-------------|-----------|--------|
| `trackingNumber` | AWBNo | ✅ Available |
| `details.weight.value` | Weight | ✅ Available |
| `details.deliveryCharges.amount` | Delivery Charge | ✅ Available |
| `details.pickupDate` | TransactionDate | ✅ Available |
| `sender.city` | OriginCity | ✅ Available |
| `receiver.city` | DestinationCity | ✅ Available |
| `details.shippingType` | Can infer from OriginCountry/DestinationCountry | ⚠️ Can be derived |
| `details.productCategory` | ShipmentType (may need mapping) | ⚠️ May need mapping |

### ❌ Missing Critical Fields

| EMPOST Field | Required? | Solution |
|-------------|----------|----------|
| **sender.name** | ✅ Required | Only have `CustomerName` - may need to use this |
| **sender.email** | ✅ Required | ❌ **MISSING** - Need default or lookup |
| **sender.phone** | ✅ Required | ❌ **MISSING** - Need default or lookup |
| **sender.countryCode** | ✅ Required | Have `OriginCountry` but need ISO code (e.g., "AE", "US") |
| **sender.line1** (address) | ✅ Required | ❌ **MISSING** - Only have city |
| **receiver.name** | ✅ Required | ❌ **MISSING** - Not in CSV |
| **receiver.phone** | ✅ Required | ❌ **MISSING** - Not in CSV |
| **receiver.countryCode** | ✅ Required | Have `DestinationCountry` but need ISO code |
| **receiver.line1** (address) | ✅ Required | ❌ **MISSING** - Only have city |
| **details.dimensions** | ✅ Required | ❌ **MISSING** - Need length, width, height |
| **items[]** array | ✅ Required | ❌ **MISSING** - Need at least one item |

### ⚠️ Fields That Can Use Defaults

| Field | Default Value | Notes |
|-------|--------------|-------|
| `sender.email` | Can use default like "noreply@company.com" | ⚠️ May cause issues |
| `sender.phone` | Can use default like "+971500000000" | ⚠️ May cause issues |
| `receiver.email` | Can use empty string "" | ✅ Usually optional |
| `receiver.phone` | Can use default | ⚠️ May cause issues |
| `details.dimensions` | Can calculate from weight or use defaults | ⚠️ May need minimum values |
| `details.productCategory` | "Electronics" | ✅ Can default |
| `details.productType` | "Parcel" | ✅ Can default |
| `details.shippingType` | "INT" (International) or "DOM" (Domestic) | ✅ Can infer from countries |
| `details.numberOfPieces` | 1 | ✅ Can default |
| `items[].countryOfOrigin` | "AE" | ✅ Can default |
| `items[].hsCode` | "8504.40" | ✅ Can default |
| `items[].quantity` | 1 | ✅ Can default |

## Recommendations

### Option 1: Use Defaults (Quick but Risky)
- Use default values for missing sender/receiver contact info
- Use default dimensions calculated from weight
- **Risk**: EMPOST may reject shipments with invalid contact info

### Option 2: Add Missing Columns (Recommended)
Add these columns to the CSV:
- **SenderEmail** - Sender email address
- **SenderPhone** - Sender phone number
- **SenderAddress** - Sender full address
- **ReceiverName** - Receiver name
- **ReceiverPhone** - Receiver phone number
- **ReceiverAddress** - Receiver full address
- **Length** (optional) - Package length in CM
- **Width** (optional) - Package width in CM
- **Height** (optional) - Package height in CM

### Option 3: Lookup from Database
- Lookup sender info from Client database using `CustomerName`
- Use client's stored email, phone, and address
- **Risk**: Historical data may not have matching clients

### Option 4: Hybrid Approach (Best)
- Try to lookup sender from Client database using `CustomerName`
- If not found, use defaults with a flag
- For receiver, use defaults or parse from AdditionalInfo fields
- Log all shipments created with defaults for review

## Current CSV Columns Analysis

Your current columns:
1. ✅ CustomerName - Can be used for sender.name
2. ✅ AWBNo - Used for trackingNumber
3. ✅ TransactionDate - Used for pickupDate
4. ✅ OriginCountry - Need to convert to countryCode (e.g., "UAE" → "AE")
5. ✅ OriginCity - Used for sender.city
6. ✅ DestinationCountry - Need to convert to countryCode
7. ✅ DestinationCity - Used for receiver.city
8. ✅ ShipmentType - Can map to productCategory
9. ✅ ShipmentStatus - Can use for deliveryStatus
10. ✅ Weight - Used for weight.value
11. ✅ Delivery Charge - Used for deliveryCharges.amount
12. ✅ Dispatcher - Can store in AdditionalInfo
13. ✅ AdditionalInfo1 - May contain receiver name or address
14. ✅ AdditionalInfo2 - May contain receiver phone or other info

## Conclusion

**The current columns are NOT sufficient** for creating EMPOST shipments without:
1. Using default/placeholder values for missing required fields
2. OR adding more columns to the CSV
3. OR implementing a lookup mechanism from existing client database

**Recommended Action**: 
- Check if `AdditionalInfo1` and `AdditionalInfo2` contain receiver information
- If yes, parse those fields
- If no, add the missing columns or implement client lookup
- Use sensible defaults for dimensions and other optional fields


