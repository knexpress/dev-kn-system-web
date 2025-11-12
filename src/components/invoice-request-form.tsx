'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    receiver_name: '',
    receiver_phone: '',
    sender_address: '',
    receiver_address: '',
    shipment_type: '',
    service_code: '',
    notes: '',
  });

  // Determine service code based on sender and receiver addresses
  const serviceCodeOptions = useMemo(() => {
    const senderCountry = formData.sender_address.includes('UAE') ? 'UAE' : 
                          formData.sender_address.includes('Philippines') ? 'PH' : '';
    const receiverCountry = formData.receiver_address.includes('UAE') ? 'UAE' : 
                            formData.receiver_address.includes('Philippines') ? 'PH' : '';

    if (senderCountry === 'PH' && receiverCountry === 'UAE') {
      return [
        { value: 'PH_TO_UAE', label: 'PH to UAE' },
        { value: 'PH_TO_UAE_EXPRESS', label: 'PH to UAE Express' },
        { value: 'PH_TO_UAE_STANDARD', label: 'PH to UAE Standard' },
      ];
    } else if (senderCountry === 'UAE' && receiverCountry === 'PH') {
      return [
        { value: 'UAE_TO_PH', label: 'UAE to PH' },
        { value: 'UAE_TO_PH_EXPRESS', label: 'UAE to PH Express' },
        { value: 'UAE_TO_PH_STANDARD', label: 'UAE to PH Standard' },
      ];
    }
    return [];
  }, [formData.sender_address, formData.receiver_address]);

  // Handle location changes from LocationSelector
  const handleSenderAddressChange = (value: string) => {
    setFormData((prev) => {
      // Check if current service_code is still valid for new route
      const newSenderCountry = value.includes('UAE') ? 'UAE' : 
                                value.includes('Philippines') ? 'PH' : '';
      const receiverCountry = prev.receiver_address.includes('UAE') ? 'UAE' : 
                               prev.receiver_address.includes('Philippines') ? 'PH' : '';
      
      // Determine valid service codes for new route
      const validServiceCodes = 
        (newSenderCountry === 'PH' && receiverCountry === 'UAE') 
          ? ['PH_TO_UAE', 'PH_TO_UAE_EXPRESS', 'PH_TO_UAE_STANDARD']
          : (newSenderCountry === 'UAE' && receiverCountry === 'PH')
          ? ['UAE_TO_PH', 'UAE_TO_PH_EXPRESS', 'UAE_TO_PH_STANDARD']
          : [];
      
      return {
        ...prev,
        sender_address: value,
        // Reset service_code if it's no longer valid for the new route
        service_code: prev.service_code && validServiceCodes.includes(prev.service_code) 
          ? prev.service_code 
          : ''
      };
    });
  };

  const handleReceiverAddressChange = (value: string) => {
    setFormData((prev) => {
      // Check if current service_code is still valid for new route
      const senderCountry = prev.sender_address.includes('UAE') ? 'UAE' : 
                             prev.sender_address.includes('Philippines') ? 'PH' : '';
      const newReceiverCountry = value.includes('UAE') ? 'UAE' : 
                                  value.includes('Philippines') ? 'PH' : '';
      
      // Determine valid service codes for new route
      const validServiceCodes = 
        (senderCountry === 'PH' && newReceiverCountry === 'UAE') 
          ? ['PH_TO_UAE', 'PH_TO_UAE_EXPRESS', 'PH_TO_UAE_STANDARD']
          : (senderCountry === 'UAE' && newReceiverCountry === 'PH')
          ? ['UAE_TO_PH', 'UAE_TO_PH_EXPRESS', 'UAE_TO_PH_STANDARD']
          : [];
      
      return {
        ...prev,
        receiver_address: value,
        // Reset service_code if it's no longer valid for the new route
        service_code: prev.service_code && validServiceCodes.includes(prev.service_code) 
          ? prev.service_code 
          : ''
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate service code is selected when addresses are provided
    if (formData.sender_address && formData.receiver_address && !formData.service_code) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a service code based on the sender and receiver addresses',
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
        setIsDialogOpen(false);
        setFormData({
          customer_name: '',
          customer_phone: '',
          receiver_name: '',
          receiver_phone: '',
          sender_address: '',
          receiver_address: '',
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Invoice Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice Request</DialogTitle>
          <DialogDescription>
            Enter client details for the invoice request. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
            
            <div className="space-y-4">
              {/* Sender Address */}
              <div className="space-y-2">
                <LocationSelector
                  label="Sender Address"
                  value={formData.sender_address}
                  onChange={handleSenderAddressChange}
                  required
                />
              </div>
              
              {/* Receiver Address */}
              <div className="space-y-2">
                <LocationSelector
                  label="Receiver Address"
                  value={formData.receiver_address}
                  onChange={handleReceiverAddressChange}
                  required
                />
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
                <Select
                  value={formData.service_code}
                  onValueChange={(value) => setFormData({ ...formData, service_code: value })}
                  disabled={serviceCodeOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      serviceCodeOptions.length === 0 
                        ? "Select sender and receiver addresses first" 
                        : "Select service code"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCodeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {serviceCodeOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Please select sender and receiver addresses to see available service codes
                  </p>
                )}
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
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
