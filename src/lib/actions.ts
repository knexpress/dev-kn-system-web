'use client';

import * as z from 'zod';
import { apiClient } from './api-client';

const clientSchema = z.object({
  company_name: z.string().min(2),
  contact_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
});

export async function addClient(values: z.infer<typeof clientSchema>) {
  try {
    const result = await apiClient.createClient(values);
    
    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to add client' };
    }
  } catch (error) {
    console.error('Error adding client:', error);
    return { success: false, error: 'Failed to add client' };
  }
}

const invoiceRequestSchema = z.object({
  client_id: z.string().nonempty("Client is required."),
  description: z.string().min(5, "Description must be at least 5 characters."),
  origin: z.string().min(2, "Origin is required."),
  destination: z.string().min(2, "Destination is required."),
  value: z.coerce.number().positive("Value must be a positive number.")
});

export async function createRequest(values: z.infer<typeof invoiceRequestSchema>) {
  try {
    // Generate AWB number
    const awbNumber = `AWB${Math.floor(Math.random() * 1000000)}`;
    
    const requestData = {
      client_id: values.client_id,
      awb_number: awbNumber,
      assigned_to_employee_id: 'default-employee-id', // This should come from auth context
      status: 'PENDING',
      delivery_status: 'SHIPPED'
    };

    const result = await apiClient.createRequest(requestData);
    
    if (result.success) {
      return { success: true, request: result.data };
    } else {
      return { success: false, error: result.error || 'Failed to create request' };
    }
  } catch (error) {
    console.error('Error creating request:', error);
    return { success: false, error: 'Failed to create request' };
  }
}

const operationalDetailsSchema = z.object({
  awbNumber: z.string().min(5),
  receiverName: z.string().min(2),
  weight: z.coerce.number().positive(),
  shipmentType: z.enum(["Docs", "Non-Docs", "Grocery", "Other"]),
  serviceType: z.enum(["Inbound", "Outbound", "Domestic"]),
  deliveryStatus: z.enum(["Completed", "RTS", "Pending"]),
});

export async function approveRequest(requestId: string, operationalDetails: z.infer<typeof operationalDetailsSchema>) {
  try {
    const statusData = {
      status: 'COMPLETED',
      delivery_status: operationalDetails.deliveryStatus === 'Completed' ? 'DELIVERED' : 'FAILED'
    };

    const result = await apiClient.updateRequestStatus(requestId, statusData);

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to approve request' };
    }
  } catch (error) {
    console.error('Error approving request:', error);
    return { success: false, error: 'Failed to approve request' };
  }
}

export async function updateRequestStatus(requestId: string, status: 'COMPLETED') {
  try {
    const statusData = {
      status: status,
      delivery_status: 'DELIVERED'
    };

    const result = await apiClient.updateRequestStatus(requestId, statusData);

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to update request status' };
    }
  } catch (error) {
    console.error('Error updating request status:', error);
    return { success: false, error: 'Failed to update request status' };
  }
}

export async function generateInvoice(requestId: string) {
  try {
    // Get the request details
    const requestResult = await apiClient.getRequests();
    
    if (!requestResult.success) {
      return { success: false, error: 'Failed to fetch request' };
    }

    const request = (requestResult.data as any[])?.find((req: any) => req._id === requestId);
    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    // Create invoice data
    const invoiceData = {
      request_id: requestId,
      client_id: request.client_id,
      amount: request.value || 0,
      issue_date: new Date().toISOString(),
      due_date: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Unpaid',
      line_items: [
        {
          id: '1',
          description: 'Freight Charges',
          quantity: 1,
          unit_price: request.value || 0,
        },
      ],
      tax_rate: 0,
    };

    // Note: This would need to be implemented in the backend
    // For now, just update the request status
    const statusResult = await apiClient.updateRequestStatus(requestId, {
      status: 'COMPLETED',
      delivery_status: 'DELIVERED'
    });

    if (statusResult.success) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to generate invoice' };
    }
  } catch (error) {
    console.error('Error generating invoice:', error);
    return { success: false, error: 'Failed to generate invoice' };
  }
}
