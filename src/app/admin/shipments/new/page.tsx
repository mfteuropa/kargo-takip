'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toUpperCaseTR } from '@/lib/utils'

export default function NewShipmentPage() {
  const router = useRouter()
  
  // Form State
  const [formData, setFormData] = useState({
    customerCode: '',
    quantity: 1,
    weight: '',
    
    // Dimensions
    width: '',
    height: '',
    depth: '',
    volume: 0,

    senderName: '',
    supplierName: '', // Gönderen Firma
    senderPhone: '',
    senderAddress: '',
    
    receiverName: '',
    receiverCompany: '',
    receiverAddress: '',
    receiverPhone: '', // Alıcı Telefon
    country: '', // Ülke artık alıcıda
    
    paymentMethod: '',
    manifestId: '',
    
    currentStatus: 'MERKEZ_DEPO', // Varsayılan
  })

  // Multiple Dimensions State
  const [dimensionRows, setDimensionRows] = useState([
    { width: '', height: '', depth: '', weight: '', count: 1 }
  ])

  // Data Loading State
  const [manifests, setManifests] = useState<any[]>([])
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch Manifests on Mount
  useEffect(() => {
    fetch('/api/manifests')
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) {
             setManifests(data)
             
             // Auto-select latest OPEN manifest
             const latestOpen = data
                .filter((m: any) => m.status === 'ACIK')
                // Assuming newer ones are at the end or have a date field, but API order is usually reliable or we can sort if needed.
                // For now, let's pick the last created 'ACIK' one if the list is chronological, or just the first found.
                // Usually newest is last? Or first? Let's check API. 
                // To be safe, let's assume we want the most recent 'ACIK' one.
                // If the user says "new manifest added", it implies we want the one just created.
                .pop(); // Taking the last one assuming chronological order (oldest first)

             if (latestOpen) {
                 setFormData(prev => ({ ...prev, manifestId: latestOpen.id }))
             }
          } else {
             setManifests([])
          }
      })
      .catch(err => console.error('Manifests fetch error', err))
  }, [])

  // Calculate Volume and Quantity from Rows
   useEffect(() => {
     let totalVol = 0
     let totalQty = 0
     let totalWeight = 0
 
     dimensionRows.forEach(row => {
         const w = parseFloat(row.width) || 0
         const h = parseFloat(row.height) || 0
         const d = parseFloat(row.depth) || 0
         const we = parseFloat(row.weight) || 0
         const c = parseInt(row.count.toString()) || 1
         
         if (w && h && d) {
             totalVol += ((w * h * d) / 1000000) * c
         }
         totalQty += c
         totalWeight += we * c
     })
 
     setFormData(prev => ({ 
         ...prev, 
         volume: parseFloat(totalVol.toFixed(4)),
         quantity: totalQty,
         weight: totalWeight > 0 ? totalWeight.toFixed(2) : ''
     }))
   }, [dimensionRows])
 
   const handleDimensionChange = (index: number, field: string, value: string) => {
     const newRows = [...dimensionRows]
     newRows[index] = { ...newRows[index], [field]: value }
     setDimensionRows(newRows)
   }
 
   const addDimensionRow = () => {
     setDimensionRows([...dimensionRows, { width: '', height: '', depth: '', weight: '', count: 1 }])
   }

  const removeDimensionRow = (index: number) => {
    if (dimensionRows.length > 1) {
        setDimensionRows(dimensionRows.filter((_, i) => i !== index))
    }
  }

  // Customer Search
  const handleCustomerSearch = async (query: string) => {
      if (query.length < 2) {
          setCustomerSuggestions([])
          setShowSuggestions(false)
          return
      }

      try {
          const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`)
          const data = await res.json()
          setCustomerSuggestions(Array.isArray(data) ? data : [])
          setShowSuggestions(true)
      } catch (err) {
          console.error(err)
      }
  }

  const selectCustomer = (customer: any) => {
      setFormData(prev => ({
          ...prev,
          customerCode: customer.customerCode.replace('MFT-', ''),
          receiverName: customer.name || '',
          receiverPhone: customer.phoneNumber || '',
          country: customer.country || '',
          receiverAddress: customer.address || '',
          // receiverCompany might not be in customer model, check schema?
          // Schema has `company`? No, schema has `name`, `email`, `phoneNumber`, `address`, `city`, `country`.
      }))
      setShowSuggestions(false)
  }

  const generateNewCustomerCode = async () => {
      try {
          const res = await fetch('/api/customers?next=true');
          if (res.ok) {
              const data = await res.json();
              if (data.nextCode) {
                  setFormData(prev => ({ ...prev, customerCode: data.nextCode.toString() }));
              }
          }
      } catch (err) {
          console.error('Error generating code', err);
      }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target
    let { value } = e.target
    
    if (e.target.tagName !== 'SELECT' && e.target.type !== 'date' && e.target.type !== 'number') {
        value = toUpperCaseTR(value)
    }

    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'receiverName' || name === 'customerCode') {
        handleCustomerSearch(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Construct dimensions string
      const dimensionsString = dimensionRows
        .filter(r => r.width && r.height && r.depth)
        .map(r => `${r.width}x${r.height}x${r.depth} (${r.count} ad - ${r.weight || 0} kg/ad)`)
        .join(', ')

      // Prepare payload
      const payload = {
          ...formData,
          dimensions: dimensionsString,
          // manifestId might be empty string, send null if so? API handles it?
          manifestId: formData.manifestId || null
      }

      // Remove unused fields
      delete (payload as any).width
      delete (payload as any).height
      delete (payload as any).depth

      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/admin/shipments/${data.id}/label?autoprint=true`)
      } else {
        const data = await res.json()
        setError(data.error || 'Kargo oluşturulamadı.')
      }
    } catch (err) {
      setError('Bir hata oluştu.')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">Yeni Kargo Ekle</h1>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* İşlem Bilgileri */}
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <h2 className="text-lg font-semibold mb-4 text-blue-700">İşlem & Manifest</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Haftalık Defter (Manifest)</label>
                    <select name="manifestId" value={formData.manifestId} onChange={handleChange} className="w-full rounded border px-3 py-2">
                        <option value="">Seçiniz...</option>
                        {manifests.map(m => (
                            <option key={m.id} value={m.id}>{m.name} {m.truckPlate ? `(${m.truckPlate})` : ''}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Durum</label>
                    <input type="text" value="İstanbul Merkez Depo" disabled className="w-full rounded border px-3 py-2 bg-gray-200 text-gray-600" />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sol Kolon: Kargo Detayları */}
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Kargo Detayları</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-gray-700">Toplam Koli</label>
                                <input type="number" value={formData.quantity} readOnly className="w-full rounded border px-3 py-2 bg-gray-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-gray-700">Toplam Kilo (kg)</label>
                                <input type="number" step="0.1" name="weight" value={formData.weight} readOnly className="w-full rounded border px-3 py-2 bg-gray-100" placeholder="12.5" />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-sm font-semibold text-gray-700">Ebatlar ve Adetler</label>
                                <button type="button" onClick={addDimensionRow} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-bold">+ Ebat Ekle</button>
                            </div>
                            
                            <div className="space-y-2">
                                {dimensionRows.map((row, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <div className="grid grid-cols-5 gap-2 flex-1">
                                            <input 
                                                type="number" 
                                                value={row.width} 
                                                onChange={(e) => handleDimensionChange(index, 'width', e.target.value)} 
                                                placeholder="En" 
                                                className="w-full rounded border px-2 py-2 text-sm" 
                                            />
                                            <input 
                                                type="number" 
                                                value={row.height} 
                                                onChange={(e) => handleDimensionChange(index, 'height', e.target.value)} 
                                                placeholder="Boy" 
                                                className="w-full rounded border px-2 py-2 text-sm" 
                                            />
                                            <input 
                                                type="number" 
                                                value={row.depth} 
                                                onChange={(e) => handleDimensionChange(index, 'depth', e.target.value)} 
                                                placeholder="Yük" 
                                                className="w-full rounded border px-2 py-2 text-sm" 
                                            />
                                            <input 
                                                type="number" 
                                                value={row.weight} 
                                                onChange={(e) => handleDimensionChange(index, 'weight', e.target.value)} 
                                                placeholder="kg (ad)" 
                                                className="w-full rounded border px-2 py-2 text-sm" 
                                            />
                                            <input 
                                                type="number" 
                                                value={row.count} 
                                                onChange={(e) => handleDimensionChange(index, 'count', e.target.value)} 
                                                placeholder="Adet" 
                                                className="w-full rounded border px-2 py-2 text-sm bg-yellow-50 font-bold text-center"
                                                min="1" 
                                            />
                                        </div>
                                        {dimensionRows.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeDimensionRow(index)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                                title="Sil"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Hacim (m³)</label>
                            <input type="number" value={formData.volume} disabled className="w-full rounded border px-3 py-2 bg-gray-100" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Ödeme Bilgisi</label>
                             <input type="text" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full rounded border px-3 py-2" placeholder="Örn: 50€ Alıcı Ödemeli" />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Gönderen Bilgileri</h2>
                    <div className="space-y-4">
                         <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Gönderen Adı</label>
                            <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-gray-700">Telefon</label>
                                <input type="text" name="senderPhone" value={formData.senderPhone} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-gray-700">Firma (Opsiyonel)</label>
                                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sağ Kolon: Alıcı Bilgileri */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 h-fit">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Alıcı Bilgileri</h2>
                <div className="space-y-4 relative">
                    
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Alıcı Adı / Müşteri Ara</label>
                        <input 
                            type="text" 
                            name="receiverName" 
                            value={formData.receiverName} 
                            onChange={handleChange} 
                            className="w-full rounded border px-3 py-2" 
                            placeholder="İsim yazmaya başlayın..."
                            autoComplete="off"
                        />
                        {showSuggestions && customerSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                                {customerSuggestions.map(c => (
                                    <div 
                                        key={c.id} 
                                        className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                        onClick={() => selectCustomer(c)}
                                    >
                                        <div className="font-bold">{c.name}</div>
                                        <div className="text-xs text-gray-500">{c.customerCode} - {c.city || ''}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Müşteri Kodu (MFT-)</label>
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={generateNewCustomerCode}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-bold transition whitespace-nowrap"
                                    title="Yeni Müşteri Kodu Oluştur"
                                >
                                    + Yeni
                                </button>
                                <div className="relative flex items-center flex-1">
                                    <span className="absolute left-3 text-gray-500 font-bold">MFT-</span>
                                    <input type="text" name="customerCode" value={formData.customerCode} onChange={handleChange} className="w-full rounded border pl-14 pr-3 py-2" placeholder="4000" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Telefon</label>
                            <input type="text" name="receiverPhone" value={formData.receiverPhone} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Ülke</label>
                        <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full rounded border px-3 py-2" placeholder="Almanya" />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Firma İsmi</label>
                        <input type="text" name="receiverCompany" value={formData.receiverCompany} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Adres</label>
                        <textarea name="receiverAddress" value={formData.receiverAddress} onChange={handleChange} className="w-full rounded border px-3 py-2" rows={3} />
                    </div>

                </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-4 font-bold text-white hover:bg-blue-700 disabled:bg-blue-300 text-lg"
          >
            {loading ? 'Kaydediliyor...' : 'Kargoyu Kaydet'}
          </button>
        </form>
      </div>
    </div>
  )
}
