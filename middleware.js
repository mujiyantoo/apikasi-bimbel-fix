import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  })

  const pathname = req.nextUrl.pathname

  // Allow public routes
  if (pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/absensi') ||
    pathname.startsWith('/dashboard/absensi') ||
    pathname.startsWith('/dashboard/kinerja') ||
    pathname === '/') {
    return NextResponse.next()
  }

  // Redirect ke login jika tidak ada token
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = (token.role || '').trim().toLowerCase()

  // ================================================================
  // ROLE: Owner — boleh akses SEMUA halaman dashboard
  // ================================================================
  if (role === 'owner') {
    return NextResponse.next()
  }

  // ================================================================
  // ROLE: Admin — boleh semua KECUALI halaman khusus Owner
  // ================================================================
  if (role === 'admin') {
    const adminBlockedPaths = [
      '/dashboard/laporan',
      '/dashboard/pimpinan',
      '/dashboard/akuntansi',
    ]
    const isBlocked = adminBlockedPaths.some(p => pathname.startsWith(p))
    if (isBlocked) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // ================================================================
  // ROLE: Pegawai / Guru — HANYA boleh akses /dashboard/absensi dan /dashboard/kinerja
  // ================================================================
  if (role === 'pegawai' || role === 'guru') {
    if (pathname.startsWith('/dashboard')) {
      const pegawaiAllowed =
        pathname.startsWith('/dashboard/absensi') ||
        pathname.startsWith('/dashboard/kinerja-saya') ||
        pathname.startsWith('/dashboard/kinerja')

      if (!pegawaiAllowed) {
        return NextResponse.redirect(new URL('/dashboard/absensi', req.url))
      }
    }
    return NextResponse.next()
  }

  // Role tidak dikenal, redirect ke login
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|logo|api).*)'
  ]
}
