'use client';

import React from 'react';
import QRCode from './qr-code';

interface InvoiceData {
  invoiceNumber: string;
  awbNumber: string;
  trackingNumber: string;
  date: string;
  receiverInfo: {
    name: string;
    address: string;
    emirate: string;
    mobile: string;
  };
  senderInfo: {
    address: string;
    email: string;
    phone: string;
  };
  shipmentDetails: {
    numberOfBoxes: number;
    weight: number;
    weightType: 'ACTUAL' | 'VOLUMETRIC';
    rate: number;
  };
  charges: {
    shippingCharge: number;
    deliveryCharge: number;
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
  };
  remarks: {
    boxNumbers: string;
    agent: string;
  };
  termsAndConditions: string;
  qrCode?: {
    url: string;
    code: string;
  };
}

interface InvoiceTemplateProps {
  data: InvoiceData;
}

export default function InvoiceTemplate({ data }: InvoiceTemplateProps) {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        {/* Left Side - Logo and Company Info */}
        <div className="flex items-start space-x-4">
          {/* Logo */}
          <div className="bg-green-600 text-white p-4 rounded-lg">
            <div className="text-3xl font-bold">KN</div>
            <div className="text-sm italic -mt-1">EXPRESS</div>
          </div>
          
          {/* Company Details */}
          <div>
            <h1 className="text-2xl font-bold text-green-600 mb-1">KN EXPRESS UAE</h1>
            <p className="text-sm text-green-600 mb-2">www.knexpress.ae</p>
            <p className="text-sm text-gray-700">Knex Delivery Services L.L.C.</p>
          </div>
        </div>

        {/* Right Side - Invoice Details */}
        <div className="text-right">
          <h2 className="text-3xl font-bold text-black mb-4">INVOICE</h2>
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">INVOICE #</span> {data.invoiceNumber}</p>
            <p><span className="font-semibold">AWB #</span> {data.awbNumber}</p>
            <p><span className="font-semibold">Tracking</span></p>
            <p className="font-mono">#{data.trackingNumber}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Receiver Information */}
        <div>
          <h3 className="text-lg font-bold text-black mb-4 uppercase">RECEIVER INFORMATION</h3>
          <div className="space-y-2">
            <p className="font-semibold text-lg">{data.receiverInfo.name}</p>
            <p className="text-sm leading-relaxed">{data.receiverInfo.address}</p>
            <p className="text-sm">{data.receiverInfo.emirate}</p>
            <p className="text-sm">{data.receiverInfo.mobile}</p>
          </div>
        </div>

        {/* Sender/Company Contact */}
        <div className="text-right">
          <div className="space-y-2 mb-4">
            <p className="text-sm font-semibold">{data.date}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="leading-relaxed">{data.senderInfo.address}</p>
            <p>{data.senderInfo.email}</p>
            <p>{data.senderInfo.phone}</p>
          </div>
        </div>
      </div>

      {/* Shipment Details Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">No of Boxes</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Weight</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2">{data.shipmentDetails.numberOfBoxes}</td>
              <td className="border border-gray-300 px-4 py-2">
                <div>
                  <span className="font-semibold">{data.shipmentDetails.weight} kg</span>
                  <div className="text-xs text-gray-600">
                    Weight Base: {data.shipmentDetails.weightType === 'ACTUAL' ? 'Actual Weight' : 'Volumetric Weight'}
                  </div>
                </div>
              </td>
              <td className="border border-gray-300 px-4 py-2">{data.shipmentDetails.rate.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Charges Summary - Normal Invoice shows total with tax, but no tax breakdown */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-left">Shipping Charge</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{data.charges.shippingCharge.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-left">Delivery Charge</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{data.charges.deliveryCharge.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-gray-300 px-4 py-2 text-left font-bold">Total Amount</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-bold">{data.charges.total.toFixed(2)} AED</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Section */}
      {data.qrCode && (
        <div className="my-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold mb-2">PAYMENT QR CODE</h4>
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code to make payment for this invoice
              </p>
              <p className="text-xs text-gray-500 font-mono">
                Code: {data.qrCode.code}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                URL: {data.qrCode.url}
              </p>
            </div>
            <div className="text-center">
              <QRCode value={data.qrCode.url} size={200} className="mx-auto" />
              <p className="text-xs text-gray-500 mt-2">Scan to Pay</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug QR Code Data */}
      {!data.qrCode && (
        <div className="my-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold mb-2 text-yellow-800">QR Code Debug Info</h4>
          <p className="text-sm text-yellow-700">
            QR Code data not available. This might be because:
          </p>
          <ul className="text-xs text-yellow-600 mt-2 list-disc list-inside">
            <li>Delivery assignment creation failed</li>
            <li>QR code data not passed to template</li>
            <li>Check console logs for delivery assignment errors</li>
          </ul>
        </div>
      )}

      {/* Footer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Remarks */}
        <div>
          <h4 className="font-semibold mb-2">REMARKS:</h4>
          <div className="space-y-1 text-sm">
            <p>BOX# {data.remarks.boxNumbers}</p>
            <p>AGENT: {data.remarks.agent}</p>
          </div>
        </div>

        {/* Right Side - Terms */}
        <div className="text-right">
          <h4 className="font-semibold mb-2">TERMS AND CONDITIONS:</h4>
          <p className="text-sm">{data.termsAndConditions}</p>
        </div>
      </div>
    </div>
  );
}

// Sample data for testing
export const sampleInvoiceData: InvoiceData = {
  invoiceNumber: '6290',
  awbNumber: '2321',
  trackingNumber: 'PHLJBP42GOBOBN1',
  date: '17-Oct-2025',
  receiverInfo: {
    name: 'CRISTINA BATAC',
    address: 'UNITED ARAB EMIRATES ABU DHABI CITY HAMDAN ST. OPPOSITE AHALIA BLDG FLAT 204',
    emirate: 'Abu Dhabi',
    mobile: '+971502781566'
  },
  senderInfo: {
    address: '11th Street Warehouse No. 19, Rocky Warehouses Al Qusais Industrial 1, Dubai - UAE',
    email: 'customercare@knexpress.ae',
    phone: '+971 56 864 3473'
  },
  shipmentDetails: {
    numberOfBoxes: 6,
    weight: 138.12,
    weightType: 'VOLUMETRIC',
    rate: 31.00
  },
  charges: {
    shippingCharge: 4281.72,
    deliveryCharge: 0.00,
    subtotal: 4281.72,
    total: 4281.72
  },
  remarks: {
    boxNumbers: '47-48, 51-54',
    agent: 'JESS'
  },
  termsAndConditions: 'Cash Upon Receipt of Goods'
};