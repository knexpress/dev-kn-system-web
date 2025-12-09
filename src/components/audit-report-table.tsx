'use client';

import { useState, useRef } from 'react';
import { Request, Invoice } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from './ui/button';
import { Download, Upload } from 'lucide-react';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';

type AuditData = Request & { invoice?: Invoice };

interface AuditReportTableProps {
    data: AuditData[];
}

export default function AuditReportTable({ data: initialData }: AuditReportTableProps) {
    const [tableData, setTableData] = useState<AuditData[]>(initialData);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isLeviable = (shipmentType?: string, leviableItem?: string) => {
        // If leviableItem is explicitly provided (from historical data), use it
        if (leviableItem && leviableItem !== 'N/A') {
            return leviableItem;
        }
        
        // Otherwise, determine from shipment type
        const nonLeviableTypes = ['Docs', 'Documents', 'DOCUMENT'];
        if (!shipmentType) return 'N/A';
        return nonLeviableTypes.includes(shipmentType.toUpperCase()) ? 'Non-Leviable' : 'Leviable';
    };

    const handleExport = async () => {
        try {
            // Dynamically import XLSX only when needed
            const XLSX = await import('xlsx');
            
            console.log("Exporting to Excel...");
            
            // Prepare data for export
            const dataToExport = tableData.map(item => ({
                'AWB Number': item.awbNumber || 'N/A',
                'Delivery Date': item.deliveryDate || 'N/A',
                'Invoicing Date': item.invoice?.issueDate || (item as any).invoicingDate || 'N/A',
                'Customer / sender name': item.clientName || 'N/A',
                'Receiver name': item.receiverName || 'N/A',
                'Origin': item.origin || 'N/A',
                'Destination': item.destination || 'N/A',
                'Shipment type': item.shipmentType || 'N/A',
                'Service type': item.serviceType || 'N/A',
                'Delivery status': item.deliveryStatus || 'N/A',
                'Weight': item.weight || 'N/A',
                'Leviable Item': isLeviable(item.shipmentType, (item as any).leviableItem)
            }));
            
            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Audit Report');
            
            // Generate filename with timestamp
            const filename = `audit-report-${new Date().toISOString().split('T')[0]}.xlsx`;
            
            // Export file
            XLSX.writeFile(wb, filename);
            
            toast({
                title: "Export Successful",
                description: `${dataToExport.length} rows have been exported to ${filename}`,
            });
        } catch (error) {
            console.error("Failed to export Excel file:", error);
            toast({
                variant: "destructive",
                title: "Export Failed",
                description: "There was an error exporting the Excel file.",
            });
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Dynamically import XLSX only when needed
                const XLSX = await import('xlsx');
                
                const data = e.target?.result;
                if (!data) {
                    throw new Error('No data read from file');
                }
                
                const workbook = XLSX.read(data, { type: 'binary' });
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('No sheets found in Excel file');
                }
                
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
                if (!json || json.length === 0) {
                    throw new Error('No data found in Excel file');
                }
                
                console.log('📊 Importing Excel data:', json.length, 'rows');
                console.log('📊 Sample row:', json[0]);
                
                // Map Excel columns to audit data structure
                const importedData: AuditData[] = json.map((row: any, index: number) => {
                    // Handle various possible column names
                    const getValue = (keys: string[]) => {
                        for (const key of keys) {
                            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                                return row[key];
                            }
                        }
                        return null;
                    };
                    
                    const awbNumber = getValue(['AWB Number', 'AWB number', 'AWB', 'awbNumber']);
                    const deliveryDate = getValue(['Transaction - delivery date', 'Delivery Date', 'Delivery date', 'deliveryDate']);
                    const invoicingDate = getValue(['Invoicing date if available', 'Invoicing Date', 'Invoice Date', 'invoicingDate']);
                    const clientName = getValue(['Customer / sender name', 'Customer', 'Sender name', 'clientName']);
                    const receiverName = getValue(['Receiver name', 'Receiver Name', 'Receiver', 'receiverName']);
                    const origin = getValue(['Origin', 'origin']);
                    const destination = getValue(['Destination', 'destination']);
                    const shipmentType = getValue(['Shipment type', 'Shipment Type', 'shipmentType']);
                    const serviceType = getValue(['Service type', 'Service Type', 'serviceType']);
                    const deliveryStatus = getValue(['Delivery status', 'Delivery Status', 'deliveryStatus']);
                    const weight = getValue(['Weight', 'weight', 'Weight (kg)']);
                    
                    return {
                        id: awbNumber || `imp-${Date.now()}-${index}`,
                        awbNumber: awbNumber || 'N/A',
                        deliveryDate: deliveryDate || 'N/A',
                        clientName: clientName || 'N/A',
                        receiverName: receiverName || 'N/A',
                        origin: origin || 'N/A',
                        destination: destination || 'N/A',
                        shipmentType: shipmentType || 'N/A',
                        serviceType: serviceType || 'N/A',
                        deliveryStatus: deliveryStatus || 'N/A',
                        weight: weight ? parseFloat(weight) : 0,
                        invoice: invoicingDate ? { issueDate: invoicingDate } as Invoice : undefined,
                        clientId: 'imported',
                        description: 'Imported from Excel',
                        status: 'Completed',
                    };
                });

                setTableData(prevData => [...prevData, ...importedData]);

                toast({
                    title: "Import Successful",
                    description: `${importedData.length} rows have been added to the report.`,
                });
                
                console.log('✅ Successfully imported', importedData.length, 'rows');

            } catch (error) {
                console.error("❌ Failed to import Excel file:", error);
                toast({
                    variant: "destructive",
                    title: "Import Failed",
                    description: error instanceof Error ? error.message : "There was an error processing the Excel file. Please ensure it's in the correct format.",
                });
            } finally {
                // Reset file input
                if(fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        
        reader.onerror = () => {
            console.error("FileReader error");
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: "There was an error reading the file.",
            });
        };
        
        reader.readAsBinaryString(file);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Audit & Revenue Report</CardTitle>
                        <CardDescription>A comprehensive report of all shipment transactions.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".xlsx, .xls"
                        />
                         <Button onClick={handleImportClick} variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Import from Excel
                        </Button>
                        <Button onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export as Excel
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>AWB Number</TableHead>
                            <TableHead>Delivery Date</TableHead>
                            <TableHead>Invoicing Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Receiver</TableHead>
                            <TableHead>Origin</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Shipment Type</TableHead>
                            <TableHead>Service Type</TableHead>
                            <TableHead>Delivery Status</TableHead>
                            <TableHead>Weight (kg)</TableHead>
                            <TableHead>Leviable Item</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData
                            .filter((item) => {
                                // Filter out rows that are essentially empty (all N/A or missing data)
                                return item.awbNumber || 
                                       item.deliveryDate || 
                                       item.invoice?.issueDate || 
                                       item.clientName || 
                                       item.receiverName || 
                                       item.origin || 
                                       item.destination || 
                                       item.shipmentType || 
                                       item.serviceType || 
                                       item.deliveryStatus || 
                                       item.weight;
                            })
                            .map((item) => {
                                const invoicingDate = item.invoice?.issueDate || (item as any).invoicingDate || 'N/A';
                                const leviableItem = isLeviable(item.shipmentType, (item as any).leviableItem);
                                
                                return (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono">{item.awbNumber || 'N/A'}</TableCell>
                                <TableCell>{item.deliveryDate || 'N/A'}</TableCell>
                                        <TableCell>{invoicingDate}</TableCell>
                                <TableCell>{item.clientName || 'N/A'}</TableCell>
                                <TableCell>{item.receiverName || 'N/A'}</TableCell>
                                <TableCell>{item.origin || 'N/A'}</TableCell>
                                <TableCell>{item.destination || 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{item.shipmentType || 'N/A'}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{item.serviceType || 'N/A'}</Badge>
                                </TableCell>
                                <TableCell>
                                            <Badge className={
                                                item.deliveryStatus === 'Completed' || item.deliveryStatus === 'DELIVERED' 
                                                    ? 'bg-green-500' 
                                                    : 'bg-gray-500'
                                            }>{item.deliveryStatus || 'N/A'}</Badge>
                                </TableCell>
                                <TableCell>{item.weight || 'N/A'}</TableCell>
                                        <TableCell>{leviableItem}</TableCell>
                            </TableRow>
                                );
                            })}
                        {tableData.filter((item) => {
                            return item.awbNumber || 
                                   item.deliveryDate || 
                                   item.invoice?.issueDate || 
                                   item.clientName || 
                                   item.receiverName || 
                                   item.origin || 
                                   item.destination || 
                                   item.shipmentType || 
                                   item.serviceType || 
                                   item.deliveryStatus || 
                                   item.weight;
                        }).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                                    No data available. Import data from Excel or add records manually.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
