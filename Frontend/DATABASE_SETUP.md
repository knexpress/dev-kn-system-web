# MongoDB Database Setup - Updated Schema

## Overview
The KNEX Finance Management System has been redesigned with a comprehensive MongoDB schema following best practices for data modeling, performance, and scalability.

## Database Connection
- **MongoDB URI**: `mongodb+srv://aliabdullah:knex22939@finance.gk7t9we.mongodb.net/finance?retryWrites=true&w=majority&appName=Finance`
- **Database Name**: `finance`
- **Connection**: Configured in `src/lib/mongodb.ts`

## Core Design Principles

### 1. Embedding over Referencing
- Related data is embedded where it improves read performance
- Referencing is used for many-to-one or many-to-many relationships to avoid data duplication

### 2. Data Integrity
- MongoDB schema validation enforces required fields, data types, and enum values
- Unique constraints on critical fields (email, AWB numbers, etc.)

### 3. Performance Optimization
- Strategic indexing on frequently queried fields
- Compound indexes for complex queries

## Database Collections

### 1. departments Collection
**Purpose**: Stores company department information
```typescript
{
  _id: ObjectId,
  name: String (unique), // e.g., "Sales", "Operations"
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: Unique index on `name`

### 2. users Collection
**Purpose**: Application user authentication and access control
```typescript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  full_name: String,
  department_id: ObjectId (ref: Department),
  employee_id?: ObjectId (ref: Employee), // Optional - links to employee
  role: Enum ['SUPERADMIN', 'ADMIN', 'USER'],
  isActive: Boolean,
  lastLogin?: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: 
- Unique index on `email`
- Index on `department_id`
- Index on `role`

**Key Features**:
- **Employee Validation**: Users can only be created from existing employees
- **Password Security**: Automatic bcrypt hashing
- **Role-Based Access**: SUPERADMIN, ADMIN, USER roles
- **Account Management**: Enable/disable user accounts
- **Superadmin Protection**: Cannot delete superadmin users

### 3. employees Collection
**Purpose**: Manages employee data with department references
```typescript
{
  _id: ObjectId,
  full_name: String,
  email: String (unique),
  department_id: ObjectId (ref: Department),
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: Unique index on `email`, index on `department_id`

### 4. clients Collection
**Purpose**: Stores customer information
```typescript
{
  _id: ObjectId,
  company_name: String,
  contact_name: String,
  address: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 5. requests Collection (Central Collection)
**Purpose**: Core operational collection tracking shipments from start to finish
```typescript
{
  _id: ObjectId,
  client_id: ObjectId (ref: Client),
  status: Enum ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  awb_number: String (unique),
  delivery_status: Enum ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
  assigned_to_employee_id: ObjectId (ref: Employee),
  
  // Embedded Invoice Document
  invoice?: {
    status: Enum ['DRAFT', 'SENT', 'PAID', 'OVERDUE'],
    amount: Decimal128,
    base_rate: Decimal128,
    issuedAt: Date
  },
  
  // Embedded Chat History Array
  chatHistory: [{
    employee_id: ObjectId (ref: Employee),
    message: String,
    sentAt: Date
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: 
- `client_id`
- `status`
- `awb_number` (unique)
- `assigned_to_employee_id`

### 6. tickets Collection
**Purpose**: Internal support ticket management
```typescript
{
  _id: ObjectId,
  title: String,
  description: String,
  status: Enum ['OPEN', 'IN_PROGRESS', 'CLOSED'],
  reported_by_employee_id: ObjectId (ref: Employee),
  assigned_to_employee_id: ObjectId (ref: Employee),
  closedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: 
- `status`
- `reported_by_employee_id`
- `assigned_to_employee_id`

### 7. reports Collection
**Purpose**: Generated reports storage
```typescript
{
  _id: ObjectId,
  title: String,
  generated_by_employee_id: ObjectId (ref: Employee),
  report_data: Mixed (Flexible BSON object),
  generatedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 8. cash_tracker Collection (Polymorphic Pattern)
**Purpose**: Central ledger for all financial movements
```typescript
{
  _id: String, // Custom ID like "CT-2025-00001"
  category: Enum ['RECEIVABLES', 'PAYABLES', 'PAYROLL', 'CAPITAL_EXPENDITURE', 'INVESTMENT', 'FINANCING', 'OPERATIONAL_EXPENSE', 'TAX', 'OWNER_DRAW'],
  amount: Decimal128,
  direction: Enum ['IN', 'OUT'],
  payment_method: Enum ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET'],
  notes?: String,
  entity_id?: ObjectId, // Polymorphic reference
  entity_type: Enum ['clients', 'suppliers', 'employees', 'assets', 'investors', 'N/A'],
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: 
- Compound index on `[entity_id, entity_type]`
- Index on `createdAt`

## Key Features

### Embedded Documents
- **Invoice**: Embedded in requests for fast access to billing information
- **Chat History**: Array of messages embedded in requests for real-time communication

### Polymorphic References
- **Cash Tracker**: Single collection handles all transaction types with flexible entity relationships
- **Entity Types**: Supports linking transactions to clients, suppliers, employees, etc.

### Financial Precision
- **Decimal128**: Used for all monetary amounts to avoid floating-point errors
- **Custom IDs**: Human-readable transaction IDs for easy reference

## API Routes
Updated API routes for the new schema:

- `POST /api/auth/login` - User authentication
- `GET /api/users` - Fetch all users with populated data
- `POST /api/users` - Create new user (from existing employee)
- `PUT /api/users/[id]` - Update user (role, status, password)
- `DELETE /api/users/[id]` - Delete user (except superadmin)
- `GET /api/employees/available` - Get employees without user accounts
- `GET /api/departments` - Fetch all departments
- `GET /api/employees` - Fetch employees with populated department data
- `GET /api/clients` - Fetch all clients
- `GET /api/requests` - Fetch requests with populated client, employee, and chat data
- `GET /api/tickets` - Fetch tickets with populated employee data
- `GET /api/reports` - Fetch reports with populated employee data
- `GET /api/cash-flow` - Fetch cash tracker transactions

## Database Seeding
Enhanced seeding script with comprehensive sample data:

```bash
npm run seed
```

**Seeded Data**:
- 7 Departments (Sales, Operations, Finance, HR, Management, IT, Auditor)
- 1 Superadmin User (aliabdullah@knex.com)
- 7 Employees (one per department)
- 3 Sample Clients
- 2 Sample Requests with embedded invoices and chat history
- 2 Sample Tickets
- 1 Sample Report
- 4 Sample Cash Transactions with polymorphic references

## Usage Instructions

1. **Start Development Server**: `npm run dev`
2. **Seed Database**: `npm run seed`
3. **Access Application**: `http://localhost:9002`
4. **Login**: Use any seeded employee email (e.g., `sales@cargologix.com`)

## Migration Notes

### From Previous Schema
- **User** → **Employee** (with department references)
- **InternalRequest** → **Ticket** (with employee references)
- **CashFlowTransaction** → **CashTracker** (with polymorphic pattern)
- **Invoice** → Embedded in **Request** collection
- **Request** → Enhanced with embedded documents and proper indexing

### Backward Compatibility
- Legacy types maintained in `types.ts` for gradual migration
- API routes support both old and new data structures
- Fallback to mock data if API calls fail

## Performance Optimizations

### Indexing Strategy
- **Unique Indexes**: Email addresses, AWB numbers, department names
- **Compound Indexes**: Entity relationships in cash tracker
- **Query Indexes**: Status fields, employee assignments, timestamps

### Data Access Patterns
- **Read-Heavy**: Embedded documents reduce join operations
- **Write-Optimized**: Minimal document updates with atomic operations
- **Scalable**: Proper referencing prevents document size limits

## Next Steps
- Implement real-time updates with WebSockets
- Add data analytics and reporting features
- Implement advanced search and filtering
- Add data backup and recovery procedures
- Performance monitoring and optimization
