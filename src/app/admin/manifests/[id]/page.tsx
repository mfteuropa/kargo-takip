'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toUpperCaseTR } from '@/lib/utils'
import * as XLSX from 'xlsx'

// Types
interface Customer {
    id: string
    customerCode: string
    name: string
}

interface Shipment {
    id: string
    trackingNumber: string
    receiverName: string
    quantity: number
    weight: number
    volume: number
    currentStatus: string
    createdAt: string | Date
    customerId: string
    customer?: Customer
}

interface Manifest {
    id: string
    name: string
    status: string
    currentStage: string | null
    truckPlate: string | null
    notes: string | null
    startDate: string | Date | null
    endDate: string | Date | null
    createdAt: string | Date
    shipments: Shipment[]
}

export default function ManifestDetailPage() {
    const router = useRouter()
    const params = useParams()
    const id = params?.id as string
    
    const [manifest, setManifest] = useState<Manifest | null>(null)
    const [unassignedShipments, setUnassignedShipments] = useState<Shipment[]>([])
    const [loading, setLoading] = useState(true)
    
    // Form States
    const [status, setStatus] = useState('')
    const [currentStage, setCurrentStage] = useState('')
    const [truckPlate, setTruckPlate] = useState('')
    const [notes, setNotes] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    
    // Selection States
    const [selectedUnassigned, setSelectedUnassigned] = useState<string[]>([])
    const [selectedInManifest, setSelectedInManifest] = useState<string[]>([])
    
    // Manage Modal State
    const [showManageModal, setShowManageModal] = useState(false)
    const [manageSelectedIds, setManageSelectedIds] = useState<string[]>([])
    const [isSavingManage, setIsSavingManage] = useState(false)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [manifestRes, unassignedRes] = await Promise.all([
                fetch(`/api/manifests/${id}?t=${Date.now()}`, { cache: 'no-store' }),
                fetch(`/api/shipments?unassigned=true&t=${Date.now()}`, { cache: 'no-store' })
            ])
            
            if (manifestRes.ok) {
                const mData = await manifestRes.json()
                setManifest(mData)
                setStatus(mData.status)
                setCurrentStage(mData.currentStage || '')
                setTruckPlate(mData.truckPlate || '')
                setNotes(mData.notes || '')
                setStartDate(mData.startDate ? new Date(mData.startDate).toISOString().split('T')[0] : '')
                setEndDate(mData.endDate ? new Date(mData.endDate).toISOString().split('T')[0] : '')
            }
            
            if (unassignedRes.ok) {
                const uData = await unassignedRes.json()
                setUnassignedShipments(uData.data || [])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateManifest = async () => {
        try {
            const res = await fetch(`/api/manifests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status, 
                    currentStage,
                    truckPlate, 
                    notes,
                    startDate,
                    endDate
                })
            })
            if (res.ok) {
                alert('Manifest güncellendi.')
                fetchData() // Refresh
            }
        } catch (error) {
            alert('Hata oluştu.')
        }
    }

    const handleDeleteManifest = async () => {
        if (!confirm('BU DEFTERİ SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? Bu işlem geri alınamaz.')) return
        
        try {
            const res = await fetch(`/api/manifests/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                alert('Defter silindi.')
                router.push('/admin/manifests')
            } else {
                alert('Silme işlemi başarısız oldu.')
            }
        } catch (error) {
            alert('Hata oluştu.')
        }
    }

    const openManageModal = () => {
        if (!manifest) return
        // Initialize with currently assigned shipments
        const currentIds = manifest.shipments.map((s) => s.id)
        setManageSelectedIds(currentIds)
        setShowManageModal(true)
    }

    const handleSaveManage = async () => {
        if (!manifest) return
        setIsSavingManage(true)
        try {
            const currentIds = manifest.shipments.map((s) => s.id)
            
            // To Add: In selection BUT NOT in current
            const toAdd = manageSelectedIds.filter((id) => !currentIds.includes(id))
            
            // To Remove: In current BUT NOT in selection
            const toRemove = currentIds.filter((id) => !manageSelectedIds.includes(id))

            const promises = []
            if (toAdd.length > 0) {
                promises.push(fetch(`/api/manifests/${id}/shipments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shipmentIds: toAdd })
                }))
            }
            if (toRemove.length > 0) {
                promises.push(fetch(`/api/manifests/${id}/shipments`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shipmentIds: toRemove })
                }))
            }

            await Promise.all(promises)
            alert('Defter güncellendi.')
            setShowManageModal(false)
            fetchData()
        } catch (error) {
            console.error(error)
            alert('Hata oluştu.')
        } finally {
            setIsSavingManage(false)
        }
    }

    const handleRemoveShipments = async () => {
        if (selectedInManifest.length === 0) return
        if (!confirm('Seçili kargoları bu defterden çıkarmak istediğinize emin misiniz?')) return

        try {
            const res = await fetch(`/api/manifests/${id}/shipments`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentIds: selectedInManifest })
            })
            if (res.ok) {
                setSelectedInManifest([])
                fetchData()
            }
        } catch (error) {
            alert('Hata oluştu.')
        }
    }

    // Toggle selection
    const toggleManageSelection = (id: string) => {
        setManageSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const toggleInManifest = (id: string) => {
        setSelectedInManifest(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }
    
    const selectAllUnassigned = () => {
        if (!manifest) return
        // Logic for select all inside manage modal
        const allCandidateIds = [...manifest.shipments, ...unassignedShipments].map((s) => s.id)
        if (manageSelectedIds.length === allCandidateIds.length) setManageSelectedIds([])
        else setManageSelectedIds(allCandidateIds)
    }

    const selectAllInManifest = () => {
        if (!manifest) return
        if (selectedInManifest.length === manifest.shipments.length) setSelectedInManifest([])
        else setSelectedInManifest(manifest.shipments.map((s) => s.id))
    }

    if (loading) return <div className="p-6">Yükleniyor...</div>
    if (!manifest) return <div className="p-6">Manifest bulunamadı.</div>

    return (
        <div className="p-6 min-h-screen bg-gray-100">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header & Controls */}
                <div className="flex justify-between items-center bg-white p-6 rounded shadow">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">{manifest.name}</h1>
                        <p className="text-gray-500 text-sm">Oluşturulma: {new Date(manifest.createdAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                const data = manifest.shipments.map((s: any) => ({
                                    'Takip No': s.trackingNumber,
                                    'Müşteri Kodu': s.customer?.customerCode || '',
                                    'Alıcı': s.receiverName,
                                    'Koli': s.quantity,
                                    'Kilo (kg)': s.weight,
                                    'Hacim (m3)': s.volume,
                                    'Durum': s.currentStatus,
                                    'Oluşturulma': new Date(s.createdAt).toLocaleDateString('tr-TR')
                                }))
                                const ws = XLSX.utils.json_to_sheet(data)
                                const wb = XLSX.utils.book_new()
                                XLSX.utils.book_append_sheet(wb, ws, "Kargo Listesi")
                                XLSX.writeFile(wb, `${manifest.name}_Detay.xlsx`)
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Excel'e Aktar
                        </button>
                        <button onClick={handleDeleteManifest} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Defteri Sil</button>
                        <button onClick={() => router.push('/admin/manifests')} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Geri Dön</button>
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-lg font-bold mb-4">Defter Ayarları</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Defter Durumu</label>
                            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border rounded px-3 py-2">
                                <option value="ACIK">AÇIK</option>
                                <option value="KAPALI">KAPALI</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Konum / Aşama</label>
                            <select value={currentStage} onChange={e => setCurrentStage(e.target.value)} className="w-full border rounded px-3 py-2">
                                <option value="">Seçiniz...</option>
                                <option value="TURKIYE_GUMRUK">TÜRKİYE GÜMRÜK KAPISI</option>
                                <option value="BULGARISTAN">BULGARİSTAN</option>
                                <option value="ROMANYA">ROMANYA</option>
                                <option value="HIRVATISTAN">HIRVATİSTAN</option>
                                <option value="SLOVENYA">SLOVENYA</option>
                                <option value="AVUSTURYA">AVUSTURYA</option>
                                <option value="ALMANYA_GUMRUK">ALMANYA GÜMRÜK KAPISI</option>
                                <option value="ALMANYA_MERKEZ_DEPO">ALMANYA MERKEZ DEPO</option>
                            <option value="DAGITIMDA">DAĞITIMDA</option>
                            <option value="TESLIM_EDILDI">TESLİM EDİLDİ</option>
                        </select>
                    </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Tır Plakası</label>
                            <input value={truckPlate} onChange={e => setTruckPlate(toUpperCaseTR(e.target.value))} className="w-full border rounded px-3 py-2" placeholder="34 AB 123" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Notlar</label>
                            <input value={notes} onChange={e => setNotes(toUpperCaseTR(e.target.value))} className="w-full border rounded px-3 py-2" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Başlangıç Tarihi</label>
                            <input 
                                type="date"
                                className="w-full border rounded px-3 py-2" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Bitiş Tarihi</label>
                            <input 
                                type="date"
                                className="w-full border rounded px-3 py-2" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="mt-4 text-right">
                        <button onClick={handleUpdateManifest} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">Kaydet</button>
                    </div>
                </div>

                {/* Shipments List */}
                <div className="bg-white p-6 rounded shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Bu Defterdeki Kargolar ({manifest.shipments.length})</h2>
                        <div className="flex gap-2">
                            {selectedInManifest.length > 0 && (
                                <button onClick={handleRemoveShipments} className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600">
                                    Seçilileri Çıkar ({selectedInManifest.length})
                                </button>
                            )}
                            <button onClick={openManageModal} className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700">
                                Kargoları Yönet
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="p-4"><input type="checkbox" onChange={selectAllInManifest} checked={manifest.shipments.length > 0 && selectedInManifest.length === manifest.shipments.length} /></th>
                                    <th className="p-4">Takip No</th>
                                    <th className="p-4">Alıcı</th>
                                    <th className="p-4">Koli</th>
                                    <th className="p-4">Kilo/Hacim</th>
                                    <th className="p-4">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {manifest.shipments.map((s) => (
                                    <tr key={s.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4"><input type="checkbox" checked={selectedInManifest.includes(s.id)} onChange={() => toggleInManifest(s.id)} /></td>
                                        <td className="p-4 font-medium">{s.trackingNumber}</td>
                                        <td className="p-4">{s.receiverName} <br/><span className="text-xs text-gray-500">{s.customer?.customerCode}</span></td>
                                        <td className="p-4">{s.quantity}</td>
                                        <td className="p-4">{s.weight} kg / {s.volume} m³</td>
                                        <td className="p-4">{s.currentStatus}</td>
                                    </tr>
                                ))}
                                {manifest.shipments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-gray-500">Bu defterde henüz kargo yok.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Manage Shipments Modal */}
            {showManageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold">Kargoları Yönet</h2>
                            <button onClick={() => setShowManageModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        
                        <div className="p-4 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800">
                            İşaretli kargolar bu defterde kalacak/eklenecek. İşareti kaldırılanlar defterden çıkarılıp <strong>Atanmamış Kargolar</strong>'a aktarılacak.
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {[...manifest.shipments, ...unassignedShipments].length === 0 ? (
                                <p className="text-center text-gray-500">Kargo bulunamadı.</p>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-700 uppercase bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="p-4">
                                                <input 
                                                    type="checkbox" 
                                                    onChange={selectAllUnassigned} 
                                                    checked={manageSelectedIds.length > 0 && manageSelectedIds.length === [...manifest.shipments, ...unassignedShipments].length} 
                                                />
                                            </th>
                                            <th className="p-4">Tarih</th>
                                            <th className="p-4">Takip No</th>
                                            <th className="p-4">Alıcı</th>
                                            <th className="p-4">Koli</th>
                                            <th className="p-4">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* 1. Show Currently in Manifest (Top) */}
                                        {manifest.shipments.map((s) => (
                                            <tr key={s.id} className="border-b bg-blue-50 hover:bg-blue-100">
                                                <td className="p-4"><input type="checkbox" checked={manageSelectedIds.includes(s.id)} onChange={() => toggleManageSelection(s.id)} /></td>
                                                <td className="p-4">{new Date(s.createdAt).toLocaleDateString('tr-TR')}</td>
                                                <td className="p-4 font-medium">{s.trackingNumber} <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-1 rounded">Mevcut</span></td>
                                                <td className="p-4">{s.receiverName}</td>
                                                <td className="p-4">{s.quantity}</td>
                                                <td className="p-4">{s.currentStatus}</td>
                                            </tr>
                                        ))}
                                        
                                        {/* 2. Show Unassigned */}
                                        {unassignedShipments.map((s) => {
                                            const isSelected = manageSelectedIds.includes(s.id)
                                            return (
                                                <tr key={s.id} className={`border-b ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                                    <td className="p-4"><input type="checkbox" checked={isSelected} onChange={() => toggleManageSelection(s.id)} /></td>
                                                    <td className="p-4">{new Date(s.createdAt).toLocaleDateString('tr-TR')}</td>
                                                    <td className="p-4 font-medium">{s.trackingNumber}</td>
                                                    <td className="p-4">{s.receiverName}</td>
                                                    <td className="p-4">{s.quantity}</td>
                                                    <td className="p-4">{s.currentStatus}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setShowManageModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">İptal</button>
                            <button 
                                onClick={handleSaveManage} 
                                disabled={isSavingManage}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                            >
                                {isSavingManage ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
