'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { CheckCircle, FileCheck, Plus, Trash2, Package } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VerificationFormProps {
  request: any;
  onVerificationComplete: () => void;
  currentUser: any;
}

interface Box {
  id: string;
  items: string;
  length: string;
  width: string;
  height: string;
}

// Weight bracket configuration
interface WeightBracket {
  min: number;
  max: number | null; // null means infinity
  rate: number;
  label: string;
}

const PH_TO_UAE_BRACKETS: WeightBracket[] = [
  { min: 1, max: 15, rate: 39, label: '1-15 KG' },
  { min: 16, max: 29, rate: 38, label: '16-29 KG' },
  { min: 30, max: 69, rate: 36, label: '30-69 KG' },
  { min: 70, max: 199, rate: 34, label: '70-199 KG' },
  { min: 200, max: 299, rate: 31, label: '200-299 KG' },
  { min: 300, max: null, rate: 30, label: '300+ KG' },
  { min: 0, max: null, rate: 29, label: 'SPECIAL RATE' }, // Special rate (can be manually selected)
];

const UAE_TO_PH_BRACKETS: WeightBracket[] = [
  { min: 1, max: 15, rate: 39, label: '1-15 KG' },
  { min: 16, max: 29, rate: 38, label: '16-29 KG' },
  { min: 30, max: 69, rate: 36, label: '30-69 KG' },
  { min: 70, max: 99, rate: 34, label: '70-99 KG' },
  { min: 100, max: 199, rate: 31, label: '100-199 KG' },
  { min: 200, max: null, rate: 30, label: '200+ KG' },
  { min: 0, max: null, rate: 29, label: 'SPECIAL RATE' }, // Special rate (can be manually selected)
  { min: 1000, max: null, rate: 28, label: '1 TON UP' }, // 1 ton = 1000 kg
];

// Function to get rate based on weight and route
const getRateForWeight = (weight: number, route: 'PH_TO_UAE' | 'UAE_TO_PH' | string): { rate: number; bracket: WeightBracket | null } => {
  if (!weight || weight <= 0 || !route) {
    console.log('getRateForWeight: Invalid input', { weight, route });
    return { rate: 0, bracket: null };
  }

  // Normalize route to uppercase for comparison
  const normalizedRoute = route.toUpperCase();
  const isPHToUAE = normalizedRoute.includes('PH_TO_UAE');
  const isUAETOPH = normalizedRoute.includes('UAE_TO_PH');
  
  if (!isPHToUAE && !isUAETOPH) {
    console.log('getRateForWeight: Invalid route', { route, normalizedRoute });
    return { rate: 0, bracket: null };
  }

  const brackets = isPHToUAE ? PH_TO_UAE_BRACKETS : UAE_TO_PH_BRACKETS;
  
  // Filter out special rate and sort brackets by min weight (descending) to check higher brackets first
  // This ensures "1 TON UP" (1000+) is checked before "200+ KG" for weights >= 1000
  // Filter out special rate
  const availableBrackets = brackets.filter(b => b.label !== 'SPECIAL RATE');
  
  // Separate closed and open-ended brackets
  const closedBrackets = availableBrackets.filter(b => b.max !== null).sort((a, b) => a.min - b.min); // Sort by min ascending
  const openEndedBrackets = availableBrackets.filter(b => b.max === null).sort((a, b) => b.min - a.min); // Sort by min descending (higher first)
  
  console.log('getRateForWeight: Route', normalizedRoute, 'Weight', weight);
  console.log('Closed brackets:', closedBrackets.map(b => `${b.label} (${b.min}-${b.max}) = ${b.rate} AED/kg`));
  console.log('Open-ended brackets:', openEndedBrackets.map(b => `${b.label} (${b.min}+) = ${b.rate} AED/kg`));
  
  // Find the matching bracket
  // Strategy: Check closed brackets first (more specific), then open-ended brackets
  let matchingBracket = null;
  
  // First, try to find a closed bracket match (check all, order doesn't matter for matching)
  for (const bracket of closedBrackets) {
    // bracket.max is guaranteed to be non-null for closed brackets
    if (bracket.max !== null && weight >= bracket.min && weight <= bracket.max) {
      matchingBracket = bracket;
      console.log('getRateForWeight: ✅ Matched closed bracket', bracket.label, 'for weight', weight);
      break;
    }
  }
  
  // If no closed bracket matched, try open-ended brackets (check higher min first)
  if (!matchingBracket) {
    for (const bracket of openEndedBrackets) {
      if (weight >= bracket.min) {
        matchingBracket = bracket;
        console.log('getRateForWeight: ✅ Matched open-ended bracket', bracket.label, 'for weight', weight);
        break;
      }
    }
  }

  if (matchingBracket) {
    console.log('getRateForWeight: ✅ Returning rate', matchingBracket.rate, 'for bracket', matchingBracket.label);
    return { rate: matchingBracket.rate, bracket: matchingBracket };
  }

  // If no bracket matches, find the best fallback bracket
  // This should rarely happen, but handle edge cases
  console.warn('getRateForWeight: ⚠️ No bracket matched for weight', weight, 'route', normalizedRoute, '- finding fallback');
  
  // Find the lowest min bracket (for weights below minimum, e.g., 0.5 kg)
  const lowestBracket = availableBrackets.reduce((lowest, current) => {
    return current.min < lowest.min ? current : lowest;
  }, availableBrackets[0]);
  
  // Find the highest min open-ended bracket (for weights above maximum)
  const highestOpenBracket = openEndedBrackets.length > 0 
    ? openEndedBrackets[0] // Already sorted descending, so first is highest
    : null;
  
  // If weight is less than the lowest bracket min, use lowest bracket
  // If weight is greater than all closed brackets, use highest open-ended bracket
  const fallbackBracket = weight < lowestBracket.min 
    ? lowestBracket 
    : (highestOpenBracket || (closedBrackets.length > 0 ? closedBrackets[closedBrackets.length - 1] : null) || availableBrackets[0]);
  
  console.warn('getRateForWeight: Using fallback bracket', fallbackBracket.label, 'with rate', fallbackBracket.rate);
  return { rate: fallbackBracket.rate, bracket: fallbackBracket };
};

export default function VerificationForm({ request, onVerificationComplete, currentUser }: VerificationFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize boxes from request data or create one empty box
  const initialBoxes = request.verification?.boxes && Array.isArray(request.verification.boxes) && request.verification.boxes.length > 0
    ? request.verification.boxes.map((box: any, index: number) => ({
        id: `box-${index}`,
        items: box.items || '',
        length: box.length?.toString() || '',
        width: box.width?.toString() || '',
        height: box.height?.toString() || '',
      }))
    : [{ id: 'box-0', items: '', length: '', width: '', height: '' }];

  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);

  // Check if verification is already completed (boxes should be locked)
  const isVerificationCompleted = request.verification?.verified_at || request.status === 'VERIFIED' || request.status === 'COMPLETED';
  const areBoxesLocked = isVerificationCompleted && initialBoxes.length > 0 && initialBoxes[0].length !== '';

  // Calculate VM for a single box: (L x W x H) / 5500
  const calculateVM = (length: string, width: string, height: string): number => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    if (l > 0 && w > 0 && h > 0) {
      return (l * w * h) / 5500;
    }
    return 0;
  };

  // Calculate total VM for all boxes (must be defined before using it)
  const totalVM = useMemo(() => {
    return boxes.reduce((sum, box) => {
      return sum + calculateVM(box.length, box.width, box.height);
    }, 0);
  }, [boxes]);

  const [verificationData, setVerificationData] = useState({
    invoice_number: request.invoice_number || request.verification?.invoice_number || '',
    tracking_code: request.tracking_code || request.verification?.tracking_code || '',
    service_code: request.service_code || request.verification?.service_code || '',
    amount: request.amount?.toString() || request.verification?.amount?.toString() || '',
    actual_weight: request.weight?.toString() || request.verification?.actual_weight?.toString() || '',
    volume_cbm: request.volume_cbm?.toString() || request.verification?.volume_cbm?.toString() || '',
    receiver_address: request.receiver_address || request.verification?.receiver_address || '',
    receiver_phone: request.receiver_phone || request.verification?.receiver_phone || '',
    agents_name: request.verification?.agents_name || request.created_by_employee_id?.full_name || '',
    shipment_classification: request.verification?.shipment_classification || '',
    weight_type: request.verification?.weight_type || '', // Will be auto-determined
    cargo_service: request.verification?.cargo_service || '',
    sender_details_complete: request.verification?.sender_details_complete || false,
    receiver_details_complete: request.verification?.receiver_details_complete || false,
    number_of_boxes: request.verification?.number_of_boxes || initialBoxes.length.toString(),
    verification_notes: request.verification?.verification_notes || '',
  });

  // Calculate actual weight
  const actualWeight = useMemo(() => {
    return parseFloat(verificationData.actual_weight) || 0;
  }, [verificationData.actual_weight]);

  // Auto-determine weight type and chargeable weight (using totalVM directly)
  const { chargeableWeight, determinedWeightType, volumetricWeight } = useMemo(() => {
    const volWeight = totalVM;
    const actWeight = parseFloat(verificationData.actual_weight) || 0;
    
    if (actWeight === 0 && volWeight === 0) {
      return { chargeableWeight: 0, determinedWeightType: '', volumetricWeight: 0 };
    }
    
    if (actWeight >= volWeight) {
      return { 
        chargeableWeight: actWeight, 
        determinedWeightType: 'ACTUAL',
        volumetricWeight: volWeight
      };
    } else {
      return { 
        chargeableWeight: volWeight, 
        determinedWeightType: 'VOLUMETRIC',
        volumetricWeight: volWeight
      };
    }
  }, [totalVM, verificationData.actual_weight]);

  // Determine route from service code (case-insensitive)
  const route = useMemo(() => {
    const serviceCode = (verificationData.service_code || request.service_code || '').toUpperCase().trim();
    console.log('🔍 Route determination:', {
      serviceCode,
      verificationDataServiceCode: verificationData.service_code,
      requestServiceCode: request.service_code,
      isEmpty: !serviceCode
    });
    
    if (!serviceCode) {
      console.log('⚠️ Route determination: serviceCode is empty');
      return '';
    }
    
    if (serviceCode.includes('PH_TO_UAE')) {
      console.log('✅ Route determined: PH_TO_UAE');
      return 'PH_TO_UAE';
    } else if (serviceCode.includes('UAE_TO_PH')) {
      console.log('✅ Route determined: UAE_TO_PH');
      return 'UAE_TO_PH';
    }
    
    console.log('❌ Route determination: No route found for serviceCode', serviceCode);
    return '';
  }, [verificationData.service_code, request.service_code]);

  // Auto-calculate amount per kg based on chargeable weight and route
  const { calculatedRate, rateBracket } = useMemo(() => {
    // Use the route from the useMemo above
    const currentRoute = route;
    
    console.log('🔍 Rate Calculation useMemo triggered:', {
      chargeableWeight,
      route: currentRoute,
      hasChargeableWeight: chargeableWeight > 0,
      hasRoute: !!currentRoute
    });
    
    // Only calculate if we have both chargeable weight > 0 AND a valid route
    if (chargeableWeight > 0 && currentRoute) {
      const result = getRateForWeight(chargeableWeight, currentRoute);
      
      if (result.rate > 0 && result.bracket) {
        console.log('✅ Rate calculated successfully:', {
          rate: result.rate,
          bracket: result.bracket.label,
          weight: chargeableWeight.toFixed(2),
          route: currentRoute
        });
        return { calculatedRate: result.rate, rateBracket: result.bracket };
      } else {
        console.warn('⚠️ Rate Calculation: getRateForWeight returned invalid result:', result);
      }
    }
    
    console.log('❌ Rate Calculation: Returning 0 - chargeableWeight:', chargeableWeight, 'route:', currentRoute);
    return { calculatedRate: 0, rateBracket: null };
  }, [chargeableWeight, route]);
  
  // Compute the input value directly from calculatedRate or fallback to verificationData
  // This ensures the input always displays the correct value
  const inputValue = useMemo(() => {
    if (calculatedRate > 0) {
      const value = calculatedRate.toFixed(2);
      console.log('💰 Input value computed from calculatedRate:', value);
      return value;
    }
    const value = verificationData.amount || '';
    console.log('💰 Input value computed from verificationData:', value);
    return value;
  }, [calculatedRate, verificationData.amount]);

  // Update amount per kg automatically when rate changes - always override with calculated rate
  useEffect(() => {
    if (calculatedRate > 0) {
      // Always use calculated rate when available - cannot be manually changed
      const rateString = calculatedRate.toFixed(2);
      setVerificationData(prev => {
        // Always update if calculatedRate is available, even if it matches
        console.log('✅ Updating amount field:', {
          oldAmount: prev.amount,
          newAmount: rateString,
          calculatedRate: calculatedRate,
          rateBracket: rateBracket?.label
        });
        return { ...prev, amount: rateString };
      });
    } else if (calculatedRate === 0 && chargeableWeight > 0 && route) {
      // If we have weight and route but no rate, there might be an issue
      console.warn('⚠️ Warning: chargeableWeight > 0 and route exists but calculatedRate is 0', {
        chargeableWeight,
        route,
        serviceCode: verificationData.service_code || request.service_code
      });
    }
  }, [calculatedRate, rateBracket]);

  // Update weight_type automatically when values change
  useEffect(() => {
    if (determinedWeightType) {
      setVerificationData(prev => ({ ...prev, weight_type: determinedWeightType }));
    }
  }, [determinedWeightType]);

  // Add a new box
  const addBox = () => {
    if (areBoxesLocked) {
      toast({
        variant: 'destructive',
        title: 'Boxes Locked',
        description: 'Cannot add boxes after verification is completed',
      });
      return;
    }
    const newBox: Box = {
      id: `box-${Date.now()}`,
      items: '',
      length: '',
      width: '',
      height: '',
    };
    const updatedBoxes = [...boxes, newBox];
    setBoxes(updatedBoxes);
    setVerificationData(prev => ({ ...prev, number_of_boxes: updatedBoxes.length.toString() }));
  };

  // Remove a box
  const removeBox = (boxId: string) => {
    if (areBoxesLocked) {
      toast({
        variant: 'destructive',
        title: 'Boxes Locked',
        description: 'Cannot remove boxes after verification is completed',
      });
      return;
    }
    if (boxes.length > 1) {
      const updatedBoxes = boxes.filter(box => box.id !== boxId);
      setBoxes(updatedBoxes);
      setVerificationData(prev => ({ ...prev, number_of_boxes: updatedBoxes.length.toString() }));
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'At least one box is required',
      });
    }
  };

  // Update box data
  const updateBox = (boxId: string, field: keyof Box, value: string) => {
    if (areBoxesLocked) {
      toast({
        variant: 'destructive',
        title: 'Boxes Locked',
        description: 'Cannot modify boxes after verification is completed',
      });
      return;
    }
    setBoxes(boxes.map(box => 
      box.id === boxId ? { ...box, [field]: value } : box
    ));
  };

  // Validation function to check if all required fields are completed
  const isVerificationComplete = () => {
    // Check if all boxes have required fields
    const boxesValid = boxes.every(box => 
      box.items.trim() !== '' && 
      box.length.trim() !== '' && 
      box.width.trim() !== '' && 
      box.height.trim() !== '' &&
      parseFloat(box.length) > 0 &&
      parseFloat(box.width) > 0 &&
      parseFloat(box.height) > 0
    );

    // Check if actual weight is provided
    const hasActualWeight = actualWeight > 0;
    // Check if volumetric weight is calculated (at least one box with valid dimensions)
    const hasVolumetricWeight = volumetricWeight > 0;

    return (
      verificationData.invoice_number &&
      verificationData.tracking_code &&
      verificationData.service_code &&
      verificationData.amount &&
      hasActualWeight &&
      hasVolumetricWeight &&
      verificationData.receiver_address &&
      verificationData.receiver_phone &&
      verificationData.agents_name &&
      boxesValid &&
      boxes.length > 0 &&
      verificationData.shipment_classification &&
      determinedWeightType && // Auto-determined weight type
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
      // Prepare box data for backend
      const boxesData = boxes.map(box => ({
        items: box.items,
        length: parseFloat(box.length) || 0,
        width: parseFloat(box.width) || 0,
        height: parseFloat(box.height) || 0,
        vm: calculateVM(box.length, box.width, box.height),
      }));

      // Use calculated rate or the amount from verificationData (if manually overridden)
      const finalAmount = calculatedRate > 0 ? calculatedRate.toString() : verificationData.amount;

      // First update verification details
      const updateResult = await apiClient.updateVerification(request._id, {
        ...verificationData,
        amount: finalAmount, // Use auto-calculated amount
        boxes: boxesData,
        total_vm: totalVM,
        actual_weight: actualWeight,
        volumetric_weight: volumetricWeight,
        chargeable_weight: chargeableWeight,
        weight_type: determinedWeightType, // Auto-determined weight type
        rate_bracket: rateBracket?.label || '', // Store the bracket label
        calculated_rate: calculatedRate, // Store the calculated rate
        number_of_boxes: boxes.length,
        weight: chargeableWeight, // Store the chargeable weight (higher of actual or volumetric)
        // Keep listed_commodities for backward compatibility (concatenate all box items)
        listed_commodities: boxes.map((box, index) => `Box ${index + 1}: ${box.items}`).join('; '),
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
                  readOnly
                  className="bg-muted cursor-not-allowed text-muted-foreground"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-generated and locked for operations</p>
              </div>
              
              <div>
                <Label htmlFor="tracking_code">Tracking Code *</Label>
                <Input
                  id="tracking_code"
                  value={verificationData.tracking_code}
                  readOnly
                  className="bg-muted cursor-not-allowed text-muted-foreground"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Matches AWB and cannot be edited here</p>
              </div>
              
              <div>
                <Label htmlFor="service_code">Service Code *</Label>
                <Select
                  value={verificationData.service_code}
                  onValueChange={(value) => setVerificationData({ ...verificationData, service_code: value })}
                  required
                  disabled
                >
                  <SelectTrigger className="bg-muted cursor-not-allowed text-muted-foreground">
                    <SelectValue placeholder="Select service code" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {/* PH to UAE Options */}
                    <SelectItem value="PH_TO_UAE">
                      <div className="flex flex-col py-1">
                        <span className="font-semibold">PH to UAE</span>
                        {chargeableWeight > 0 && route === 'PH_TO_UAE' && rateBracket && (
                          <span className="text-xs text-blue-600 font-medium">
                            Active: {rateBracket.label} → {calculatedRate} AED/kg
                          </span>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="PH_TO_UAE_EXPRESS">
                      <div className="flex flex-col py-1">
                        <span className="font-semibold">PH to UAE Express</span>
                        {chargeableWeight > 0 && route === 'PH_TO_UAE' && rateBracket && (
                          <span className="text-xs text-blue-600 font-medium">
                            Active: {rateBracket.label} → {calculatedRate} AED/kg
                          </span>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="PH_TO_UAE_STANDARD">
                      <div className="flex flex-col py-1">
                        <span className="font-semibold">PH to UAE Standard</span>
                        {chargeableWeight > 0 && route === 'PH_TO_UAE' && rateBracket && (
                          <span className="text-xs text-blue-600 font-medium">
                            Active: {rateBracket.label} → {calculatedRate} AED/kg
                          </span>
                        )}
                      </div>
                    </SelectItem>
                    {/* UAE to PH Options */}
                    <SelectItem value="UAE_TO_PH">
                      <div className="flex flex-col py-1">
                        <span className="font-semibold">UAE to PH</span>
                        {chargeableWeight > 0 && route === 'UAE_TO_PH' && rateBracket && (
                          <span className="text-xs text-blue-600 font-medium">
                            Active: {rateBracket.label} → {calculatedRate} AED/kg
                          </span>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="UAE_TO_PH_EXPRESS">
                      <div className="flex flex-col py-1">
                        <span className="font-semibold">UAE to PH Express</span>
                        {chargeableWeight > 0 && route === 'UAE_TO_PH' && rateBracket && (
                          <span className="text-xs text-blue-600 font-medium">
                            Active: {rateBracket.label} → {calculatedRate} AED/kg
                          </span>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="UAE_TO_PH_STANDARD">
                      <div className="flex flex-col py-1">
                        <span className="font-semibold">UAE to PH Standard</span>
                        {chargeableWeight > 0 && route === 'UAE_TO_PH' && rateBracket && (
                          <span className="text-xs text-blue-600 font-medium">
                            Active: {rateBracket.label} → {calculatedRate} AED/kg
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {/* Show bracket information */}
                {route && chargeableWeight > 0 && rateBracket && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="text-xs text-blue-700">
                        <span className="font-semibold">Active Bracket:</span> {rateBracket.label} 
                        <span className="ml-2">({chargeableWeight.toFixed(2)} kg)</span>
                        <span className="ml-2">→</span>
                        <span className="font-bold ml-2">{calculatedRate} AED/kg</span>
                      </div>
                    </div>
                  </div>
                )}
                {route && chargeableWeight === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Enter Actual Weight and box dimensions to calculate rate bracket
                  </p>
                )}
                {!route && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Select service code to enable rate calculation
                  </p>
                )}
                {/* Important note about weight brackets */}
                {route && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Note: Rate is automatically calculated based on chargeable weight (actual or volumetric, whichever is higher) according to weight brackets.
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Amount per kg (AED) * (Auto-Calculated)</Label>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={inputValue}
                      onChange={(e) => {
                        // Only allow editing if rate is not calculated yet
                        if (calculatedRate === 0) {
                          const value = e.target.value;
                          if (value === '' || parseFloat(value) >= 0) {
                            setVerificationData(prev => ({ ...prev, amount: value }));
                          }
                        }
                      }}
                      disabled={calculatedRate > 0}
                      readOnly={calculatedRate > 0}
                      className={calculatedRate > 0 ? 'bg-blue-50 border-blue-300 cursor-not-allowed font-semibold text-blue-900 pr-20' : ''}
                      required
                      key={`amount-${calculatedRate}-${chargeableWeight}`}
                    />
                    {calculatedRate > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                  </div>
                  {calculatedRate > 0 && rateBracket && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                      <span>
                        <span className="font-semibold">Auto-calculated:</span> {rateBracket.label} bracket 
                        <span className="mx-1">({chargeableWeight.toFixed(2)} kg)</span>
                        <span>→</span>
                        <span className="font-bold ml-1">{calculatedRate.toFixed(2)} AED/kg</span>
                        <span className="text-blue-500 ml-2">(Cannot be changed manually)</span>
                      </span>
                    </div>
                  )}
                  {calculatedRate === 0 && route && chargeableWeight === 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-amber-600 font-medium">
                        ⚠️ Enter Actual Weight and box dimensions to calculate rate
                      </p>
                      <p className="text-muted-foreground">
                        Current: Actual Weight = {actualWeight.toFixed(2)} kg, Volumetric Weight = {totalVM.toFixed(2)} kg
                      </p>
                    </div>
                  )}
                  {calculatedRate === 0 && !route && (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠️ Select service code to enable auto-calculation
                    </p>
                  )}
                  {calculatedRate === 0 && route && chargeableWeight > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-red-600 font-medium">
                        ⚠️ Error: Could not calculate rate for {chargeableWeight.toFixed(2)} kg on route {route}
                      </p>
                      <p className="text-muted-foreground">
                        Please check the browser console for details. This might indicate a bracket configuration issue.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="actual_weight">Actual Weight (kg) *</Label>
                <Input
                  id="actual_weight"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={verificationData.actual_weight}
                  onChange={(e) => setVerificationData({ ...verificationData, actual_weight: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="volume_cbm">Volume (CBM)</Label>
                <Input
                  id="volume_cbm"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
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

          {/* Agent Information */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-lg mb-4 text-blue-900">Agent Information</h3>
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

          {/* Box List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Box List *</Label>
              {!areBoxesLocked && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBox}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Box
                </Button>
              )}
              {areBoxesLocked && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Boxes locked - Verification completed</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {boxes.map((box, index) => (
                <Card key={box.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Box {index + 1}
                        {areBoxesLocked && (
                          <span className="text-xs text-muted-foreground ml-2">(Locked)</span>
                        )}
                      </CardTitle>
                      {!areBoxesLocked && boxes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBox(box.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items Description */}
                    <div>
                      <Label htmlFor={`box-${box.id}-items`}>Items in Box {index + 1} *</Label>
                      <Textarea
                        id={`box-${box.id}-items`}
                        placeholder="Enter items description..."
                        value={box.items}
                        onChange={(e) => updateBox(box.id, 'items', e.target.value)}
                        rows={2}
                        required
                        disabled={areBoxesLocked}
                        className={areBoxesLocked ? 'bg-muted cursor-not-allowed' : ''}
                      />
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`box-${box.id}-length`}>Length (cm) *</Label>
                        <Input
                          id={`box-${box.id}-length`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={box.length}
                          onChange={(e) => updateBox(box.id, 'length', e.target.value)}
                          required
                          disabled={areBoxesLocked}
                          className={areBoxesLocked ? 'bg-muted cursor-not-allowed' : ''}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`box-${box.id}-width`}>Width (cm) *</Label>
                        <Input
                          id={`box-${box.id}-width`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={box.width}
                          onChange={(e) => updateBox(box.id, 'width', e.target.value)}
                          required
                          disabled={areBoxesLocked}
                          className={areBoxesLocked ? 'bg-muted cursor-not-allowed' : ''}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`box-${box.id}-height`}>Height (cm) *</Label>
                        <Input
                          id={`box-${box.id}-height`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={box.height}
                          onChange={(e) => updateBox(box.id, 'height', e.target.value)}
                          required
                          disabled={areBoxesLocked}
                          className={areBoxesLocked ? 'bg-muted cursor-not-allowed' : ''}
                        />
                      </div>
                    </div>

                    {/* VM Calculation Display */}
                    {box.length && box.width && box.height && 
                     parseFloat(box.length) > 0 && parseFloat(box.width) > 0 && parseFloat(box.height) > 0 && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">Volumetric Weight (VM):</span>
                          <span className="text-sm font-bold text-blue-700">
                            {calculateVM(box.length, box.width, box.height).toFixed(2)} kg
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Formula: (L × W × H) / 5500 = ({box.length} × {box.width} × {box.height}) / 5500
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total VM Display */}
            {totalVM > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-green-900">Total Volumetric Weight (VM):</span>
                    <span className="text-2xl font-bold text-green-700">
                      {totalVM.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="text-sm text-green-600 mt-2">
                    Sum of all box VM calculations
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Weight Comparison and Auto-Determination */}
          {actualWeight > 0 && volumetricWeight > 0 && (
            <Card className={`border-2 ${
              determinedWeightType === 'ACTUAL' 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-purple-50 border-purple-300'
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Weight Comparison & Auto-Determination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-md border">
                    <div className="text-sm font-medium text-gray-700">Actual Weight</div>
                    <div className="text-lg font-bold text-gray-900">{actualWeight.toFixed(2)} kg</div>
                  </div>
                  <div className="bg-white p-3 rounded-md border">
                    <div className="text-sm font-medium text-gray-700">Volumetric Weight (VM)</div>
                    <div className="text-lg font-bold text-gray-900">{volumetricWeight.toFixed(2)} kg</div>
                  </div>
                </div>
                <div className={`p-4 rounded-md ${
                  determinedWeightType === 'ACTUAL' 
                    ? 'bg-blue-100 border-2 border-blue-400' 
                    : 'bg-purple-100 border-2 border-purple-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Auto-Determined Weight Type: <span className="uppercase">{determinedWeightType}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {determinedWeightType === 'ACTUAL' 
                          ? `Actual Weight (${actualWeight.toFixed(2)} kg) is higher than Volumetric Weight (${volumetricWeight.toFixed(2)} kg)`
                          : `Volumetric Weight (${volumetricWeight.toFixed(2)} kg) is higher than Actual Weight (${actualWeight.toFixed(2)} kg)`
                        }
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Chargeable Weight</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {chargeableWeight.toFixed(2)} kg
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipment Classification and Weight Type (Read-Only) */}
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
              <Label htmlFor="weight_type">Weight Type * (Auto-Determined - Cannot be changed)</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md border-2">
                  <CheckCircle className={`h-5 w-5 ${
                    determinedWeightType === 'ACTUAL' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      {determinedWeightType === 'ACTUAL' ? 'ACTUAL WEIGHT' : 'VOLUMETRIC WEIGHT'}
                    </div>
                    {actualWeight > 0 && volumetricWeight > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {determinedWeightType === 'ACTUAL' 
                          ? `Actual Weight (${actualWeight.toFixed(2)} kg) ≥ Volumetric Weight (${volumetricWeight.toFixed(2)} kg)`
                          : `Volumetric Weight (${volumetricWeight.toFixed(2)} kg) > Actual Weight (${actualWeight.toFixed(2)} kg)`
                        }
                      </div>
                    )}
                  </div>
                  {actualWeight > 0 && volumetricWeight > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Chargeable</div>
                      <div className="text-lg font-bold">
                        {chargeableWeight.toFixed(2)} kg
                      </div>
                    </div>
                  )}
                </div>
                {actualWeight === 0 || volumetricWeight === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Enter Actual Weight and box dimensions to auto-determine weight type
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Weight type is automatically determined and cannot be manually changed. The system uses the higher value: {chargeableWeight.toFixed(2)} kg ({determinedWeightType}).
                  </p>
                )}
              </div>
            </div>
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
