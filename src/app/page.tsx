'use client'

import { useState } from 'react'

export default function Home() {
  // Sadece müşteri girişi olacağı için tek state yeterli
  const [customerCodeSuffix, setCustomerCodeSuffix] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  
  const [shipments, setShipments] = useState<any[]>([])
  const [shipment, setShipment] = useState<any>(null)
  const [error, setError] = useState('')

  const handleCustomerSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShipment(null)
    setShipments([])

    if (!customerCodeSuffix || !phoneNumber) {
        setError('Lütfen müşteri kodu ve telefon numaranızı giriniz.')
        return
    }

    // Telefon numarasını temizle (boşlukları ve karakterleri kaldır)
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '')
    const fullCustomerCode = `MFT-${customerCodeSuffix}`

    try {
      const params = new URLSearchParams({
        customerCode: fullCustomerCode,
        phoneNumber: cleanPhoneNumber
      })
      const res = await fetch(`/api/shipments?${params.toString()}&t=${Date.now()}`, { cache: 'no-store' })
      
      if (res.ok) {
        const result = await res.json()
        if (result.type === 'list') {
            if (result.data.length === 0) {
                setError('Kayıtlı kargonuz bulunmamaktadır.')
            } else {
                setShipments(result.data)
            }
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Bir hata oluştu.' }))
        setError(data.error || 'Müşteri bilgileri doğrulanamadı.')
      }
    } catch (err) {
      console.error(err)
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.')
    }
  }

  // Durum metinlerini daha okunaklı hale getirmek için yardımcı fonksiyon
  const getStatusLabel = (status: string) => {
      const statusMap: {[key: string]: string} = {
          'MERKEZ_DEPO': 'İstanbul Merkez Depo',
          'ACIK': 'Hazırlanıyor',
          'TURKIYE_GUMRUK': 'Türkiye Gümrük Kapısı',
          'BULGARISTAN': 'Bulgaristan',
          'ROMANYA': 'Romanya',
          'HIRVATISTAN': 'Hırvatistan',
          'SLOVENYA': 'Slovenya',
          'AVUSTURYA': 'Avusturya',
          'ALMANYA_GUMRUK': 'Almanya Gümrük Kapısı',
          'ALMANYA_MERKEZ_DEPO': 'Almanya Merkez Depo',
          'DAGITIMDA': 'Dağıtımda',
          'TESLIM_EDILDI': 'Teslim Edildi',
          'KAPALI': 'Teslim Edildi/Kapandı',
          'YOLDA': 'Yolda',
          'TAMAMLANDI': 'Tamamlandı'
      }
      return statusMap[status] || status
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <main className="flex w-full max-w-2xl flex-col items-center justify-center text-center">
        <h1 className="mb-8 text-blue-900 font-extrabold">
            <span className="block text-5xl mb-2">MFT EUROPA</span>
            <span className="block text-3xl">Kargo Takip Sistemi</span>
        </h1>
        
        <div className="w-full rounded-xl bg-white p-8 shadow-xl">
            
            <h2 className="mb-6 text-2xl font-bold text-gray-700">Müşteri Girişi</h2>

            {/* Customer Search Form */}
            <form onSubmit={handleCustomerSearch} className="flex flex-col gap-4">
                <div className="relative flex items-center">
                    <span className="absolute left-4 text-gray-500 font-bold">MFT-</span>
                    <input
                        type="number"
                        placeholder="4000"
                        className="w-full rounded-lg border border-gray-300 pl-16 pr-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        value={customerCodeSuffix}
                        onChange={(e) => setCustomerCodeSuffix(e.target.value)}
                    />
                </div>
                <input
                    type="tel"
                    placeholder="Telefon Numarası (Örn: 5551234567)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 px-8 py-3 text-lg font-bold text-white transition hover:bg-blue-700"
                >
                    Kargolarımı Listele
                </button>
            </form>

          {error && (
            <div className="mt-6 rounded-lg bg-red-100 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Single Shipment View */}
          {shipment && (
            <div className="mt-8 text-left">
              <button 
                onClick={() => { setShipment(null); }}
                className="mb-4 text-sm font-semibold text-blue-500 hover:text-blue-700"
              >
                  &larr; Listeye Dön
              </button>

              <div className="mb-4 rounded-lg bg-blue-50 p-6">
                <h2 className="mb-2 text-xl font-bold text-blue-900">Kargo Durumu: {getStatusLabel(shipment.currentStatus)}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold">Firma:</span> {shipment.supplierName || shipment.senderName}
                  </div>
                  <div>
                    <span className="font-semibold">Alıcı:</span> {shipment.receiverName}
                  </div>
                  <div>
                     <span className="font-semibold">Takip No:</span> {shipment.trackingNumber}
                  </div>
                  <div>
                     <span className="font-semibold">Hafta:</span> {shipment.manifest?.name || shipment.shippingWeek}
                  </div>
                  <div>
                     <span className="font-semibold">Tır No:</span> {shipment.truckNumber}
                  </div>
                  <div>
                     <span className="font-semibold">Adet:</span> {shipment.quantity} Koli
                  </div>
                </div>
              </div>

              <h3 className="mb-4 text-lg font-bold text-gray-800">Hareket Geçmişi</h3>
              <div className="relative border-l-2 border-blue-200 pl-6 ml-4">
                {shipment.events?.map((event: any) => (
                  <div key={event.id} className="mb-8 last:mb-0">
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-blue-500 ring-4 ring-white"></span>
                    <p className="mb-1 text-sm font-semibold text-gray-500">
                      {new Date(event.timestamp).toLocaleString('tr-TR')}
                    </p>
                    <h4 className="text-lg font-bold text-gray-800">
                        {/* Ülke isimleri için özel gösterim veya status kullanımı */}
                        {event.status === 'TRANSIT' ? event.description : getStatusLabel(event.status)}
                    </h4>
                    {/* Açıklama ülke ismi değilse göster */}
                    {event.status !== 'TRANSIT' && event.description && !event.description.includes('Manifesto konumu güncellendi') && !event.description.includes('Durum güncellendi') && !event.description.includes('Manifestoya eklendi') && event.description !== getStatusLabel(event.status) && (
                        <p className="text-gray-600">{event.description}</p>
                    )}
                    {event.location && event.location !== 'Sistem Otomatik Güncelleme' && event.location !== 'Sistem' && (
                        <p className="text-sm text-gray-500 italic">{event.location}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipment List View (Customer) */}
          {shipments.length > 0 && !shipment && (
              <div className="mt-8 text-left">
                  <h2 className="mb-4 text-2xl font-bold text-gray-800">Kargolarım ({shipments.length})</h2>
                  <div className="flex flex-col gap-6">
                      {shipments.map((item) => (
                          <div key={item.id} className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition bg-gray-50">
                              <div className="flex justify-between items-start mb-3">
                                  <div>
                                      <h3 className="font-bold text-lg text-blue-900">{item.supplierName || item.senderName}</h3>
                                      <span className="text-sm text-gray-500">Hafta: {item.manifest?.name || item.shippingWeek} | Tır: {item.truckNumber} | <strong>{item.quantity} Koli</strong></span>
                                  </div>
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                      {getStatusLabel(item.currentStatus)}
                                  </span>
                              </div>
                              
                              <div className="flex justify-between items-center mt-4">
                                  <span className="text-xs text-gray-400">Takip: {item.trackingNumber}</span>
                                  <button 
                                    onClick={() => setShipment(item)}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
                                  >
                                      Detayları Gör
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

        </div>
      </main>
      
      <footer className="mt-12 text-gray-500">
        &copy; 2025 MFT EUROPA
      </footer>
    </div>
  )
}
