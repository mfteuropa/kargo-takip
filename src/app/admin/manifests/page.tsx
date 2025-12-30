'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

export default function ManifestsPage() {
    const router = useRouter()
    const [manifests, setManifests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/manifests')
            .then(res => res.json())
            .then(data => {
                setManifests(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="p-6">Yükleniyor...</div>

    return (
        <div className="p-4 md:p-6 min-h-screen bg-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 text-center md:text-left">Haftalık Defterler (Manifestolar)</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => {
                            const data = manifests.map(m => ({
                                'Defter Adı': m.name,
                                'Durum': m.status,
                                'Konum': m.currentStage,
                                'Plaka': m.truckPlate || '',
                                'Başlangıç Tarihi': m.startDate ? new Date(m.startDate).toLocaleDateString('tr-TR') : '',
                                'Bitiş Tarihi': m.endDate ? new Date(m.endDate).toLocaleDateString('tr-TR') : '',
                                'Kargo Sayısı': m.shipments?.length || 0,
                                'Notlar': m.notes || ''
                            }))
                            const ws = XLSX.utils.json_to_sheet(data)
                            const wb = XLSX.utils.book_new()
                            XLSX.utils.book_append_sheet(wb, ws, "Manifestolar")
                            XLSX.writeFile(wb, "haftalik_manifestolar.xlsx")
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full md:w-auto"
                    >
                        Excel İndir
                    </button>
                    <button 
                        onClick={() => router.push('/admin/manifests/new')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full md:w-auto"
                    >
                        + Yeni Defter Aç
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {manifests.map((m) => (
                    <div key={m.id} className="bg-white p-4 rounded shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="w-full">
                            <h2 className="text-lg font-bold">{m.name}</h2>
                            <p className="text-gray-600">
                                Durum: <span className={`font-bold ${m.status === 'ACIK' ? 'text-green-600' : 'text-red-600'}`}>{m.status}</span>
                                {m.currentStage && <span className="ml-2 font-semibold text-blue-600"> - {m.currentStage}</span>}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-1">
                                <p className="text-sm text-gray-500">
                                    {m.truckPlate ? `Plaka: ${m.truckPlate}` : 'Plaka atanmamış'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Kargo Sayısı: {m.shipments?.length || 0}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => router.push(`/admin/manifests/${m.id}`)}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 w-full md:w-auto text-center"
                        >
                            Yönet
                        </button>
                    </div>
                ))}
                {manifests.length === 0 && (
                    <p className="text-gray-500 text-center">Henüz manifest oluşturulmamış.</p>
                )}
            </div>
        </div>
    )
}
