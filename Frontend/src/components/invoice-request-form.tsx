'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import LocationSelector from '@/components/location-selector';

interface InvoiceRequestFormProps {
  onRequestCreated: () => void;
  currentUser: any;
}

export default function InvoiceRequestForm({ onRequestCreated, currentUser }: InvoiceRequestFormProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    receiver_name: '',
    receiver_phone: '',
    sender_address: '',
    receiver_address: '',
    sender_country: '',
    receiver_country: '',
    shipment_type: '',
    service_code: '',
    notes: '',
  });
  const handleSenderAddressChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      sender_address: value,
    }));
  };

  const handleReceiverAddressChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      receiver_address: value,
    }));
  };

  useEffect(() => {
    setFormData((prev) => {
      const { sender_country, receiver_country, service_code } = prev;
      let autoCode = '';
      if (sender_country === 'PH' && receiver_country === 'UAE') autoCode = 'PH_TO_UAE';
      else if (sender_country === 'UAE' && receiver_country === 'PH') autoCode = 'UAE_TO_PH';
      if (autoCode === service_code) return prev;
      return { ...prev, service_code: autoCode };
    });
  }, [formData.sender_country, formData.receiver_country]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.sender_country || !formData.receiver_country) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select both sender and receiver countries',
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.service_code) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Service code will be auto-selected after choosing valid countries',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await apiClient.createInvoiceRequest({
        ...formData,
        created_by_employee_id: currentUser.employee_id || currentUser.uid,
        status: 'SUBMITTED', // Automatically submit when created by Sales
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Invoice request created successfully',
        });
        setIsFormOpen(false);
        setFormData({
          customer_name: '',
          customer_phone: '',
        receiver_name: '',
        receiver_phone: '',
        sender_address: '',
        receiver_address: '',
        sender_country: '',
        receiver_country: '',
        shipment_type: '',
        service_code: '',
        notes: '',
        });
        onRequestCreated();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create invoice request',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invoice request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsFormOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        New Invoice Request
      </Button>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Create New Invoice Request</h2>
                <p className="text-sm text-muted-foreground">
                  Enter client details for the invoice request. All fields marked with * are required.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setIsFormOpen(false)}>
                Close
              </Button>
            </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-xl border p-6 shadow-sm">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="customer_phone">Customer Phone</Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  placeholder="+971501234567"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Receiver Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Receiver Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="receiver_name">Receiver Name *</Label>
                <Input
                  id="receiver_name"
                  value={formData.receiver_name}
                  onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="receiver_phone">Receiver Phone *</Label>
                <Input
                  id="receiver_phone"
                  value={formData.receiver_phone}
                  onChange={(e) => setFormData({ ...formData, receiver_phone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location Information</h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Sender Column */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Sender</h4>
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select
                    value={formData.sender_country}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        sender_country: value,
                        sender_address: '',
                        receiver_country: value === 'PH' ? 'UAE' : value === 'UAE' ? 'PH' : '',
                        receiver_address: '',
                      }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PH">Philippines</SelectItem>
                      <SelectItem value="UAE">United Arab Emirates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  {formData.sender_country ? (
                    <LocationSelector
                      label=""
                      value={formData.sender_address}
                      onChange={handleSenderAddressChange}
                      required
                      presetCountry={formData.sender_country === 'PH' ? 'Philippines' : formData.sender_country === 'UAE' ? 'UAE' : undefined}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Select a country to enable manual entry
                    </div>
                  )}
                </div>
              </div>

              {/* Receiver Column */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Receiver</h4>
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select
                    value={formData.receiver_country}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        receiver_country: value,
                        receiver_address: '',
                        sender_country: value === 'PH' ? 'UAE' : value === 'UAE' ? 'PH' : prev.sender_country,
                        sender_address: '',
                      }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PH">Philippines</SelectItem>
                      <SelectItem value="UAE">United Arab Emirates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  {formData.receiver_country ? (
                    <LocationSelector
                      label=""
                      value={formData.receiver_address}
                      onChange={handleReceiverAddressChange}
                      required
                      presetCountry={formData.receiver_country === 'PH' ? 'Philippines' : formData.receiver_country === 'UAE' ? 'UAE' : undefined}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Select a country to enable manual entry
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shipment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shipment_type">Shipment Type *</Label>
                <Select
                  value={formData.shipment_type}
                  onValueChange={(value) => setFormData({ ...formData, shipment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCUMENT">Document</SelectItem>
                    <SelectItem value="NON_DOCUMENT">Non-Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="service_code">Service Code *</Label>
                <Input
                  id="service_code"
                  value={formData.service_code || ''}
                  placeholder="Auto-set based on selected countries"
                  readOnly
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
          </div>
        </div>
      )}
    </>
  );
}
