'use client';

import { useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from './ui/button';
import { Download, Upload } from 'lucide-react';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ErpToolbar,
  ErpGrid,
  erpOutlineControlClass,
  erpPrimaryButtonClass,
} from '@/components/dashboard/maglo-shell';

export type AuditTransaction = {
  id: string;
  awbNumber?: string;
  deliveryDate?: string;
  invoicingDate?: string;
  clientName?: string;
  receiverName?: string;
  origin?: string;
  destination?: string;
  shipmentType?: string;
  serviceType?: string;
  deliveryStatus?: string;
  weight?: string | number;
  leviableItem?: string;
};

type AuditReportTableProps = {
  data: AuditTransaction[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export default function AuditReportTable({
  data,
  loading,
  search,
  onSearchChange,
  page,
  pages,
  total,
  pageSize,
  onPageChange,
}: AuditReportTableProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const dataToExport = data.map((item) => ({
        'AWB Number': item.awbNumber || 'N/A',
        'Delivery Date': item.deliveryDate || 'N/A',
        'Invoicing Date': item.invoicingDate || 'N/A',
        'Customer / sender name': item.clientName || 'N/A',
        'Receiver name': item.receiverName || 'N/A',
        Origin: item.origin || 'N/A',
        Destination: item.destination || 'N/A',
        'Shipment type': item.shipmentType || 'N/A',
        'Service type': item.serviceType || 'N/A',
        'Delivery status': item.deliveryStatus || 'N/A',
        Weight: item.weight || 'N/A',
        'Leviable Item': item.leviableItem || 'N/A',
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Report');
      XLSX.writeFile(wb, `audit-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({
        title: 'Export Successful',
        description: `${dataToExport.length} rows from this page were exported.`,
      });
    } catch (error) {
      console.error('Failed to export Excel file:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'There was an error exporting the Excel file.',
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    toast({
      title: 'Import kept local',
      description: 'Use search to find live system transactions. Import still reads the file for review only.',
    });
    event.target.value = '';
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ErpToolbar
        title={`Transactions · ${total.toLocaleString()}`}
        description={search ? `Matching “${search}”` : 'All invoice requests in the system'}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="AWB, invoice, customer, receiver, route…"
        actions={
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".xlsx, .xls"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className={erpOutlineControlClass()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleExport} className={erpPrimaryButtonClass()}>
              <Download className="mr-2 h-4 w-4" />
              Export page
            </Button>
          </>
        }
      />
      <ErpGrid maxHeight="min(65vh, 720px)">
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
            {loading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-slate-400">
                  Searching transactions…
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-slate-400">
                  {search ? 'No transactions match that search.' : 'No transactions found.'}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const statusRaw = item.deliveryStatus || 'N/A';
                const normalized = statusRaw.toString().trim().toUpperCase();
                const isDelivered = normalized === 'COMPLETED' || normalized === 'DELIVERED';
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.awbNumber || 'N/A'}</TableCell>
                    <TableCell>{item.deliveryDate || 'N/A'}</TableCell>
                    <TableCell>{item.invoicingDate || 'N/A'}</TableCell>
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
                      <Badge className={isDelivered ? 'bg-green-500' : 'bg-gray-500'}>
                        {isDelivered ? 'DELIVERED' : statusRaw}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.weight || 'N/A'}</TableCell>
                    <TableCell>{item.leviableItem || 'N/A'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ErpGrid>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
        <p className="text-sm text-slate-500">
          {loading ? 'Loading…' : `Showing ${start}–${end} of ${total.toLocaleString()}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={erpOutlineControlClass()}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className={erpOutlineControlClass()}
            onClick={() => onPageChange(Math.min(pages, page + 1))}
            disabled={page >= pages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
