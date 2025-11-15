// API Client for Backend Communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    // Create a unique key for this request to enable deduplication
    const requestKey = `${options.method || 'GET'}:${endpoint}`;
    
    // If there's already a pending request for this endpoint, return it
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const requestPromise = this.executeRequest<T>(endpoint, options);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // Add authorization header if token is available
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        headers,
        ...options,
      });

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429) {
          console.log('Rate limited, request will be retried later');
          // Wait a bit before returning to avoid immediate retries
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { success: false, error: 'Rate limited' };
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        return { success: false, error: errorData.error || 'Request failed' };
      }

      const data = await response.json();
      
      // For auth endpoints, return the data directly wrapped in success
      if (endpoint.includes('/auth/')) {
        return { success: true, data };
      }
      
      // For other endpoints, if the response already has success/data structure, return it directly
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data;
      }
      
      // Otherwise wrap in standard format
      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store token if login is successful
    if (result.success && (result.data as any)?.token) {
      this.setToken((result.data as any).token);
    }
    
    return result;
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Departments
  async getDepartments() {
    return this.request('/departments');
  }

  async createDepartment(departmentData: any) {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
  }

  // Employees
  async getEmployees() {
    return this.request('/employees');
  }

  async getAvailableEmployees() {
    return this.request('/employees/available');
  }

  async createEmployee(employeeData: any) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  // Clients
  async getClients() {
    return this.request('/clients');
  }

  async createClient(clientData: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  async updateClient(id: string, clientData: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Requests
  async getRequests() {
    return this.request('/requests');
  }

  async createRequest(requestData: any) {
    return this.request('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async updateRequestStatus(id: string, statusData: any) {
    return this.request(`/requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async addChatMessage(id: string, messageData: any) {
    return this.request(`/requests/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Tickets
  async getTickets() {
    return this.request('/tickets');
  }

  async createTicket(ticketData: any) {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  }

  async updateTicketStatus(id: string, statusData: any) {
    return this.request(`/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  // Internal Requests
  async getInternalRequests() {
    return this.request('/internal-requests');
  }

  async createInternalRequest(internalRequestData: any) {
    return this.request('/internal-requests', {
      method: 'POST',
      body: JSON.stringify(internalRequestData),
    });
  }

  async updateInternalRequestStatus(id: string, statusData: any) {
    return this.request(`/internal-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async assignInternalRequest(id: string, assignData: any) {
    return this.request(`/internal-requests/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify(assignData),
    });
  }

  async getInternalRequestsByDepartment(departmentId: string) {
    return this.request(`/internal-requests/department/${departmentId}`);
  }

  // Reports
  async getReports() {
    return this.request('/reports');
  }

  async createReport(reportData: any) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  // Cash Tracker
  async getCashTransactions() {
    return this.request('/cash-tracker');
  }

  async createCashTransaction(transactionData: any) {
    return this.request('/cash-tracker', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async getCashFlowSummary() {
    return this.request('/cash-tracker/summary');
  }

  // Invoice Requests
  async getInvoiceRequests() {
    return this.request('/invoice-requests');
  }

  async getInvoiceRequestsByStatus(status: string) {
    return this.request(`/invoice-requests/status/${status}`);
  }

  async getInvoiceRequestsByDeliveryStatus(deliveryStatus: string) {
    return this.request(`/invoice-requests/delivery-status/${deliveryStatus}`);
  }

  async createInvoiceRequest(invoiceRequestData: any) {
    return this.request('/invoice-requests', {
      method: 'POST',
      body: JSON.stringify(invoiceRequestData),
    });
  }

  async updateInvoiceRequest(id: string, invoiceRequestData: any) {
    return this.request(`/invoice-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceRequestData),
    });
  }

  async updateInvoiceRequestStatus(id: string, statusData: any) {
    return this.request(`/invoice-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async updateDeliveryStatus(id: string, deliveryStatusData: any) {
    return this.request(`/invoice-requests/${id}/delivery-status`, {
      method: 'PUT',
      body: JSON.stringify(deliveryStatusData),
    });
  }

  async updateWeight(id: string, weightData: any) {
    return this.request(`/invoice-requests/${id}/weight`, {
      method: 'PUT',
      body: JSON.stringify(weightData),
    });
  }

  async updateVerification(id: string, verificationData: any) {
    return this.request(`/invoice-requests/${id}/verification`, {
      method: 'PUT',
      body: JSON.stringify(verificationData),
    });
  }

  async completeVerification(id: string, verificationData: any) {
    return this.request(`/invoice-requests/${id}/complete-verification`, {
      method: 'PUT',
      body: JSON.stringify(verificationData),
    });
  }

  async deleteInvoiceRequest(id: string) {
    return this.request(`/invoice-requests/${id}`, {
      method: 'DELETE',
    });
  }

  // Collections
  async getCollections() {
    return this.request('/collections');
  }

  async getCollection(id: string) {
    return this.request(`/collections/${id}`);
  }

  async updateCollectionStatus(id: string, statusData: any) {
    return this.request(`/collections/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  }

  async createCollection(collectionData: any) {
    return this.request('/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    });
  }

  async deleteCollection(id: string) {
    return this.request(`/collections/${id}`, {
      method: 'DELETE',
    });
  }

  async getCollectionsSummary() {
    return this.request('/collections/summary/stats');
  }

  // Notifications
  async getNotificationCounts() {
    return this.request('/notifications/counts');
  }

  async markAsViewed(type: string, itemId: string) {
    return this.request(`/notifications/mark-viewed`, {
      method: 'POST',
      body: JSON.stringify({ type, itemId }),
    });
  }

  async markAllAsViewed(type: string) {
    return this.request(`/notifications/mark-all-viewed`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  // Invoices
  // Invoices (Unified)
  async getInvoicesUnified() {
    return this.request('/invoices-unified');
  }

  async getInvoiceUnified(id: string) {
    return this.request(`/invoices-unified/${id}`);
  }

  async remitInvoiceUnified(id: string) {
    return this.request(`/invoices-unified/${id}/remit`, {
      method: 'PATCH',
    });
  }

  async createInvoiceUnified(invoiceData: any) {
    return this.request('/invoices-unified', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoiceUnified(id: string, invoiceData: any) {
    return this.request(`/invoices-unified/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoiceStatusUnified(id: string, statusData: any) {
    return this.request(`/invoices-unified/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  // Shipment Status Updates
  async updateShipmentStatus(requestId: string, statusData: any) {
    return this.request(`/unified-shipment-requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async deleteInvoiceUnified(id: string) {
    return this.request(`/invoices-unified/${id}`, {
      method: 'DELETE',
    });
  }

  async getInvoicesByClientUnified(clientId: string) {
    return this.request(`/invoices-unified/client/${clientId}`);
  }

  async getInvoicesByStatusUnified(status: string) {
    return this.request(`/invoices-unified/status/${status}`);
  }

  // Invoices (Legacy)
  async getInvoices() {
    return this.request('/invoices');
  }

  async createInvoice(invoiceData: any) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoice(id: string, invoiceData: any) {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // Performance
  async getDepartmentPerformance(department: string) {
    return this.request(`/performance/department/${department}`);
  }

  // ========================================
  // QR PAYMENT COLLECTION SYSTEM
  // ========================================

  // Drivers
  async getDrivers() {
    return this.request('/drivers');
  }

  async getDriver(id: string) {
    return this.request(`/drivers/${id}`);
  }

  async createDriver(driverData: any) {
    return this.request('/drivers', {
      method: 'POST',
      body: JSON.stringify(driverData),
    });
  }

  async updateDriver(id: string, driverData: any) {
    return this.request(`/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(driverData),
    });
  }

  async deleteDriver(id: string) {
    return this.request(`/drivers/${id}`, {
      method: 'DELETE',
    });
  }

  // Delivery Assignments
  async getDeliveryAssignments() {
    return this.request('/delivery-assignments');
  }

  async getDeliveryAssignment(id: string) {
    return this.request(`/delivery-assignments/${id}`);
  }

  async createDeliveryAssignment(assignmentData: any) {
    return this.request('/delivery-assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async updateDeliveryAssignment(id: string, assignmentData: any) {
    return this.request(`/delivery-assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async updateDeliveryAssignmentByQR(qrCode: string, assignmentData: any) {
    return this.request(`/delivery-assignments/qr/${qrCode}/status`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async getDeliveryAssignmentByInvoice(invoiceId: string) {
    return this.request(`/delivery-assignments/by-invoice/${invoiceId}`);
  }

  async getDeliveryAssignmentByQR(qrCode: string) {
    return this.request(`/delivery-assignments/qr/${qrCode}`);
  }

  async processQRPayment(qrCode: string, paymentData: any) {
    return this.request(`/delivery-assignments/qr/${qrCode}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getDriverAssignments(driverId: string) {
    return this.request(`/delivery-assignments/driver/${driverId}`);
  }

  // QR Payment Sessions
  async getQRPaymentSessions() {
    return this.request('/qr-payment-sessions');
  }

  async getQRPaymentSession(id: string) {
    return this.request(`/qr-payment-sessions/${id}`);
  }

  async getQRPaymentSessionByQR(qrCode: string) {
    return this.request(`/qr-payment-sessions/qr/${qrCode}`);
  }

  async getAssignmentQRPaymentSessions(assignmentId: string) {
    return this.request(`/qr-payment-sessions/assignment/${assignmentId}`);
  }

  async updateQRPaymentSession(id: string, sessionData: any) {
    return this.request(`/qr-payment-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  }

  async cancelQRPaymentSession(id: string) {
    return this.request(`/qr-payment-sessions/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // INTER-DEPARTMENT CHAT API
  // ========================================

  // Chat Rooms
  async getChatRooms(userId?: string, departmentId?: string) {
    let url = '/chat/rooms';
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (departmentId) params.append('department_id', departmentId);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request(url);
  }

  async createDirectChatRoom(userId1: string, userId2: string) {
    return this.request('/chat/rooms/direct', {
      method: 'POST',
      body: JSON.stringify({ user_id_1: userId1, user_id_2: userId2 }),
    });
  }

  async getChatRoom(roomId: string) {
    return this.request(`/chat/rooms/${roomId}`);
  }

  async createChatRoom(roomData: {
    name: string;
    description?: string;
    department_ids: string[];
    created_by?: string;
  }) {
    return this.request('/chat/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async updateChatRoom(roomId: string, roomData: {
    name?: string;
    description?: string;
    department_ids?: string[];
    is_active?: boolean;
  }) {
    return this.request(`/chat/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  }

  async deleteChatRoom(roomId: string) {
    return this.request(`/chat/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }

  // Chat Messages
  async getChatMessages(roomId: string, limit?: number, before?: string) {
    let url = `/chat/rooms/${roomId}/messages`;
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request(url);
  }

  async sendChatMessage(roomId: string, messageData: {
    sender_id: string;
    message: string;
    message_type?: 'text' | 'file' | 'image' | 'system';
    reply_to?: string;
  }) {
    return this.request(`/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async markMessageAsRead(messageId: string, employeeId: string) {
    return this.request(`/chat/messages/${messageId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  }

  async markRoomAsRead(roomId: string, employeeId: string) {
    return this.request(`/chat/rooms/${roomId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  }

  async getUnreadCount(employeeId: string, roomId?: string) {
    let url = `/chat/unread-count?employee_id=${employeeId}`;
    if (roomId) url += `&room_id=${roomId}`;
    return this.request(url);
  }

  async getChatHistory(roomId: string, page?: number, limit?: number) {
    let url = `/chat/rooms/${roomId}/history`;
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (params.toString()) url += `?${params.toString()}`;
    return this.request(url);
  }

  async deleteChatMessage(messageId: string) {
    return this.request(`/chat/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Available Users for Chat
  async getAvailableUsers(currentUserId: string) {
    return this.request(`/chat/users?current_user_id=${currentUserId}`);
  }

  // CSV Upload
  async uploadCSV(file: File) {
    const formData = new FormData();
    formData.append('csvFile', file);
    
    // Use fetch directly for file uploads to let browser set Content-Type with boundary
    const url = `${this.baseUrl}/csv-upload/bulk-create`;
    const headers: Record<string, string> = {};
    
    // Add authorization header if token is available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Upload failed' };
    }
    
    return data;
  }

  async downloadCSVTemplate() {
    // Use fetch directly for downloads
    const url = `${this.baseUrl}/csv-upload/template`;
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    
    const text = await response.text();
    return { success: true, data: text };
  }

  // Payment Remittances
  async getPaymentRemittances() {
    return this.request('/payment-remittances');
  }

  async getPaymentRemittance(id: string) {
    return this.request(`/payment-remittances/${id}`);
  }

  async createPaymentRemittance(remittanceData: any) {
    return this.request('/payment-remittances', {
      method: 'POST',
      body: JSON.stringify(remittanceData),
    });
  }

  async updatePaymentRemittance(id: string, remittanceData: any) {
    return this.request(`/payment-remittances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(remittanceData),
    });
  }

  async getDriverRemittances(driverId: string) {
    return this.request(`/payment-remittances/driver/${driverId}`);
  }

  async getPendingRemittances() {
    return this.request('/payment-remittances/pending');
  }

  async confirmPaymentRemittance(id: string) {
    return this.request(`/payment-remittances/${id}/confirm`, {
      method: 'POST',
    });
  }

  // Bookings
  async getBookings() {
    return this.request('/bookings');
  }

  async getBooking(id: string) {
    return this.request(`/bookings/${id}`);
  }

  async getBookingsByStatus(reviewStatus: string) {
    return this.request(`/bookings/status/${reviewStatus}`);
  }

  async reviewBooking(id: string, reviewData: { reviewed_by_employee_id: string }) {
    return this.request(`/bookings/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async updateBookingStatus(id: string, statusData: { review_status: string; reviewed_by_employee_id?: string }) {
    return this.request(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
