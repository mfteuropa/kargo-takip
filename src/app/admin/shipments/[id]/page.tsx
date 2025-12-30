'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toUpperCaseTR } from '@/lib/utils'

export default function EditShipmentPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  
  const [formData, setFormData] = useState({
    trackingNumber: '',
    customerCode: '',
    country: '',
    quantity: 1,
    dimensions: '',
    weight: '',
    
    senderName: '',
    supplierName: '', // Gönderen Firma
    senderAddress: '',
    senderPhone: '',
    
    receiverName: '',
    receiverCompany: '',
    receiverAddress: '',
    receiverPhone: '', // Alıcı İletişim Telefonu
    phoneNumber: '', // Müşteri Sorgulama Telefonu
    
    paymentMethod: '',
    truckNumber: '',
    shippingWeek: '',
    currentStatus: 'ALINDI',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dimensionRows, setDimensionRows] = useState([
    { width: '', height: '', depth: '', weight: '', count: 1 }
  ])

  useEffect(() => {
    fetchShipment()
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
        // volume: parseFloat(totalVol.toFixed(4)), // Edit page might not have volume in state yet or need it
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

  const fetchShipment = async () => {
    try {
      const res = await fetch(`/api/shipments?id=${id}`)
      if (res.ok) {
        const result = await res.json()
        if (result.type === 'detail') {
          const data = result.data
          setFormData({
            trackingNumber: data.trackingNumber || '',
            customerCode: data.customer?.customerCode || '',
            country: data.country || '',
            quantity: data.quantity || 1,
            dimensions: data.dimensions || '',
            weight: data.weight ? data.weight.toString() : '',
            
            senderName: data.senderName || '',
            supplierName: data.supplierName || '',
            senderAddress: data.senderAddress || '',
            senderPhone: data.senderPhone || '',
            
            receiverName: data.receiverName || '',
            receiverCompany: data.receiverCompany || '',
            receiverAddress: data.receiverAddress || '',
            receiverPhone: data.receiverPhone || '',
            phoneNumber: data.customer?.phoneNumber || '',
            
            paymentMethod: data.paymentMethod || '',
            truckNumber: data.truckNumber || '',
            shippingWeek: data.shippingWeek || '',
            currentStatus: data.currentStatus || 'ALINDI',
          })

          // Parse dimensions string to rows
          if (data.dimensions) {
             const rows: any[] = []
             // Matches: 60x40x40 (5 ad - 10 kg/ad) OR 60x40x40 (5)
             const parts = data.dimensions.split(', ')
             parts.forEach((part: string) => {
                 // Try to match new format with weight
                 // Example: 60x40x40 (5 ad - 10 kg/ad)
                 const matchWithWeight = part.match(/(\d+)x(\d+)x(\d+)\s*\((\d+)\s*ad\s*-\s*([\d.]+)\s*kg\/ad\)/)
                 
                 if (matchWithWeight) {
                     rows.push({
                         width: matchWithWeight[1],
                         height: matchWithWeight[2],
                         depth: matchWithWeight[3],
                         count: parseInt(matchWithWeight[4]),
                         weight: matchWithWeight[5]
                     })
                 } else {
                     // Try old format
                     // Example: 60x40x40 (5)
                     const matchOld = part.match(/(\d+)x(\d+)x(\d+)\s*\((\d+)\)/)
                     if (matchOld) {
                         rows.push({
                             width: matchOld[1],
                             height: matchOld[2],
                             depth: matchOld[3],
                             count: parseInt(matchOld[4]),
                             weight: '' // Weight unknown in old format
                         })
                     }
                 }
             })
             
             if (rows.length > 0) {
                 setDimensionRows(rows)
             }
          }
        }
      } else {
        setError('Kargo bulunamadı.')
      }
    } catch (err) {
      setError('Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target
    let { value } = e.target

    if (e.target.tagName !== 'SELECT' && e.target.type !== 'date' && e.target.type !== 'number') {
        value = toUpperCaseTR(value)
    }

    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Construct dimensions string from rows
    const dimensionsString = dimensionRows
      .filter(r => r.width && r.height && r.depth)
      .map(r => `${r.width}x${r.height}x${r.depth} (${r.count} ad - ${r.weight || 0} kg/ad)`)
      .join(', ')

    try {
      const res = await fetch('/api/shipments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            id, 
            ...formData,
            dimensions: dimensionsString 
        }),
      })

      if (res.ok) {
        router.push('/admin/shipments')
      } else {
        const data = await res.json()
        setError(data.error || 'Kargo güncellenemedi.')
      }
    } catch (err) {
      setError('Bir hata oluştu.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bu kargoyu silmek istediğinize emin misiniz?')) return

    try {
        const res = await fetch(`/api/shipments?id=${id}`, {
            method: 'DELETE'
        })
        if (res.ok) {
            router.push('/admin/shipments')
        } else {
            alert('Silme işlemi başarısız.')
        }
    } catch (error) {
        alert('Bir hata oluştu.')
    }
  }

  if (loading) return <div className="p-6">Yükleniyor...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl rounded-lg bg-white p-8 shadow-md">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Kargo Düzenle</h1>
            <div className="flex gap-2">
                <button
                    onClick={() => router.push(`/admin/shipments/${id}/label`)}
                    className="rounded bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
                >
                    Etiket Yazdır
                </button>
                <button
                    onClick={handleDelete}
                    className="rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                >
                    Sil
                </button>
            </div>
        </div>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Temel Bilgiler */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-blue-600">Kargo & Müşteri Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Takip Numarası</label>
                <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} className="w-full rounded border px-3 py-2" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Durum</label>
                <select name="currentStatus" value={formData.currentStatus} onChange={handleChange} className="w-full rounded border px-3 py-2">
                    <option value="ALINDI">Alındı</option>
                    <option value="MERKEZ_DEPO">İstanbul Merkez Depo</option>
                    <option value="GUMRUK_TR">Türkiye Gümrük</option>
                    <option value="TRANSIT">Transfer Sürecinde</option>
                    <option value="GUMRUK_DE">Almanya Gümrük</option>
                    <option value="DEPO_DE">Almanya Merkez Depo</option>
                    <option value="DAGITIMDA">Dağıtımda</option>
                    <option value="TESLIM_EDILDI">Teslim Edildi</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Müşteri Kodu (MFT-)</label>
                <div className="relative flex items-center">
                    <span className="absolute left-3 text-gray-500 font-bold">MFT-</span>
                    <input type="text" name="customerCode" value={formData.customerCode} onChange={handleChange} className="w-full rounded border pl-14 pr-3 py-2" placeholder="4000" disabled />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Ülke</label>
                <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full rounded border px-3 py-2" placeholder="Almanya" />
              </div>
              <div>
                 <label className="mb-1 block text-sm font-semibold text-gray-700">Koli Adeti</label>
                 <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full rounded border px-3 py-2" min="1" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Ödeme Bilgisi</label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full rounded border px-3 py-2">
                    <option value="">Seçiniz</option>
                    <option value="ALICI_ODEMELI">Alıcı Ödemeli</option>
                    <option value="GONDERICI_ODEMELI">Gönderici Ödemeli</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
               <div className="md:col-span-2">
                   <label className="mb-2 block text-sm font-semibold text-gray-700">Ebatlar ve Adetler</label>
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
                                       className="p-2 text-red-500 hover:text-red-700"
                                   >
                                       🗑️
                                   </button>
                               )}
                           </div>
                       ))}
                   </div>
                   <button 
                       type="button" 
                       onClick={addDimensionRow}
                       className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                   >
                       + Yeni Ebat Ekle
                   </button>
               </div>
           </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Toplam Koli</label>
                    <input type="number" value={formData.quantity} readOnly className="w-full rounded border px-3 py-2 bg-gray-100" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Toplam Kilo (kg)</label>
                    <input type="number" step="0.1" name="weight" value={formData.weight} readOnly className="w-full rounded border px-3 py-2 bg-gray-100" placeholder="12.5" />
                </div>
            </div>
          </div>

          {/* Gönderici Bilgileri */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-blue-600">Gönderen Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Gönderen Adı</label>
                    <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Firma İsmi (Tedarikçi)</label>
                    <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Telefon</label>
                    <input type="text" name="senderPhone" value={formData.senderPhone} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
                 <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Adres</label>
                    <textarea name="senderAddress" value={formData.senderAddress} onChange={handleChange} className="w-full rounded border px-3 py-2" rows={2} />
                </div>
            </div>
          </div>

          {/* Alıcı Bilgileri */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-blue-600">Alıcı Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Alıcı İsim Soyisim</label>
                    <input type="text" name="receiverName" value={formData.receiverName} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Firma İsmi</label>
                    <input type="text" name="receiverCompany" value={formData.receiverCompany} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Alıcı Telefonu (İletişim)</label>
                    <input type="text" name="receiverPhone" value={formData.receiverPhone} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Müşteri Sorgu Telefonu (Sistem)</label>
                    <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full rounded border px-3 py-2" placeholder="5551234567" />
                </div>
                 <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Adres</label>
                    <textarea name="receiverAddress" value={formData.receiverAddress} onChange={handleChange} className="w-full rounded border px-3 py-2" rows={2} />
                </div>
            </div>
          </div>

          {/* Lojistik Bilgileri */}
           <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-blue-600">Lojistik Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Hafta (Örn: 2024-W12)</label>
                    <input type="text" name="shippingWeek" value={formData.shippingWeek} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Tır Plaka / Sefer No</label>
                    <input type="text" name="truckNumber" value={formData.truckNumber} onChange={handleChange} className="w-full rounded border px-3 py-2" />
                </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
          >
            Değişiklikleri Kaydet
          </button>
        </form>
      </div>
    </div>
  )
}
