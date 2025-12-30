'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ShipmentsPage() {
  const router = useRouter()
  const [shipments, setShipments] = useState<any[]>([])
  const [manifests, setManifests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShipments, setSelectedShipments] = useState<string[]>([])
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false)
  const [selectedManifestId, setSelectedManifestId] = useState('')
  const [addingToManifest, setAddingToManifest] = useState(false)

  const [selectedManifestFilter, setSelectedManifestFilter] = useState('')
  const [syncingManifest, setSyncingManifest] = useState(false)

  const [viewMode, setViewMode] = useState<'unassigned' | 'all' | 'manifest'>('unassigned')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchShipments()
    fetchManifests()
  }, [])

  const fetchShipments = async () => {
    try {
      const res = await fetch('/api/shipments')
      if (res.ok) {
        const result = await res.json()
        if (result.type === 'list') {
            setShipments(result.data)
        }
      }
    } catch (error) {
      console.error('Kargolar yüklenirken hata oluştu:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchManifests = async () => {
    try {
        const res = await fetch('/api/manifests')
        if (res.ok) {
            const data = await res.json()
            // Sadece AÇIK olan manifestoları filtrele
            setManifests(data.filter((m: any) => m.status === 'ACIK'))
        }
    } catch (error) {
        console.error('Manifestolar yüklenemedi:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kargoyu silmek istediğinize emin misiniz?')) return

    try {
      const res = await fetch(`/api/shipments?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setShipments(shipments.filter((s) => s.id !== id))
        setSelectedShipments(selectedShipments.filter(sid => sid !== id))
      } else {
        alert('Silme işlemi başarısız.')
      }
    } catch (error) {
      alert('Bir hata oluştu.')
    }
  }

  const filteredShipments = shipments.filter(s => {
      // 0. Global Filter: Hide shipments in CLOSED manifests (unless viewing that specific manifest)
      if (viewMode !== 'manifest' && s.manifest?.status === 'KAPALI') {
          return false
      }

      // 1. View Mode Filter
      if (viewMode === 'unassigned') {
          if (s.manifestId || s.manifest) return false
      } else if (viewMode === 'manifest') {
          // Show: (In this manifest) OR (Unassigned)
          const isInManifest = s.manifestId === selectedManifestFilter || s.manifest?.id === selectedManifestFilter
          const isUnassigned = !s.manifestId && !s.manifest
          
          if (!isInManifest && !isUnassigned) return false
      } else if (viewMode === 'all') {
          // "Tüm Kargolar": Atanmamışlar + AÇIK defterdekiler
          // Kullanıcı isteği: Kaydettiklerim burada görünsün (Atanmamışlar dahil)
          // Kullanıcı isteği: Kargo kapandığında ekran temizlensin (KAPALI'lar hariç)
          if (s.manifest?.status === 'KAPALI') return false
      }

      // 2. Search Filter
      if (searchTerm) {
          const searchLower = searchTerm.toLocaleLowerCase('tr-TR')
          const customerCode = (s.customer?.customerCode || s.customerCode || '').toLocaleLowerCase('tr-TR')
          const sender = (s.senderName || s.supplierName || '').toLocaleLowerCase('tr-TR')
          const receiver = (s.receiverName || '').toLocaleLowerCase('tr-TR')
          const customerName = (s.customer?.name || '').toLocaleLowerCase('tr-TR')

          return customerCode.includes(searchLower) || 
                 sender.includes(searchLower) || 
                 receiver.includes(searchLower) ||
                 customerName.includes(searchLower)
      }

      return true
  })

  // Calculate totals
  const totalQuantity = filteredShipments.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const totalVolume = filteredShipments.reduce((sum, s) => sum + (s.volume || 0), 0)

  // Calculate visible count for "Tüm Kargolar" (Everything except CLOSED manifests)
  const allVisibleCount = shipments.filter(s => {
      // Exclude if in a CLOSED manifest
      if (s.manifest?.status === 'KAPALI') return false
      return true
  }).length

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedShipments(filteredShipments.map(s => s.id))
    } else {
        setSelectedShipments([])
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedShipments.includes(id)) {
        setSelectedShipments(selectedShipments.filter(sid => sid !== id))
    } else {
        setSelectedShipments([...selectedShipments, id])
    }
  }

  const handleAddToManifest = async () => {
    if (!selectedManifestId) {
        alert('Lütfen bir defter/tır seçiniz.')
        return
    }

    setAddingToManifest(true)
    try {
        const res = await fetch(`/api/manifests/${selectedManifestId}/shipments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ shipmentIds: selectedShipments })
        })

        if (res.ok) {
            alert('Kargolar başarıyla eklendi.')
            setIsManifestModalOpen(false)
            setSelectedShipments([])
            setSelectedManifestId('')
            fetchShipments() // Listeyi güncelle
        } else {
            const error = await res.json()
            alert('Ekleme başarısız: ' + (error.error || 'Bilinmeyen hata'))
        }
    } catch (error) {
        console.error('Ekleme hatası:', error)
        alert('Bir hata oluştu.')
    } finally {
        setAddingToManifest(false)
    }
  }

  const handleSyncManifest = async () => {
    if (!selectedManifestFilter) return
    if (!confirm('Seçili kargolar deftere atanacak, seçilmeyenler (eğer bu defterdeyse) defterden çıkarılacak. Onaylıyor musunuz?')) return

    setSyncingManifest(true)
    try {
        // 1. Current shipments in this manifest
        const currentInManifest = shipments
            .filter(s => s.manifestId === selectedManifestFilter || s.manifest?.id === selectedManifestFilter)
            .map(s => s.id)

        // 2. Desired state (selectedShipments)
        // Note: selectedShipments contains IDs of checked items.

        // 3. Calculate Add/Remove
        // To Add: In selectedShipments BUT NOT in currentInManifest
        const toAdd = selectedShipments.filter(id => !currentInManifest.includes(id))
        
        // To Remove: In currentInManifest BUT NOT in selectedShipments
        const toRemove = currentInManifest.filter(id => !selectedShipments.includes(id))

        const promises = []
        if (toAdd.length > 0) {
            promises.push(fetch(`/api/manifests/${selectedManifestFilter}/shipments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentIds: toAdd })
            }))
        }
        if (toRemove.length > 0) {
            promises.push(fetch(`/api/manifests/${selectedManifestFilter}/shipments`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentIds: toRemove })
            }))
        }

        await Promise.all(promises)
        alert('Defter güncellendi.')
        fetchShipments() // Refresh data
        
    } catch (error) {
        console.error(error)
        alert('Hata oluştu.')
    } finally {
        setSyncingManifest(false)
    }
  }

  const handleManifestFilterChange = (manifestId: string) => {
      setSelectedManifestFilter(manifestId)
      if (manifestId) {
          setViewMode('manifest')
          // Pre-select shipments already in this manifest
          const inManifest = shipments
            .filter(s => s.manifestId === manifestId || s.manifest?.id === manifestId)
            .map(s => s.id)
          setSelectedShipments(inManifest)
      } else {
          setViewMode('unassigned') // Default back to unassigned if cleared
          setSelectedShipments([])
      }
  }

  const getStatusLabel = (status: string) => {
      const statusMap: {[key: string]: string} = {
          'ALINDI': 'Alındı',
          'MERKEZ_DEPO': 'İstanbul Merkez Depo',
          'GUMRUK_TR': 'Türkiye Gümrük',
          'TRANSIT': 'Transfer Sürecinde',
          'GUMRUK_DE': 'Almanya Gümrük',
          'DEPO_DE': 'Almanya Merkez Depo',
          'DAGITIMDA': 'Dağıtımda',
          'TESLIM_EDILDI': 'Teslim Edildi'
      }
      return statusMap[status] || status
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="container mx-auto">
        <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Kargo Listesi</h1>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
            {viewMode === 'manifest' && selectedManifestFilter && (
                <button
                    onClick={handleSyncManifest}
                    disabled={syncingManifest}
                    className="rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 transition disabled:opacity-50 w-full md:w-auto"
                >
                    {syncingManifest ? 'Kaydediliyor...' : 'Defteri Güncelle'}
                </button>
            )}
            
            {viewMode !== 'manifest' && selectedShipments.length > 0 && (
                <button
                    onClick={() => setIsManifestModalOpen(true)}
                    className="rounded bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700 transition w-full md:w-auto"
                >
                    Seçilenleri Tıra Ekle ({selectedShipments.length})
                </button>
            )}
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700 w-full md:w-auto"
            >
              Panle Dön
            </button>
            <button
              onClick={() => router.push('/admin/shipments/new')}
              className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 w-full md:w-auto"
            >
              Yeni Kargo Ekle
            </button>
          </div>
        </div>

        {/* View Mode Toggles & Search */}
        <div className="mb-4 space-y-4">
            {/* Search Input */}
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Ara: Müşteri Kodu, İsim, Gönderen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full flex-1 rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                />
                <select
                    value={selectedManifestFilter}
                    onChange={(e) => handleManifestFilterChange(e.target.value)}
                    className="w-full md:w-64 rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                    <option value="">Defter Seçin...</option>
                    {manifests.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-gray-300 pb-2">
                <button
                    onClick={() => {
                        setViewMode('unassigned')
                        setSelectedManifestFilter('')
                        setSelectedShipments([])
                    }}
                    className={`px-4 py-2 font-semibold rounded-lg md:rounded-b-none md:rounded-t-lg transition-colors text-sm md:text-base flex-1 md:flex-none ${
                        viewMode === 'unassigned' 
                        ? 'bg-white text-blue-600 border border-gray-300 md:border-b-0' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                >
                    Atanmamış ({shipments.filter(s => !s.manifestId && !s.manifest).length})
                </button>
                <button
                    onClick={() => {
                        setViewMode('all')
                        setSelectedManifestFilter('')
                        setSelectedShipments([])
                    }}
                    className={`px-4 py-2 font-semibold rounded-lg md:rounded-b-none md:rounded-t-lg transition-colors text-sm md:text-base flex-1 md:flex-none ${
                        viewMode === 'all' 
                        ? 'bg-white text-blue-600 border border-gray-300 md:border-b-0' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                >
                    Tüm Kargolar ({allVisibleCount})
                </button>
                {selectedManifestFilter && (
                    <button
                        onClick={() => setViewMode('manifest')}
                        className={`px-4 py-2 font-semibold rounded-lg md:rounded-b-none md:rounded-t-lg transition-colors text-sm md:text-base flex-1 md:flex-none ${
                            viewMode === 'manifest' 
                            ? 'bg-white text-blue-600 border border-gray-300 md:border-b-0' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                        Seçili Defter ({manifests.find(m => m.id === selectedManifestFilter)?.name})
                    </button>
                )}
            </div>
        </div>

        {loading ? (
          <div className="text-center">Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-md">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={filteredShipments.length > 0 && selectedShipments.length === filteredShipments.length}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Müşteri Kodu
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Gönderen
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    İsim Soyisim
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Adres
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Telefon
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Ebat / Kilo
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Adet
                  </th>
                  <th className="border-b-2 border-gray-200 bg-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className={selectedShipments.includes(shipment.id) ? 'bg-blue-50' : ''}>
                    <td className="border-b border-gray-200 px-5 py-5">
                        <input 
                            type="checkbox"
                            checked={selectedShipments.includes(shipment.id)}
                            onChange={() => handleSelectOne(shipment.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <p className="whitespace-no-wrap text-gray-900 font-bold">
                        {shipment.customer?.customerCode || shipment.customerCode || '-'}
                      </p>
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <p className="whitespace-no-wrap text-gray-900">{shipment.senderName || shipment.supplierName || '-'}</p>
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <p className="whitespace-no-wrap text-gray-900">{shipment.receiverName}</p>
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <p className="text-gray-900 truncate max-w-xs" title={shipment.receiverAddress}>{shipment.receiverAddress || '-'}</p>
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <p className="whitespace-no-wrap text-gray-900">{shipment.receiverPhone || '-'}</p>
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-900">{shipment.dimensions || '-'}</span>
                        <span className="text-xs text-gray-500">{shipment.weight ? `${shipment.weight} kg` : ''}</span>
                      </div>
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <p className="whitespace-no-wrap text-gray-900 font-bold">{shipment.quantity || 1}</p>
                    </td>
                    <td className="border-b border-gray-200 px-5 py-5 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/admin/shipments/${shipment.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                            Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(shipment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                    <td colSpan={7} className="px-5 py-3 text-right font-bold text-gray-900 border-t border-gray-200">
                        Toplamlar:
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900 border-t border-gray-200">
                        {totalQuantity} Adet
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900 border-t border-gray-200">
                        {totalVolume.toFixed(2)} m³
                    </td>
                </tr>
              </tfoot>
            </table>
            {shipments.length === 0 && (
                <div className="p-4 text-center text-gray-500">Kayıtlı kargo bulunamadı.</div>
            )}
          </div>
        )}

        {/* Manifest Selection Modal */}
        {isManifestModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                    <h2 className="mb-4 text-xl font-bold text-gray-800">Kargoları Tıra Ekle</h2>
                    <p className="mb-4 text-gray-600">Seçilen {selectedShipments.length} kargoyu eklemek için bir defter/tır seçin.</p>
                    
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-bold text-gray-700">Defter / Tır Seçin</label>
                        <select
                            value={selectedManifestId}
                            onChange={(e) => setSelectedManifestId(e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        >
                            <option value="">Seçiniz...</option>
                            {manifests.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name} {m.truckPlate ? `(${m.truckPlate})` : ''}
                                </option>
                            ))}
                        </select>
                        {manifests.length === 0 && (
                            <p className="mt-1 text-sm text-red-500">Aktif (AÇIK) defter bulunamadı.</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsManifestModalOpen(false)}
                            className="rounded bg-gray-300 px-4 py-2 font-bold text-gray-700 hover:bg-gray-400"
                            disabled={addingToManifest}
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleAddToManifest}
                            disabled={!selectedManifestId || addingToManifest}
                            className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {addingToManifest ? 'Ekleniyor...' : 'Ekle'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
