import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verify } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Admin rotalarını koru
  if (path.startsWith('/admin')) {
    // Login sayfasına erişime izin ver (eğer zaten giriş yapmamışsa)
    if (path === '/admin/login') {
        const token = request.cookies.get('token')?.value
        if (token) {
            const verifiedToken = await verify(token)
            if (verifiedToken) {
                return NextResponse.redirect(new URL('/admin/dashboard', request.url))
            }
        }
        return NextResponse.next()
    }

    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const verifiedToken = await verify(token)

    if (!verifiedToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
