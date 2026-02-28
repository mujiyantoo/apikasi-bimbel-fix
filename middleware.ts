import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = typeof token.role === 'string' ? token.role.toLowerCase() : ''

  // Cek /dashboard/kinerja DULU sebelum /dashboard umum
  if (pathname.startsWith('/dashboard/kinerja')) {
    if (!['owner', 'admin', 'pegawai'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // Halaman dashboard lain hanya untuk owner & admin
  if (pathname.startsWith('/dashboard')) {
    if (role === 'pegawai') {
      return NextResponse.redirect(new URL('/absensi', req.url))
    }
    if (!['owner', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
