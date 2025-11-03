'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface VerificationFormProps {
  request: any;
  onVerificationComplete: () => void;
  currentUser: any;
}

export default function VerificationForm({ request, onVerificationComplete, currentUser }: VerificationFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [verificationData, setVerificationData] = useState({
    invoice_number: request.invoice_number || request.verification?.invoice_number || '',
    tracking_code: request.tracking_code || request.verification?.tracking_code || '',
    service_code: request.service_code || request.verification?.service_code || '',
    amount: request.amount?.toString() || request.verification?.amount?.toString() || '',
    weight: request.weight?.toString() || request.verification?.weight?.toString() || '',
    volume_cbm: request.volume_cbm?.toString() || request.verification?.volume_cbm?.toString() || '',
    receiver_address: request.receiver_address || request.verification?.receiver_address || '',
    receiver_phone: request.receiver_phone || request.verification?.receiver_phone || '',
    declared_value: request.verification?.declared_value?.toString() || '',
    agents_name: request.verification?.agents_name || request.created_by_employee_id?.full_name || '',
    listed_commodities: request.verification?.listed_commodities || '',
    shipment_classification: request.verification?.shipment_classification || '',
    weight_type: request.verification?.weight_type || '',
    cargo_service: request.verification?.cargo_service || '',
    sender_details_complete: request.verification?.sender_details_complete || false,
    receiver_details_complete: request.verification?.receiver_details_complete || false,
    number_of_boxes: request.verification?.number_of_boxes || '',
    verification_notes: request.verification?.verification_notes || '',
  });

  // Validation function to check if all required fields are completed
  const isVerificationComplete = () => {
    return (
      verificationData.invoice_number &&
      verificationData.tracking_code &&
      verificationData.service_code &&
      verificationData.amount &&
      verificationData.weight &&
      verificationData.receiver_address &&
      verificationData.receiver_phone &&
      verificationData.declared_value &&
      verificationData.agents_name &&
      verificationData.listed_commodities &&
      verificationData.shipment_classification &&
      verificationData.weight_type &&
      verificationData.cargo_service &&
      verificationData.number_of_boxes &&
      verificationData.sender_details_complete &&
      verificationData.receiver_details_complete
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all required fields
    if (!isVerificationComplete()) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Verification',
        description: 'Please complete all required verification points before submitting.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // First update verification details
      const updateResult = await apiClient.updateVerification(request._id, {
        ...verificationData,
        declared_value: parseFloat(verificationData.declared_value) || 0,
        number_of_boxes: parseInt(verificationData.number_of_boxes) || 0,
        weight: parseFloat(verificationData.weight) || 0,
      });

      if (updateResult.success) {
        // Then complete verification
        const completeResult = await apiClient.completeVerification(request._id, {
          verified_by_employee_id: currentUser.employee_id || '68f3601fc0b09b8567b1ba8d',
          verification_notes: verificationData.verification_notes,
        });

        if (completeResult.success) {
          toast({
            title: 'Verification Complete',
            description: 'All verification points checked and request sent for invoice generation',
          });
          setIsDialogOpen(false);
          onVerificationComplete();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: completeResult.error || 'Failed to complete verification',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: updateResult.error || 'Failed to update verification details',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete verification',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileCheck className="mr-2 h-4 w-4" />
          Verify Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Operations Verification - 6 Mandatory Checks</DialogTitle>
          <DialogDescription>
            Complete all 6 verification points before sending to Finance for invoice generation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Progress Indicator */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900">Verification Progress</h3>
              <span className="text-sm text-blue-700">
                {isVerificationComplete() ? '✅ Complete' : '⚠️ Incomplete'}
              </span>
            </div>
            <div className="text-sm text-blue-800">
              All 6 verification points must be completed before sending to Finance
            </div>
          </div>

          {/* Invoice & Tracking Verification */}
          <div className="border-l-4 border-purple-500 pl-4 space-y-4">
            <h3 className="font-semibold text-lg mb-4 text-purple-900">Invoice & Tracking Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  value={verificationData.invoice_number}
                  onChange={(e) => setVerificationData({ ...verificationData, invoice_number: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="tracking_code">Tracking Code *</Label>
                <Input
                  id="tracking_code"
                  value={verificationData.tracking_code}
                  onChange={(e) => setVerificationData({ ...verificationData, tracking_code: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="service_code">Service Code *</Label>
                <Input
                  id="service_code"
                  value={verificationData.service_code}
                  onChange={(e) => setVerificationData({ ...verificationData, service_code: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Amount (AED) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={verificationData.amount}
                  onChange={(e) => setVerificationData({ ...verificationData, amount: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="weight">Weight (KG) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={verificationData.weight}
                  onChange={(e) => setVerificationData({ ...verificationData, weight: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="volume_cbm">Volume (CBM)</Label>
                <Input
                  id="volume_cbm"
                  type="number"
                  step="0.01"
                  value={verificationData.volume_cbm}
                  onChange={(e) => setVerificationData({ ...verificationData, volume_cbm: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Receiver Information Verification */}
          <div className="border-l-4 border-green-500 pl-4 space-y-4">
            <h3 className="font-semibold text-lg mb-4 text-green-900">Receiver Information Verification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="receiver_address">Receiver Address *</Label>
                <Input
                  id="receiver_address"
                  value={verificationData.receiver_address}
                  onChange={(e) => setVerificationData({ ...verificationData, receiver_address: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="receiver_phone">Receiver Phone *</Label>
                <Input
                  id="receiver_phone"
                  value={verificationData.receiver_phone}
                  onChange={(e) => setVerificationData({ ...verificationData, receiver_phone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* 1. Declared Value and Agent */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-lg mb-4 text-blue-900">1. Declared Value & Agent Information</h3>
            <div>
              <Label htmlFor="declared_value">Declared Value *</Label>
              <Input
                id="declared_value"
                type="number"
                step="0.01"
                value={verificationData.declared_value}
                onChange={(e) => setVerificationData({ ...verificationData, declared_value: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="agents_name">Agent's Name *</Label>
              <Input
                id="agents_name"
                value={verificationData.agents_name}
                onChange={(e) => setVerificationData({ ...verificationData, agents_name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Listed Commodities */}
          <div>
            <Label htmlFor="listed_commodities">Listed Commodities *</Label>
            <Textarea
              id="listed_commodities"
              placeholder="List all commodities in the shipment..."
              value={verificationData.listed_commodities}
              onChange={(e) => setVerificationData({ ...verificationData, listed_commodities: e.target.value })}
              rows={3}
              required
            />
          </div>

          {/* Shipment Classification and Weight Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipment_classification">Shipment Classification *</Label>
              <Select
                value={verificationData.shipment_classification}
                onValueChange={(value) => setVerificationData({ ...verificationData, shipment_classification: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                  <SelectItem value="PERSONAL">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="weight_type">Weight Type *</Label>
              <Select
                value={verificationData.weight_type}
                onValueChange={(value) => setVerificationData({ ...verificationData, weight_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select weight type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTUAL">Actual Weight</SelectItem>
                  <SelectItem value="VOLUMETRIC">Volumetric Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weight Input */}
          <div>
            <Label htmlFor="weight">Weight (kg) *</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              value={verificationData.weight}
              onChange={(e) => setVerificationData({ ...verificationData, weight: e.target.value })}
              placeholder="Enter weight in kg"
              required
            />
          </div>

          {/* Cargo Service and Number of Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cargo_service">Cargo Service *</Label>
              <Select
                value={verificationData.cargo_service}
                onValueChange={(value) => setVerificationData({ ...verificationData, cargo_service: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cargo service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEA">Sea Cargo</SelectItem>
                  <SelectItem value="AIR">Air Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="number_of_boxes">Number of Boxes *</Label>
              <Input
                id="number_of_boxes"
                type="number"
                value={verificationData.number_of_boxes}
                onChange={(e) => setVerificationData({ ...verificationData, number_of_boxes: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Verification Checkboxes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Verification Checklist</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sender_details_complete"
                checked={verificationData.sender_details_complete}
                onCheckedChange={(checked) => setVerificationData({ ...verificationData, sender_details_complete: checked as boolean })}
              />
              <Label htmlFor="sender_details_complete">Sender details are complete and correct</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="receiver_details_complete"
                checked={verificationData.receiver_details_complete}
                onCheckedChange={(checked) => setVerificationData({ ...verificationData, receiver_details_complete: checked as boolean })}
              />
              <Label htmlFor="receiver_details_complete">Receiver details are complete and correct</Label>
            </div>
          </div>

          {/* Verification Notes */}
          <div>
            <Label htmlFor="verification_notes">Verification Notes</Label>
            <Textarea
              id="verification_notes"
              placeholder="Any additional notes or observations..."
              value={verificationData.verification_notes}
              onChange={(e) => setVerificationData({ ...verificationData, verification_notes: e.target.value })}
              rows={3}
            />
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
            <Button type="submit" disabled={isSubmitting || !isVerificationComplete()}>
              {isSubmitting ? 'Completing...' : 'Complete Verification & Send to Finance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
