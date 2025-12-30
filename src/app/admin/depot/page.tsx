'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Shipment {
  id: string;
  trackingNumber: string;
  receiverName: string | null;
  receiverCompany: string | null;
  customer: {
    id: string;
    customerCode: string;
    name: string;
  } | null;
  truckNumber: string | null;
  manifestId: string | null;
  quantity: number;
  currentStatus: string;
  shippingWeek: string | null;
  weight: number | null;
  dimensions: string | null;
}

interface Manifest {
  id: string;
  name: string;
  truckPlate: string | null;
  status: string;
}

interface GroupedShipment {
    id: string;
    customerName: string;
    customerCode: string;
    shipments: Shipment[];
}

export default function DepotPage() {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [selectedManifestId, setSelectedManifestId] = useState('');
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  
  // Key: shipment.id, Value: number of scanned items
  const [scannedCounts, setScannedCounts] = useState<Record<string, number>>({});
  
  const [lastScanned, setLastScanned] = useState<Shipment | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Define data fetching functions
  const fetchManifests = useCallback(async () => {
      try {
          const res = await fetch('/api/manifests');
          if (!res.ok) throw new Error('Defterler yüklenemedi.');
          const data = await res.json();
          setManifests(Array.isArray(data) ? data : []);
      } catch (error) {
          console.error('Error fetching manifests:', error);
          setError('Defter listesi yüklenirken hata oluştu.');
      }
  }, []);

  const fetchManifestShipments = useCallback(async (manifestId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/manifests/${manifestId}`);
      if (!res.ok) throw new Error('Kargolar yüklenemedi.');
      const data = await res.json();
      if (data && Array.isArray(data.shipments)) {
        setShipments(data.shipments);
      } else {
        setShipments([]);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setError('Kargolar yüklenirken hata oluştu.');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  // Handle manifest selection
  useEffect(() => {
    if (selectedManifestId) {
      fetchManifestShipments(selectedManifestId);
    } else {
      setShipments([]);
      setFilteredShipments([]);
    }
  }, [selectedManifestId, fetchManifestShipments]);

  // Sync filtered shipments
  useEffect(() => {
    setFilteredShipments(shipments);
  }, [shipments]);

  // Focus management
  useEffect(() => {
    const focusInput = () => {
        if (document.activeElement !== inputRef.current && selectedManifestId) {
            inputRef.current?.focus();
        }
    };
    
    const interval = setInterval(focusInput, 2000);
    const clickHandler = () => focusInput();
    
    window.addEventListener('click', clickHandler);
    
    return () => {
        clearInterval(interval);
        window.removeEventListener('click', clickHandler);
    };
  }, [selectedManifestId]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code) return;
    
    if (!selectedManifestId) {
        alert('Lütfen önce bir Defter/Tır seçiniz.');
        setScanInput('');
        return;
    }

    const shipment = filteredShipments.find(s => s.trackingNumber === code);

    if (shipment) {
        const currentCount = scannedCounts[shipment.id] || 0;
        if (currentCount < shipment.quantity) {
            const newCount = currentCount + 1;
            setScannedCounts(prev => ({ ...prev, [shipment.id]: newCount }));
            setLastScanned(shipment);
        } else {
            alert(`Bu kargo zaten tamamen okutuldu! (${shipment.quantity}/${shipment.quantity})`);
        }
    } else {
        alert('Kargo bulunamadı veya seçilen defterde değil!');
    }
    setScanInput('');
  };

  const handleApprove = async () => {
      if (!confirm('Okutulan kargoların durumu "DEPODA" olarak güncellenecek. Onaylıyor musunuz?')) return;

      const scannedShipmentIds = Object.keys(scannedCounts).filter(id => scannedCounts[id] > 0);
      
      let successCount = 0;
      for (const id of scannedShipmentIds) {
          const shipment = shipments.find(s => s.id === id);
          if (shipment && scannedCounts[id] === shipment.quantity) {
             try {
                 await fetch('/api/shipments', {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         id,
                         currentStatus: 'DEPODA'
                     })
                 });
                 successCount++;
             } catch (err) {
                 console.error('Update error', err);
             }
          }
      }
      
      alert(`${successCount} kargo başarıyla güncellendi.`);
      if (selectedManifestId) fetchManifestShipments(selectedManifestId);
      setScannedCounts({});
      setLastScanned(null);
  };

  // Group logic with safety checks
  const getGroupedShipments = () => {
      if (!Array.isArray(filteredShipments)) return {};
      
      try {
          return filteredShipments.reduce((acc, shipment) => {
              if (!shipment) return acc; // Skip invalid entries
              
              const key = shipment.customer?.id || shipment.receiverName || 'Unknown';
              // Use Object.prototype.hasOwnProperty for safety
              if (!Object.prototype.hasOwnProperty.call(acc, key)) {
                  acc[key] = {
                      id: key,
                      customerName: shipment.customer?.name || shipment.receiverName || 'Bilinmiyor',
                      customerCode: shipment.customer?.customerCode || '-',
                      shipments: []
                  };
              }
              acc[key].shipments.push(shipment);
              return acc;
          }, {} as Record<string, GroupedShipment>);
      } catch (err) {
          console.error("Grouping error:", err);
          return {};
      }
  };

  const groupedShipments = getGroupedShipments();

  const isGroupComplete = (group: GroupedShipment) => {
      if (!group || !Array.isArray(group.shipments)) return false;
      return group.shipments.every(s => s && (scannedCounts[s.id] || 0) >= s.quantity);
  };
  
  const isShipmentComplete = (s: Shipment) => {
      return s && (scannedCounts[s.id] || 0) >= s.quantity;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Depo Boşaltım / Mal Kabul</h1>
      
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Hata: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Manifest Selection */}
      <div className="mb-6 bg-white p-4 rounded shadow border border-gray-200">
          <label className="block text-sm font-bold mb-2 text-gray-700">Defter / Tır Seçimi:</label>
          <select 
            value={selectedManifestId} 
            onChange={(e) => setSelectedManifestId(e.target.value)}
            className="w-full md:w-1/2 p-2 border rounded"
          >
              <option value="">-- Seçiniz --</option>
              {manifests.map(m => (
                  <option key={m.id} value={m.id}>
                      {m.name} {m.truckPlate ? `(${m.truckPlate})` : ''} - {m.status}
                  </option>
              ))}
          </select>
      </div>

      {loading && (
          <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Yükleniyor...</p>
          </div>
      )}

      {selectedManifestId && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Scanner & Last Scanned */}
              <div className="lg:col-span-1 space-y-6">
                  {/* Scanner Input */}
                  <div className="bg-white p-6 rounded shadow border border-blue-200">
                      <h2 className="text-xl font-bold mb-4 text-blue-800">Barkod Okut</h2>
                      <form onSubmit={handleScan}>
                          <input
                              ref={inputRef}
                              type="text"
                              value={scanInput}
                              onChange={(e) => setScanInput(e.target.value)}
                              className="w-full p-4 text-2xl border-2 border-blue-500 rounded focus:outline-none focus:ring-4 focus:ring-blue-200"
                              placeholder="Barkod..."
                              autoFocus
                          />
                      </form>
                      <p className="text-sm text-gray-500 mt-2 text-center">İmleç otomatik odaklanacaktır.</p>
                  </div>

                  {/* Last Scanned Info */}
                  {lastScanned && (
                      <div className="bg-green-50 p-6 rounded shadow border border-green-200 animate-pulse">
                          <h3 className="text-lg font-bold text-green-800 mb-2">Son Okunan:</h3>
                          <div className="space-y-2">
                              <p className="text-2xl font-bold text-gray-900">{lastScanned.customer?.name || lastScanned.receiverName}</p>
                              <p className="font-mono text-gray-600">{lastScanned.customer?.customerCode}</p>
                              <div className="border-t border-green-200 my-2 pt-2">
                                  <p><span className="font-bold">Takip No:</span> {lastScanned.trackingNumber}</p>
                                  <p><span className="font-bold">Koli:</span> {scannedCounts[lastScanned.id] || 0} / {lastScanned.quantity}</p>
                                  <p><span className="font-bold">Firma:</span> {lastScanned.receiverCompany || '-'}</p>
                              </div>
                          </div>
                      </div>
                  )}
                  
                  <button 
                    onClick={handleApprove}
                    className="w-full bg-indigo-600 text-white py-4 rounded font-bold text-xl hover:bg-indigo-700 shadow-lg transition"
                  >
                      Tümünü Onayla
                  </button>
              </div>

              {/* Right Column: List */}
              <div className="lg:col-span-2">
                  <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                      <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center">
                          <h2 className="text-xl font-bold text-gray-800">Tır İçeriği ({filteredShipments.length} Kargo)</h2>
                      </div>
                      <div className="p-4 max-h-[600px] overflow-y-auto space-y-4">
                          {Object.values(groupedShipments).map((group) => {
                              const isComplete = isGroupComplete(group);
                              return (
                                  <div key={group.id} className={`border rounded p-4 ${isComplete ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
                                      <div className="flex justify-between items-start mb-2">
                                          <div>
                                              <h3 className="text-lg font-bold flex items-center gap-2">
                                                  {group.customerName}
                                                  {isComplete && <span className="text-green-600 text-2xl">✓</span>}
                                              </h3>
                                              <p className="text-sm text-gray-500">{group.customerCode}</p>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-sm font-bold text-gray-700">
                                                  {group.shipments.reduce((sum, s) => sum + (scannedCounts[s.id] || 0), 0)} / 
                                                  {group.shipments.reduce((sum, s) => sum + s.quantity, 0)} Koli
                                              </p>
                                          </div>
                                      </div>
                                      
                                      {/* Detailed Shipment List inside Group */}
                                      <div className="space-y-2 mt-2">
                                          {group.shipments.map((s) => (
                                              <div key={s.id} className={`flex justify-between items-center text-sm p-2 rounded ${isShipmentComplete(s) ? 'bg-green-100 text-green-800' : 'bg-gray-50 text-gray-600'}`}>
                                                  <span className="font-mono">{s.trackingNumber}</span>
                                                  <span>{s.dimensions || '-'}</span>
                                                  <span>{s.weight ? `${s.weight}kg` : '-'}</span>
                                                  <span className="font-bold">
                                                      {scannedCounts[s.id] || 0}/{s.quantity}
                                                  </span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              );
                          })}
                          
                          {Object.keys(groupedShipments).length === 0 && (
                              <p className="text-center text-gray-500 py-8">Bu defterde kargo bulunamadı.</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
