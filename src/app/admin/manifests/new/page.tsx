'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toUpperCaseTR } from '@/lib/utils'

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

export default function NewManifestPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [truckPlate, setTruckPlate] = useState('')
    const [notes, setNotes] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    
    const [unassignedCount, setUnassignedCount] = useState(0)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Auto-generate name
        setName(getWeekNumber(new Date()))
        
        // Fetch unassigned shipments count
        fetch('/api/shipments?unassigned=true')
            .then(res => res.json())
            .then(data => {
                if (data.type === 'list' && Array.isArray(data.data)) {
                    setUnassignedCount(data.data.length)
                }
            })
            .catch(err => console.error(err))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/manifests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    truckPlate, 
                    notes,
                    startDate,
                    endDate
                })
            })
            
            if (res.ok) {
                router.push('/admin/manifests')
            } else {
                const data = await res.json()
                alert(`Hata: ${data.error || 'Bilinmeyen bir hata oluştu'}`)
            }
        } catch (error) {
            console.error('Error submitting form:', error)
            alert('Bir bağlantı hatası oluştu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 min-h-screen bg-gray-100">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold">Yeni Defter (Manifesto) Aç</h1>
                    <button 
                        onClick={() => router.back()} 
                        className="text-gray-500 hover:text-gray-700"
                    >
                        İptal
                    </button>
                </div>

                {unassignedCount > 0 && (
                    <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded flex items-center">
                        <span className="text-2xl mr-3">📦</span>
                        <div>
                            <p className="font-bold">Bekleyen Kargolar Var!</p>
                            <p className="text-sm">Şu an sistemde herhangi bir deftere atanmamış <strong>{unassignedCount}</strong> adet kargo bulunuyor. Defteri oluşturduktan sonra bu kargoları ekleyebilirsiniz.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold mb-1">Defter Adı (Hafta) *</label>
                            <input 
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="2024-W12" 
                                required 
                            />
                            <p className="text-xs text-gray-500 mt-1">Otomatik olarak içinde bulunduğumuz hafta önerilir.</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold mb-1">Başlangıç Tarihi</label>
                            <input 
                                type="date"
                                className="w-full border rounded px-3 py-2" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1">Bitiş Tarihi</label>
                            <input 
                                type="date"
                                className="w-full border rounded px-3 py-2" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold mb-1">Tır Plakası (Opsiyonel)</label>
                            <input 
                                className="w-full border rounded px-3 py-2" 
                                value={truckPlate} 
                                onChange={e => setTruckPlate(e.target.value)} 
                                placeholder="34 AB 123" 
                            />
                        </div>
                        
                        <div className="col-span-2">
                            <label className="block text-sm font-bold mb-1">Notlar</label>
                            <textarea 
                                className="w-full border rounded px-3 py-2" 
                                rows={3}
                                value={notes} 
                                onChange={e => setNotes(toUpperCaseTR(e.target.value))} 
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t mt-6">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Oluşturuluyor...' : 'Defteri Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
