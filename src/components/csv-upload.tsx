'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, History } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CSVUploadProps {
  onSuccess?: () => void;
}

export default function CSVUpload({ onSuccess }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'bulk' | 'historical'>('bulk');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: 'Please select a CSV file',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please select a CSV file to upload',
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      let result;
      if (activeTab === 'historical') {
        result = await apiClient.uploadHistoricalCSV(file);
      } else {
        result = await apiClient.uploadCSV(file);
      }

      if (result.success) {
        setUploadResult(result);
        if (activeTab === 'historical') {
          toast({
            title: 'Success',
            description: `Successfully uploaded ${result.summary.shipments_created || result.summary.total_rows} historical shipments to EMPOST`,
          });
        } else {
          toast({
            title: 'Success',
            description: `Successfully created ${result.summary.invoices_created} invoices and ${result.summary.assignments_created} delivery assignments`,
          });
        }

        // Refresh invoices list if callback provided
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: result.error || 'Failed to process CSV file',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to upload CSV file',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Direct fetch to download template
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const endpoint = activeTab === 'historical' 
        ? '/api/csv-upload/historical-template'
        : '/api/csv-upload/template';
      const response = await fetch(`${apiBaseUrl}${endpoint}`);
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeTab === 'historical' 
        ? 'historical_upload_template.csv'
        : 'invoice_bulk_upload_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Template Downloaded',
        description: 'CSV template downloaded successfully',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Error',
        description: 'Failed to download template',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          CSV Upload
        </CardTitle>
        <CardDescription>
          Upload CSV files to process invoices or historical data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as 'bulk' | 'historical');
          setFile(null);
          setUploadResult(null);
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bulk">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Invoice Upload
            </TabsTrigger>
            <TabsTrigger value="historical">
              <History className="h-4 w-4 mr-2" />
              Historical Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                  disabled={uploading}
                />
                {file && (
                  <p className="mt-1 text-sm text-gray-600">{file.name}</p>
                )}
              </div>
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                disabled={uploading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload and Process
                </>
              )}
            </Button>

            {uploadResult && activeTab === 'bulk' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {uploadResult.summary.errors === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <h4 className="font-semibold">Upload Summary</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Total Rows:</strong> {uploadResult.summary.total_rows}</p>
                  <p className="text-green-600">
                    <strong>Invoices Created:</strong> {uploadResult.summary.invoices_created}
                  </p>
                  <p className="text-green-600">
                    <strong>Assignments Created:</strong> {uploadResult.summary.assignments_created}
                  </p>
                  {uploadResult.summary.errors > 0 && (
                    <p className="text-red-600">
                      <strong>Errors:</strong> {uploadResult.summary.errors}
                    </p>
                  )}
                </div>

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-red-600 mb-2">Errors:</h5>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.errors.map((error: any, index: number) => (
                        <div key={index} className="text-xs p-2 bg-red-50 rounded">
                          <p className="font-medium">Row {error.row}:</p>
                          <p>{error.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historical" className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 mb-2">
                <strong>Historical Upload:</strong> Upload old data from January 1st to September 29th.
              </p>
              <p className="text-xs text-blue-700 mb-3">
                This will create shipments in EMPOST database only. No delivery assignments or QR codes will be created.
                All entries will be recorded in the audit report.
              </p>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-2">Required CSV Columns:</p>
                <div className="text-xs text-blue-700 grid grid-cols-2 gap-1">
                  <span>• CustomerName</span>
                  <span>• AWBNo</span>
                  <span>• TransactionDate</span>
                  <span>• OriginCountry</span>
                  <span>• OriginCity</span>
                  <span>• DestinationCountry</span>
                  <span>• DestinationCity</span>
                  <span>• ShipmentType</span>
                  <span>• ShipmentStatus</span>
                  <span>• Weight</span>
                  <span>• Delivery Charge</span>
                  <span>• Dispatcher</span>
                  <span>• AdditionalInfo1</span>
                  <span>• AdditionalInfo2</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                  disabled={uploading}
                />
                {file && (
                  <p className="mt-1 text-sm text-gray-600">{file.name}</p>
                )}
              </div>
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                disabled={uploading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading to EMPOST...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Historical Data
                </>
              )}
            </Button>

            {uploadResult && activeTab === 'historical' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {uploadResult.summary.errors === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <h4 className="font-semibold">Upload Summary</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Total Rows:</strong> {uploadResult.summary.total_rows}</p>
                  <p><strong>Rows Processed:</strong> {uploadResult.summary.rows_processed || uploadResult.summary.total_rows}</p>
                  <p className="text-green-600">
                    <strong>Shipments Created in EMPOST:</strong> {uploadResult.summary.shipments_created || 0}
                  </p>
                  <p className="text-green-600">
                    <strong>Audit Entries Created:</strong> {uploadResult.summary.audit_entries_created || 0}
                  </p>
                  {uploadResult.summary.errors > 0 && (
                    <p className="text-red-600">
                      <strong>Errors:</strong> {uploadResult.summary.errors}
                    </p>
                  )}
                </div>

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-red-600 mb-2">Errors:</h5>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.errors.map((error: any, index: number) => (
                        <div key={index} className="text-xs p-2 bg-red-50 rounded">
                          <p className="font-medium">Row {error.row}:</p>
                          <p>{error.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
