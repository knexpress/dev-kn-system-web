# Historical Upload Feature Specification

## Overview
This feature allows uploading historical shipment data (from January 1st to September 29th) directly to the EMPOST database without creating delivery assignments or QR codes.

## CSV Column Structure

The CSV file for historical upload must contain the following columns (in any order):

1. **CustomerName** - Name of the customer/sender
2. **AWBNo** - Air Waybill Number
3. **TransactionDate** - Date of the transaction (format: YYYY-MM-DD or similar)
4. **OriginCountry** - Origin country
5. **OriginCity** - Origin city
6. **DestinationCountry** - Destination country
7. **DestinationCity** - Destination city
8. **ShipmentType** - Type of shipment (e.g., Docs, Non-Docs, etc.)
9. **ShipmentStatus** - Status of the shipment
10. **Weight** - Weight of the shipment (in kg)
11. **Delivery Charge** - Delivery charge amount
12. **Dispatcher** - Dispatcher information
13. **AdditionalInfo1** - Additional information field 1
14. **AdditionalInfo2** - Additional information field 2

## Date Filtering

- Only rows with `TransactionDate` between **January 1st** and **September 29th** should be processed
- Rows outside this date range should be skipped and reported as errors

## Processing Flow

1. **Parse CSV File**
   - Read and validate CSV structure
   - Map columns to expected field names (case-insensitive matching recommended)

2. **Filter by Date**
   - Parse `TransactionDate` column
   - Filter rows where date is between 2024-01-01 and 2024-09-29 (or current year equivalent)
   - Log skipped rows with reason

3. **For Each Valid Row:**
   - Map CSV data to EMPOST shipment format
   - Call EMPOST API: `POST /api/v1/shipment/create`
   - Store returned UHAWB if successful
   - Create audit report entry in Report model
   - Do NOT create delivery assignments
   - Do NOT generate QR codes

4. **Create Audit Report Entry**
   - For each successfully processed row, create a Report document:
     ```javascript
     {
       title: "Historical Upload",
       generated_by_employee_id: ObjectId (current user),
       report_data: {
         awb_number: AWBNo,
         transaction_date: TransactionDate,
         customer_name: CustomerName,
         origin_country: OriginCountry,
         origin_city: OriginCity,
         destination_country: DestinationCountry,
         destination_city: DestinationCity,
         shipment_type: ShipmentType,
         shipment_status: ShipmentStatus,
         weight: Weight,
         delivery_charge: Delivery Charge,
         dispatcher: Dispatcher,
         additional_info1: AdditionalInfo1,
         additional_info2: AdditionalInfo2,
         empost_uhawb: UHAWB (from EMPOST API response),
         upload_type: "historical",
         uploaded_at: Date
       },
       generatedAt: Date
     }
     ```

## API Endpoint

### POST `/api/csv-upload/historical`

**Request:**
- Content-Type: `multipart/form-data`
- Body: `csvFile` (file)

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_rows": 100,
    "rows_processed": 95,
    "rows_filtered_by_date": 3,
    "shipments_created": 95,
    "audit_entries_created": 95,
    "errors": 5
  },
  "errors": [
    {
      "row": 10,
      "error": "Invalid date format",
      "awb": "AWB123"
    },
    {
      "row": 15,
      "error": "Date outside range (2024-10-01)",
      "awb": "AWB456"
    }
  ]
}
```

## Template Endpoint

### GET `/api/csv-upload/historical-template`

Returns a CSV file with headers:
```csv
CustomerName,AWBNo,TransactionDate,OriginCountry,OriginCity,DestinationCountry,DestinationCity,ShipmentType,ShipmentStatus,Weight,Delivery Charge,Dispatcher,AdditionalInfo1,AdditionalInfo2
```

## Error Handling

- Invalid date formats should be logged but not stop processing
- EMPOST API failures should be logged but processing should continue
- All errors should be collected and returned in the response
- Partial success is acceptable (some rows succeed, some fail)

## Notes

- This is a one-time data migration feature for historical records
- No invoices are created in the system
- No delivery assignments are created
- No QR codes are generated
- Only EMPOST shipment creation and audit logging occur


