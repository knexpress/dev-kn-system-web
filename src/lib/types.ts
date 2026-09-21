import type { User as FirebaseUser } from 'firebase/auth';

export type Department = 'Sales' | 'Operations' | 'Finance' | 'HR' | 'Management' | 'IT' | 'Auditor';

export interface UserProfile {
  _id: string;
  email: string;
  full_name: string;
  department: DepartmentData;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  isActive: boolean;
  lastLogin?: string;
  employee_id?: string;
}

// New schema types
export interface DepartmentData {
  _id: string;
  name: string;
  description: string;
}

export interface EmployeeData {
  _id: string;
  full_name: string;
  email: string;
  department_id: string;
}

export interface ClientData {
  _id: string;
  company_name: string;
  contact_name: string;
  address: string;
}

export interface InvoiceEmbedded {
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  amount: number;
  base_rate: number;
  issuedAt: string;
}

export interface ChatMessage {
  employee_id: string;
  message: string;
  sentAt: string;
}

export interface RequestData {
  _id: string;
  client_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  awb_number: string;
  delivery_status: 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  assigned_to_employee_id: string;
  invoice?: InvoiceEmbedded;
  chatHistory: ChatMessage[];
}

export interface TicketData {
  _id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  reported_by_employee_id: string;
  assigned_to_employee_id: string;
  closedAt?: string;
}

export interface ReportData {
  _id: string;
  title: string;
  generated_by_employee_id: string;
  report_data: any;
  generatedAt: string;
}

// Legacy types for backward compatibility
export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export type RequestStatus = 'Pending' | 'In-Transit' | 'Delivered' | 'Invoiced' | 'Completed';
export type ShipmentType = 'Docs' | 'Non-Docs' | 'Grocery' | 'Other';
export type ServiceType = 'Inbound' | 'Outbound' | 'Domestic';
export type DeliveryStatus = 'Completed' | 'RTS' | 'Pending';

export interface Request {
  id: string;
  clientId: string;
  clientName?: string;
  description: string;
  origin: string;
  destination: string;
  status: RequestStatus;
  deliveryDate?: string;
  value?: number;
  awbNumber?: string;
  receiverName?: string;
  shipmentType?: ShipmentType;
  serviceType?: ServiceType;
  deliveryStatus?: DeliveryStatus;
  weight?: number; // in kg
}

export interface InvoiceLineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface Invoice {
  id: string;
  requestId: string;
  clientId: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'Paid' | 'Unpaid';
  client?: Client;
  request?: Request;
  lineItems?: InvoiceLineItem[];
  taxRate?: number;
  notes?: string;
}
