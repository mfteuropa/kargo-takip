'use client'

import { useState, useEffect } from 'react'
import { toUpperCaseTR } from '@/lib/utils'

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    
    // Form State
    const [showForm, setShowForm] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)
    const [formData, setFormData] = useState({
        customerCode: '',
        name: '',
        phoneNumber: '',
        address: '',
        city: '',
        country: ''
    })

    useEffect(() => {
        fetchCustomers()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(search)
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    const fetchNextCode = async () => {
        try {
            const res = await fetch('/api/customers?next=true')
            if (res.ok) {
                const data = await res.json()
                setFormData(prev => ({ ...prev, customerCode: `MFT-${data.nextCode}` }))
            }
        } catch (error) {
            console.error('Kod alınamadı:', error)
        }
    }

    const fetchCustomers = async (query = '') => {
        setLoading(true)
        try {
            const url = query 
                ? `/api/customers?q=${encodeURIComponent(query)}`
                : '/api/customers'
            
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setCustomers(data)
            }
        } catch (error) {
            console.error('Error fetching customers:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        let newValue = value
        
        if (name === 'name' || name === 'address' || name === 'city' || name === 'country' || name === 'customerCode') {
            newValue = toUpperCaseTR(value)
        }

        setFormData({ ...formData, [name]: newValue })
    }

    const handleEdit = (customer: any) => {
        setEditingCustomer(customer)
        setFormData({
            customerCode: customer.customerCode,
            name: customer.name,
            phoneNumber: customer.phoneNumber || '',
            address: customer.address || '',
            city: customer.city || '',
            country: customer.country || ''
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return

        try {
            const res = await fetch(`/api/customers/${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                alert('Müşteri silindi.')
                fetchCustomers(search)
            } else {
                const data = await res.json()
                alert(data.error || 'Silme işlemi başarısız.')
            }
        } catch (error) {
            console.error(error)
            alert('Hata oluştu.')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers'
            const method = editingCustomer ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setShowForm(false)
                setEditingCustomer(null)
                setFormData({
                    customerCode: '',
                    name: '',
                    phoneNumber: '',
                    address: '',
                    city: '',
                    country: ''
                })
                fetchCustomers(search)
                alert(editingCustomer ? 'Müşteri güncellendi.' : 'Müşteri başarıyla eklendi.')
            } else {
                alert('İşlem sırasında hata oluştu.')
            }
        } catch (error) {
            console.error(error)
            alert('Hata oluştu.')
        }
    }

    return (
        <div className="p-6 min-h-screen bg-gray-100">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="bg-white p-6 rounded shadow flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Müşteri Listesi</h1>
                    <button 
                        onClick={() => {
                            setShowForm(!showForm)
                            if (showForm) {
                                setEditingCustomer(null)
                                setFormData({
                                    customerCode: '',
                                    name: '',
                                    phoneNumber: '',
                                    address: '',
                                    city: '',
                                    country: ''
                                })
                            }
                        }}
                        className={`px-4 py-2 rounded text-white ${showForm ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {showForm ? 'İptal' : '+ Yeni Müşteri Ekle'}
                    </button>
                </div>

                {/* Inline Form */}
                {showForm && (
                    <div className="bg-white p-6 rounded shadow">
                        <h2 className="text-lg font-bold mb-4 text-gray-700">
                            {editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700">Müşteri Kodu</label>
                                        <input 
                                            type="text" 
                                            name="customerCode" 
                                            value={formData.customerCode} 
                                            onChange={handleInputChange}
                                            placeholder="Örn: MFT-4001"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-bold"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={fetchNextCode}
                                        className="mb-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                                    >
                                        Otomatik Kod
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Müşteri Adı / Firma</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Telefon</label>
                                    <input 
                                        type="text" 
                                        name="phoneNumber" 
                                        value={formData.phoneNumber} 
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Şehir</label>
                                    <input 
                                        type="text" 
                                        name="city" 
                                        value={formData.city} 
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ülke</label>
                                    <input 
                                        type="text" 
                                        name="country" 
                                        value={formData.country} 
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Adres</label>
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleInputChange}
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
                )}

                {/* Search */}
                <div className="bg-white p-4 rounded shadow">
                    <input 
                        type="text" 
                        placeholder="Müşteri ara (Ad, Kod)..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                </div>

                {/* List */}
                <div className="bg-white rounded shadow overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şehir / Ülke</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center">Yükleniyor...</td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Kayıt bulunamadı.</td>
                                </tr>
                            ) : (
                                customers.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                            {c.customerCode}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                            {c.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {c.phoneNumber || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {c.city} {c.city && c.country ? '/' : ''} {c.country}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                                            {c.address || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleEdit(c)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Düzenle
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(c.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
