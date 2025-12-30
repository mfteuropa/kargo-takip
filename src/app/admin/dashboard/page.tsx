'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeShipments: 0,
    deliveredShipments: 0,
    recentShipments: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
            const data = await res.json()
            setStats(data)
        }
    } catch (error) {
        console.error('İstatistikler yüklenemedi:', error)
    } finally {
        setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-4 shadow-md rounded-lg mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Yönetim Paneli</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* İstatistikler */}
        <div className="rounded-lg bg-white p-6 shadow-md border-l-4 border-blue-500">
          <h2 className="mb-2 text-xl font-semibold text-gray-700">Toplam Kargo</h2>
          <p className="text-3xl font-bold text-gray-800">{loading ? '...' : stats.totalShipments}</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md border-l-4 border-yellow-500">
          <h2 className="mb-2 text-xl font-semibold text-gray-700">Aktif Gönderiler</h2>
          <p className="text-3xl font-bold text-gray-800">{loading ? '...' : stats.activeShipments}</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md border-l-4 border-green-500">
          <h2 className="mb-2 text-xl font-semibold text-gray-700">Teslim Edilen</h2>
          <p className="text-3xl font-bold text-gray-800">{loading ? '...' : stats.deliveredShipments}</p>
        </div>

        {/* Hızlı İşlemler */}
        <div className="rounded-lg bg-white p-6 shadow-md col-span-1 md:col-span-2 lg:col-span-3">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Hızlı İşlemler</h2>
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            <button 
                onClick={() => router.push('/admin/shipments/new')}
                className="rounded bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 transition w-full md:w-auto"
            >
                + Yeni Kargo Ekle
            </button>
            <button 
                onClick={() => router.push('/admin/shipments')}
                className="rounded bg-gray-600 px-6 py-3 font-bold text-white hover:bg-gray-700 transition w-full md:w-auto"
            >
                Kargoları Listele / Düzenle
            </button>

            <button 
                onClick={() => router.push('/admin/manifests')}
                className="rounded bg-teal-600 px-6 py-3 font-bold text-white hover:bg-teal-700 transition w-full md:w-auto"
            >
                Defter Listesi
            </button>
            <button 
                onClick={() => router.push('/admin/customers')}
                className="rounded bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-700 transition w-full md:w-auto"
            >
                Müşteri Listesi
            </button>
            <button 
                onClick={() => router.push('/admin/depot')}
                className="rounded bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700 transition w-full md:w-auto"
            >
                Depo Boşaltım / Mal Kabul
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
