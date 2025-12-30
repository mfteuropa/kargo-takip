'use client';

import { QRCodeCanvas } from 'qrcode.react';
import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface LabelClientProps {
  shipment: any;
}

export default function LabelClient({ shipment }: LabelClientProps) {
  const searchParams = useSearchParams();
  const quantity = shipment.quantity || 1;
  const labels = Array.from({ length: quantity }, (_, i) => i + 1);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (searchParams.get('autoprint') === 'true') {
        // Small delay to ensure rendering
        setTimeout(() => {
            window.print();
        }, 500);
    }
  }, [searchParams]);

  // QR Value: Tracking Number is usually enough for the system to lookup details
  const qrValue = shipment.trackingNumber;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="mb-8 print:hidden flex justify-between items-center max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">Kargo Etiketleri ({quantity} Adet)</h1>
        <div className="flex gap-4">
             <button
                onClick={() => window.history.back()}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 font-bold"
            >
                Geri Dön
            </button>
            <button
                onClick={handlePrint}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold"
            >
                Yazdır
            </button>
        </div>
      </div>

      <div className="print-area grid grid-cols-1 gap-8 print:block print:gap-0 max-w-4xl mx-auto">
        {labels.map((num) => (
          <div key={num} className="bg-white border-4 border-black p-4 w-[100mm] h-[100mm] flex flex-col justify-between break-inside-avoid mb-8 print:mb-0 print:break-after-page mx-auto print:mx-0 shadow-lg print:shadow-none box-border">
            
            {/* Header: Customer Info */}
            <div className="border-b-4 border-black pb-2 mb-2">
               <div className="flex justify-between items-center">
                   <h2 className="text-4xl font-black">{shipment.customer?.customerCode || shipment.customerCode || '---'}</h2>
                   <span className="text-xl font-bold border-2 border-black px-2 py-1 rounded">{num} / {quantity}</span>
               </div>
               <p className="text-xl font-bold truncate mt-1">{shipment.receiverName}</p>
            </div>

            {/* Content */}
            <div className="flex justify-between items-start flex-grow py-2">
               <div className="text-base font-bold space-y-2 flex-1 pr-2">
                  <div>
                      <span className="block text-xs font-normal text-gray-500">GÖNDEREN FİRMA</span>
                      <p className="uppercase">{shipment.supplierName || shipment.senderName || '-'}</p>
                  </div>
                   <div>
                      <span className="block text-xs font-normal text-gray-500">ÖLÇÜLER / HACİM</span>
                      <p className="text-sm">{shipment.dimensions || '-'}</p>
                      <p>{shipment.volume ? `${shipment.volume} m³` : ''}</p>
                  </div>
                  <div>
                      <span className="block text-xs font-normal text-gray-500">AĞIRLIK</span>
                      <p>{shipment.weight ? `${shipment.weight} KG` : '-'}</p>
                  </div>
                  {shipment.paymentMethod && (
                      <div>
                          <span className="block text-xs font-normal text-gray-500">ÖDEME</span>
                          <p className="text-red-600">{shipment.paymentMethod}</p>
                      </div>
                  )}
               </div>
               
               <div className="flex flex-col items-center justify-center min-w-[100px]">
                  <QRCodeCanvas value={qrValue} size={110} level="H" />
                  <p className="text-xs font-mono mt-1 font-bold">{shipment.trackingNumber}</p>
               </div>
            </div>

             {/* Footer */}
            <div className="border-t-4 border-black pt-2 mt-1">
               <p className="text-xs text-right mt-1 font-mono">{new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: 100mm 100mm; 
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
