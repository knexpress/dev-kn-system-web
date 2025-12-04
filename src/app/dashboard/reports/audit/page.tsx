'use client';

import AuditReportTable from "@/components/audit-report-table";
import { fetchRequests, fetchInvoices } from "@/lib/data";
import { Request, Invoice } from "@/lib/types";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export default function AuditReportPage() {
    const [allData, setAllData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAuditData = async () => {
            try {
                // First, try to fetch audit reports from the Report model
                try {
                    const reportsResult = await apiClient.getReports();
                    console.log('📋 Reports API response:', reportsResult);
                    
                    // The API might return { success: true, data: [...] } or just the array directly
                    let reportsArray = reportsResult;
                    if (reportsResult && !Array.isArray(reportsResult) && reportsResult.data) {
                        reportsArray = reportsResult.data;
                        console.log('📦 Extracted data from response object');
                    } else if (reportsResult && !Array.isArray(reportsResult) && reportsResult.success) {
                        // Already an object but no data field, could be array directly
                        console.log('📝 Response is already an object with success field');
                    }
                    
                    if (reportsArray && Array.isArray(reportsArray) && reportsArray.length > 0) {
                        console.log(`✅ Found ${reportsArray.length} audit reports`);
                        
                        // Log the first report structure for debugging
                        console.log('📄 Sample report structure:', reportsArray[0]);
                        // Convert reports to the format expected by AuditReportTable
                        const formattedData = reportsArray.map((report: any) => {
                            const reportData = report.report_data || {};
                            const cargoDetails = reportData.cargo_details || {};
                            
                            // Check if this is a historical upload entry
                            if (reportData.upload_type === 'historical') {
                                // Format origin and destination for historical data
                                const origin = reportData.origin_country 
                                    ? `${reportData.origin_country}${reportData.origin_city ? ` - ${reportData.origin_city}` : ''}`
                                    : 'N/A';
                                const destination = reportData.destination_country
                                    ? `${reportData.destination_country}${reportData.destination_city ? ` - ${reportData.destination_city}` : ''}`
                                    : 'N/A';
                                
                                // Determine leviable status from additional_info2
                                const isLeviableValue = reportData.additional_info2 === 'LEVIABLE' ? 'Leviable' 
                                    : reportData.additional_info2 === 'NON-LEVIABLE' ? 'Non-Leviable'
                                    : reportData.additional_info2 || 'N/A';
                                
                                return {
                                    id: report._id,
                                    awbNumber: reportData.awb_number || 'N/A',
                                    deliveryDate: 'N/A', // Not available in historical data
                                    invoicingDate: reportData.transaction_date || 'N/A',
                                    clientName: reportData.customer_name || 'N/A',
                                    receiverName: 'N/A', // Not available in historical data
                                    origin: origin,
                                    destination: destination,
                                    shipmentType: reportData.shipment_type || 'N/A',
                                    serviceType: 'N/A', // Not available in historical data
                                    deliveryStatus: reportData.shipment_status || 'N/A',
                                    weight: reportData.weight || 'N/A',
                                    leviableItem: isLeviableValue,
                                    invoice: undefined, // Historical uploads don't have invoices
                                    generatedBy: report.generated_by_employee_name || 'System',
                                    uploadType: 'historical'
                                };
                            }
                            
                            // Regular report entry (existing logic)
                            return {
                                id: report._id,
                                awbNumber: cargoDetails.awb_number || reportData.awb_number || 'N/A',
                                deliveryDate: reportData.invoice_date || 'N/A',
                                invoicingDate: reportData.invoice_date || 'N/A',
                                clientName: reportData.client_name || cargoDetails.customer?.name || 'N/A',
                                receiverName: cargoDetails.receiver?.name || 'N/A',
                                origin: cargoDetails.route?.split(' → ')[0] || 'N/A',
                                destination: cargoDetails.route?.split(' → ')[1] || cargoDetails.route || 'N/A',
                                shipmentType: cargoDetails.shipment?.weight_type || reportData.shipment_type || 'N/A',
                                serviceType: 'N/A',
                                deliveryStatus: reportData.current_status || cargoDetails.delivery_status || reportData.invoice_status || reportData.shipment_status || 'N/A',
                                weight: cargoDetails.shipment?.weight || reportData.weight || 'N/A',
                                invoice: reportData.invoice_id ? {
                                    id: reportData.invoice_id,
                                    issueDate: reportData.invoice_date,
                                    amount: reportData.invoice_amount,
                                    status: reportData.invoice_status
                                } : undefined,
                                generatedBy: report.generated_by_employee_name || 'System',
                                uploadType: 'regular'
                            };
                        });
                        
                        setAllData(formattedData);
                        setLoading(false);
                        return;
                    }
                } catch (reportsError) {
                    console.error('❌ Error fetching audit reports:', reportsError);
                    console.warn('Falling back to requests/invoices method');
                }
                
                // Fallback to old method if reports API doesn't work or returns no data
                const [requests, invoices] = await Promise.all([
                    fetchRequests(),
                    fetchInvoices()
                ]);
                
                // Join requests with invoices
                const joinedData = requests.map(request => {
                    const invoice = invoices.find(inv => inv.requestId === request.id);
                    return {
                        ...request,
                        invoice,
                    }
                });
                
                setAllData(joinedData);
            } catch (error) {
                console.error('Error loading audit data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAuditData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading audit data...</div>
            </div>
        );
    }

    return (
        <div>
            <AuditReportTable data={allData} />
        </div>
    );
}
