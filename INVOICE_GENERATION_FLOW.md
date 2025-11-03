# Invoice Generation & Payment Tracking Flow

## Complete Workflow

### 1. Invoice Request Created by Sales
- **Action**: Sales creates an invoice request
- **Status**: `DRAFT` → `SUBMITTED`
- **Location**: Invoice Requests page
- **Created by**: Sales Department

### 2. Operations Verification
- **Action**: Operations verifies the request details (weight, dimensions, commodities)
- **Status**: `SUBMITTED` → `IN_PROGRESS` → `VERIFIED`
- **Location**: Invoice Requests page (Operations view)
- **Updated by**: Operations Department

### 3. Finance Generates Invoice
- **Action**: Finance generates invoice (normal or tax invoice)
- **Location**: Invoice Requests page (Finance view)
- **What happens**:
  - Invoice created in database ✓
  - **Delivery Assignment created with QR code** ✓
  - **Collection entry created for payment tracking** ✓
  - **Shipment status updated to DELIVERED** ✓
  - Invoice request status changed to `COMPLETED`
- **Created by**: Finance Department

### 4. Post-Invoice Generation (Automatic)

#### A. Delivery Assignment
- **Purpose**: Track payment collection by **DRIVERS** via QR code
- **Who uses it**: Drivers scan QR to mark payment received
- **Finance use**: Check which drivers have collected payments and remit from them
- **Fields**:
  - `assignment_id`: Auto-generated (e.g., DA-000001)
  - `request_id`: Reference to original shipment request
  - `invoice_id`: Reference to generated invoice
  - `client_id`: Customer information
  - `amount`: Total amount to collect
  - `driver_id`: **Can be assigned later or left empty for warehouse collection**
  - `qr_code`: Unique QR code
  - `qr_url`: Payment URL (e.g., `/qr-payment/abc123`)
  - `delivery_type`: 'COD'
  - `status`: 'PENDING'
  - `payment_collected`: false (driver marks this as true when collecting payment)
- **Location**: Delivery Assignments page

#### B. Collection Entry
- **Purpose**: Track payment status for accounting
- **Fields**:
  - `invoice_id`: Reference to invoice
  - `client_name`: Customer name
  - `amount`: Total amount
  - `due_date`: Payment due date
  - `status`: 'not_paid' (pending)
  - `payment_method`: null
  - `paid_at`: null
- **Location**: Collections page
- **Purpose**: Track which invoices are paid/pending

#### C. Shipment Status Update
- **Action**: Update cargo status to `DELIVERED`
- **Purpose**: Mark shipment as completed
- **Fields updated**:
  - `delivery_status`: 'DELIVERED'
- **Location**: Shipment requests

### 5. Payment Collection Flow

#### A. Via QR Code (Driver Collection)
1. Driver collects payment from customer at delivery
2. Driver scans QR code on delivery assignment
3. Opens payment page: `/qr-payment/{qr_code}`
4. Driver enters payment details:
   - Payment method (CASH, BANK_TRANSFER, CARD, CHEQUE)
   - Payment reference
   - Notes
5. Submit payment
6. **Automatic updates**:
   - Delivery Assignment: `payment_collected = true`, `qr_used = true`, `payment_collected_at = timestamp`
   - Collection: `status = 'paid'`, `paid_at = timestamp`
   - Invoice: `status = 'PAID'`

#### B. Manual Collection by Employee/Finance
1. Employee collects payment from customer at warehouse
2. Update collection in Collections page:
   - Change status to 'paid'
   - Enter payment method
   - System records `paid_at` timestamp
3. **Automatic updates**:
   - Delivery Assignment: `payment_collected = true` (if linked)
   - Invoice: `status = 'PAID'`

#### C. Finance Remits from Drivers
1. Finance views Delivery Assignments
2. Sees which assignments have `payment_collected = true`
3. Driver hands over collected cash/payments to Finance
4. Finance creates Payment Remittance record
5. Finance confirms collection status

### 6. Remittance (Finance from Drivers)
- **Driver collects payments** at delivery and updates via QR
- **Finance sees collection status** in Delivery Assignments
- Finance creates **Payment Remittance** record:
  - Links to delivery assignments with payments collected
  - Records total amount collected by driver
  - Driver hands over cash/payments to Finance
- Finance confirms and reconciles
- Status: `PENDING` → `CONFIRMED` → `RECONCILED`

---

## Key Points

✅ **Invoice Generation** → Creates Invoice, Delivery Assignment (with QR), and Collection entry  
✅ **QR Code** → Driver scans to mark payment received at delivery  
✅ **Driver Collection** → Driver collects payment and scans QR to update status  
✅ **Finance Remittance** → Finance tracks which drivers have collected and remits from them  
✅ **Payment Tracking** → Separate collection entry tracks payment status for accounting  
✅ **Shipment Status** → Automatically updated to DELIVERED  
✅ **Status Updates** → Payment updates both Delivery Assignment and Collection

---

## Database Collections

1. **Invoice** - Billing document
2. **DeliveryAssignment** - QR payment tracking
3. **Collection** - Accounting payment tracking
4. **ShipmentRequest** - Cargo status tracking

All are automatically created/updated when invoice is generated.

