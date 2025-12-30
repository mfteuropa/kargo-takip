'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toUpperCaseTR } from '@/lib/utils'

export default function FinancePage() {
    const router = useRouter()
    const [transactions, setTransactions] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Form State
    const [formData, setFormData] = useState({
        type: 'INCOME',
        category: '',
        amount: '',
        currency: 'TRY',
        description: '',
        date: new Date().toISOString().split('T')[0]
    })

    // Filter State
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        try {
            let query = `?t=${Date.now()}`
            if (startDate) query += `&startDate=${startDate}`
            if (endDate) query += `&endDate=${endDate}`

            const [transRes, statsRes] = await Promise.all([
                fetch(`/api/finance/transactions${query}`),
                fetch(`/api/finance/stats${query}`)
            ])

            if (transRes.ok) {
                const data = await transRes.json()
                setTransactions(data)
            }
            if (statsRes.ok) {
                const data = await statsRes.json()
                setStats(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name } = e.target
        let { value } = e.target
        
        if (name === 'category' || name === 'description') {
            value = toUpperCaseTR(value)
        }

        setFormData({ ...formData, [name]: value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/finance/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setFormData({
                    type: 'INCOME',
                    category: '',
                    amount: '',
                    currency: 'TRY',
                    description: '',
                    date: new Date().toISOString().split('T')[0]
                })
                fetchData()
            } else {
                alert('Hata oluştu')
            }
        } catch (error) {
            console.error(error)
            alert('Hata oluştu')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return

        try {
            const res = await fetch(`/api/finance/transactions/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchData()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const formatMoney = (amount: number, currency: string) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(amount)
    }

    if (loading && !stats) return <div className="p-6">Yükleniyor...</div>

    return (
        <div className="p-6 min-h-screen bg-gray-100">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="bg-white p-6 rounded shadow">
                    <h1 className="text-2xl font-bold text-gray-800">Gelir / Gider Takibi</h1>
                </div>

                {/* Inline Form */}
                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-lg font-bold mb-4 text-gray-700">Yeni İşlem Ekle</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">İşlem Türü</label>
                                <select 
                                    name="type" 
                                    value={formData.type} 
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="INCOME">Gelir</option>
                                    <option value="EXPENSE">Gider</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tutar</label>
                                <input 
                                    type="number" 
                                    name="amount" 
                                    value={formData.amount} 
                                    onChange={handleInputChange}
                                    required
                                    step="0.01"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Para Birimi</label>
                                <select 
                                    name="currency" 
                                    value={formData.currency} 
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="TRY">TRY - Türk Lirası</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="USD">USD - Dolar</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                                <input 
                                    type="text" 
                                    name="category" 
                                    value={formData.category} 
                                    onChange={handleInputChange}
                                    placeholder="Örn: Nakliye, Kira, Fatura"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                <input 
                                    type="text" 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tarih</label>
                                <input 
                                    type="date" 
                                    name="date" 
                                    value={formData.date} 
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button 
                                type="submit" 
                                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                            >
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded shadow flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <button 
                        onClick={() => { setStartDate(''); setEndDate('') }}
                        className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Temizle
                    </button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['TRY', 'EUR', 'USD'].map((curr) => (
                            <div key={curr} className="bg-white p-6 rounded shadow">
                                <h3 className="text-lg font-bold mb-4">{curr} Bakiyesi</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-green-600">
                                        <span>Gelir:</span>
                                        <span className="font-bold">{formatMoney(stats[curr].income, curr)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>Gider:</span>
                                        <span className="font-bold">{formatMoney(stats[curr].expense, curr)}</span>
                                    </div>
                                    <div className="border-t pt-2 flex justify-between text-gray-800 font-bold text-lg">
                                        <span>Net:</span>
                                        <span>{formatMoney(stats[curr].balance, curr)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Transactions List */}
                <div className="bg-white rounded shadow overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(t.date).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            t.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {t.type === 'INCOME' ? 'GELİR' : 'GİDER'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.description}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                                        t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {formatMoney(t.amount, t.currency)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => handleDelete(t.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Sil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Kayıt bulunamadı.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    )
}
