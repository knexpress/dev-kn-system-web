# CSV Bulk Invoice Upload Feature

## Overview

The CSV Bulk Invoice Upload feature allows users to automatically create invoices and delivery assignments by uploading a CSV file. This streamlines the process of generating multiple invoices at once.

## Features

1. **Automatic Invoice Creation**: Upload a CSV file containing invoice data to automatically create invoices
2. **Automatic Delivery Assignment**: Creates corresponding delivery assignments for invoices with delivery information
3. **Client Auto-creation**: Automatically creates client records if they don't exist
4. **Error Reporting**: Provides detailed error reports for any rows that fail to process
5. **Template Download**: Download a CSV template to ensure proper formatting

## Usage

### Step 1: Access the Feature

Navigate to the **Invoices** page in the dashboard. You'll see the "Bulk Invoice Upload" card at the top of the page.

### Step 2: Download Template (Optional but Recommended)

1. Click the "Download Template" button
2. A CSV template file (`invoice_bulk_upload_template.csv`) will be downloaded
3. Use this template as a reference for the required format

### Step 3: Prepare Your CSV File

Your CSV file should include the following columns (minimum required fields are marked with *):

#### Client Information
- **company_name*** (required if client doesn't exist) - Client's company name
- **contact_name*** (required if client doesn't exist) - Contact person's name
- **email*** (required if client doesn't exist) - Contact email
- **phone*** (required if client doesn't exist) - Contact phone number
- **client_address** - Client's address
- **client_city** - Client's city
- **client_country** - Client's country
- **client_id** - Existing client ID (if client already exists)

#### Invoice Information
- **amount*** (required) - Invoice amount
- **tax_rate** - Tax rate percentage (default: 0)
- **due_date** - Invoice due date (format: YYYY-MM-DD, default: 30 days from now)
- **description** - Line item description
- **quantity** - Line item quantity (default: 1)
- **notes** - Additional notes or remarks

#### Delivery Information (Optional)
- **delivery_type** - Type of delivery (COD, PREPAID, BANK_TRANSFER, WAREHOUSE_PICKUP)
- **delivery_address*** (required if creating delivery assignment) - Delivery address
- **delivery_instructions** - Special delivery instructions

#### Other Fields
- **invoice_id** - Custom invoice ID (optional, will be auto-generated if not provided)
- **request_id** - Associated request ID (optional)
- **line_items** - JSON array of line items (advanced)

### Step 4: Upload the CSV File

1. Click the "Select CSV File" button or drag and drop your CSV file
2. Click "Upload and Process"
3. Wait for the system to process your file
4. Review the summary showing:
   - Total rows processed
   - Number of invoices created
   - Number of delivery assignments created
   - Any errors encountered

### Step 5: Verify Results

The invoice list will automatically refresh after a successful upload. You should see:
- Newly created invoices in the invoices table
- Corresponding delivery assignments in the delivery assignments page (if delivery information was provided)

## CSV Format Example

```csv
company_name,contact_name,email,phone,client_address,client_city,client_country,amount,tax_rate,due_date,description,quantity,delivery_type,delivery_address,delivery_instructions,notes
ABC Company,John Doe,john@abc.com,+971501234567,123 Business St,Dubai,UAE,500,5,2024-12-31,Freight Service,1,COD,456 Customer Ave Dubai UAE,Call before delivery,Dispatch immediately
XYZ Corp,Jane Smith,jane@xyz.com,+971509876543,456 Main Rd,Abu Dhabi,UAE,1200,5,2024-12-31,Shipping Service,1,PREPAID,789 Warehouse St Abu Dhabi UAE,Signature required,Handle with care
```

## Important Notes

### Client Matching
- The system first tries to find existing clients by **company_name**
- If not found, it tries to find by **client_id**
- If neither exists, it creates a new client record
- All client information provided in the CSV will be used when creating a new client

### Amount Calculation
- If **tax_rate** is not provided, it defaults to 0
- Tax amount is calculated as: `(amount * tax_rate) / 100`
- Total amount = `amount + tax_amount`
- All amounts should be provided as positive numbers

### Delivery Assignments
- Delivery assignments are **only created** if either `delivery_address` or `delivery_type` is provided
- If `delivery_type` is not provided, it defaults to **COD**
- If `delivery_address` is not provided, it defaults to "Address to be confirmed"
- QR codes are automatically generated for delivery assignments

### Error Handling
- If a row fails to process, an error message will indicate the specific issue
- Common errors include:
  - Missing required client information when creating a new client
  - Invalid amount (must be greater than 0)
  - Invalid date format
  - Missing required fields
- The system continues processing other rows even if some fail

### Auto-Generated Fields
- **invoice_id**: Auto-generated if not provided (format: INV-000001, INV-000002, etc.)
- **client_id**: Auto-generated for new clients (format: CLT-000001, CLT-000002, etc.)
- **assignment_id**: Auto-generated for delivery assignments (format: DA-000001, DA-000002, etc.)
- **qr_code**: Auto-generated unique code for delivery assignments
- **qr_url**: Auto-generated URL for QR code payment

## Best Practices

1. **Start Small**: Test with a few rows before uploading large files
2. **Use Template**: Always download and use the template to ensure proper formatting
3. **Check Data**: Verify all amounts and dates before uploading
4. **Backup Data**: Keep a backup of your CSV file
5. **Review Errors**: Always review the error summary after upload
6. **Unique Client Names**: Ensure company names are unique to avoid client duplication
7. **Valid Dates**: Use YYYY-MM-DD format for dates
8. **Avoid Special Characters**: Keep contact information simple and avoid special characters in IDs

## Troubleshooting

### "No CSV file provided"
- Ensure you selected a file before clicking upload

### "CSV file is empty"
- Check that your CSV file has content and is not corrupted

### "Missing required client information"
- For new clients, ensure you provide: company_name, contact_name, email, and phone

### "Invalid amount (must be greater than 0)"
- Check that the amount column contains valid positive numbers

### "Only CSV files are allowed"
- Ensure your file has a `.csv` extension

### File size errors
- Maximum file size is 10MB
- Split large files into smaller batches if needed

## API Endpoints

### Upload CSV
```
POST /api/csv-upload/bulk-create
Content-Type: multipart/form-data
Body: { csvFile: File }
```

### Download Template
```
GET /api/csv-upload/template
```

## Technical Details

### Backend Processing
- Uses `multer` for file upload handling
- Uses `csv-parser` for CSV file parsing
- Processes rows sequentially to maintain data integrity
- Rolls back individual rows on error (does not affect other rows)
- Logs all processing steps for debugging

### Frontend Processing
- File validation before upload
- Progress indication during upload
- Detailed success/error reporting
- Automatic refresh of invoice list on success

## Future Enhancements

Potential future improvements:
- Bulk update of existing invoices
- Support for additional file formats (Excel, JSON)
- Drag and drop file upload
- Real-time progress tracking
- Import history and audit logs
- Column mapping for custom CSV formats


