import { Client, Request, Invoice, Department } from './types';
import { apiClient } from './api-client';
import { secureLog } from './secure-logger';

// Functions to fetch data from MongoDB API - NO MOCK DATA
export async function fetchClients(): Promise<Client[]> {
  try {
    const result = await apiClient.getClients();
    if (result.success) {
      return (result.data as Client[]) || [];
    }
    // Handle rate limiting gracefully
    if (result.error === 'Rate limited') {
      secureLog.debug('Rate limited for clients, returning empty array');
      return [];
    }
    throw new Error(result.error || 'Failed to fetch clients');
  } catch (error) {
    secureLog.error('Error fetching clients', error);
    return []; // Return empty array instead of mock data
  }
}

export async function fetchRequests(): Promise<Request[]> {
  try {
    const result = await apiClient.getRequests();
    if (result.success) {
      return (result.data as Request[]) || [];
    }
    // Handle rate limiting gracefully
    if (result.error === 'Rate limited') {
      secureLog.debug('Rate limited for requests, returning empty array');
      return [];
    }
    throw new Error(result.error || 'Failed to fetch requests');
  } catch (error) {
    secureLog.error('Error fetching requests', error);
    return []; // Return empty array instead of mock data
  }
}

export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const result = await apiClient.getInvoices();
    
    if (result.success && result.data) {
      // Handle the new response structure: { success: true, data: invoices }
      const invoices = Array.isArray(result.data) ? result.data : [];
      return invoices;
    }
    throw new Error(result.error || 'Failed to fetch invoices');
  } catch (error) {
    secureLog.error('Error fetching invoices', error);
    return []; // Return empty array instead of mock data
  }
}

// Department list - this is static data
export const departments: Department[] = ['Sales', 'Operations', 'Finance', 'HR', 'Management', 'IT', 'Auditor'];
