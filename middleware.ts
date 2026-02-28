import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token'
  })
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith('/login') || 
      pathname.startsWith('/api/auth') || 
      pathname.startsWith('/absensi') ||
      pathname === '/') {
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = token.role || ''

  console.log('Middleware - Path:', pathname, 'Role:', role)

  const ownerOnlyPaths = [
    '/dashboard/siswa',
    '/dashboard/akuntansi',
    '/dashboard/pimpinan',
    '/dashboard/laporan',
    '/dashboard/pengaturan'
  ]

  const requiresOwner = ownerOnlyPaths.some(p => pathname.startsWith(p))
  if (requiresOwner && role !== 'Owner') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const pegawaiAllowedPaths = [
    '/dashboard/kinerja',
    '/dashboard/kinerja-saya'
  ]

  const isPegawaiAllowedPath = pegawaiAllowedPaths.some(p => pathname.startsWith(p))

  if (role === 'Pegawai' && pathname.startsWith('/dashboard') && !isPegawaiAllowedPath) {
    return NextResponse.redirect(new URL('/dashboard/kinerja-saya', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|logo).*)'
  ]
}
