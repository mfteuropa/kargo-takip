'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Login sayfasında navigasyon gösterme
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const navLinks = [
    { name: 'Ana Ekran', path: '/admin/dashboard' },
    { name: 'Kargolar', path: '/admin/shipments' },
    { name: 'Manifestolar', path: '/admin/manifests' },
    { name: 'Depo', path: '/admin/depot' },
    { name: 'Finans', path: '/admin/finance' },
    { name: 'Müşteriler', path: '/admin/customers' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
        {/* Navigation Bar */}
        <div className="bg-white shadow-sm border-b px-4 md:px-6 py-4 sticky top-0 z-50">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                    {/* Mobile Menu Button */}
                    <button 
                        className="md:hidden text-gray-600 focus:outline-none"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>

                    <h1 
                        className="text-xl font-bold text-gray-800 cursor-pointer" 
                        onClick={() => router.push('/admin/dashboard')}
                    >
                        Kargo Takip
                    </h1>
                    
                    {/* Desktop Nav */}
                    <nav className="hidden md:flex gap-4 text-sm font-medium text-gray-600">
                        {navLinks.map((link) => (
                             <button 
                                key={link.path}
                                onClick={() => router.push(link.path)} 
                                className={`hover:text-blue-600 transition ${pathname.startsWith(link.path) ? 'text-blue-600' : ''}`}
                             >
                                {link.name}
                             </button>
                        ))}
                    </nav>
                </div>
                
                <div className="flex items-center gap-3">
                    {pathname !== '/admin/dashboard' && (
                        <button 
                            onClick={() => router.push('/admin/dashboard')}
                            className="hidden md:flex bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-medium transition-colors items-center gap-2"
                        >
                            <span>🏠</span> Ana Ekrana Dön
                        </button>
                    )}
                    
                    <button 
                        onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' })
                            router.push('/admin/login')
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded text-sm font-medium transition-colors"
                        title="Çıkış Yap"
                    >
                        Çıkış
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden mt-4 pb-2 border-t pt-4 flex flex-col gap-2">
                    {navLinks.map((link) => (
                        <button 
                            key={link.path}
                            onClick={() => {
                                router.push(link.path)
                                setIsMobileMenuOpen(false)
                            }}
                            className={`text-left px-4 py-3 rounded-lg ${pathname.startsWith(link.path) ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {link.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
        
        {/* Page Content */}
        <main>
            {children}
        </main>
    </div>
  )
}
