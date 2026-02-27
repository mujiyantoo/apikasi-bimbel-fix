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
      pathname === '/') {
    return NextResponse.next()
  }
  // Redirect ke login jika tidak ada token
  if (!token) {
    console.log('Middleware BLOCK - No token, redirecting to login')
    return NextResponse.redirect(new URL('/login', req.url))
  }
  const role = token.role || ''
  const email = token.email || ''
  
  // Log untuk debugging
  console.log('Middleware - Path:', pathname, 'Role:', role, 'Email:', email)
  // Halaman khusus Owner
  const ownerOnlyPaths = [
    '/dashboard/siswa',
    '/dashboard/akuntansi',
    '/dashboard/pimpinan',
    '/dashboard/laporan',
    '/dashboard/pengaturan'
  ]
  // Cek apakah halaman butuh Owner role
  const requiresOwner = ownerOnlyPaths.some(p => pathname.startsWith(p))
  if (requiresOwner && role !== 'Owner') {
    console.log('Middleware BLOCK - Non-owner trying to access owner page')
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  // Halaman yang boleh diakses Pegawai
  const pegawaiAllowedPaths = [
    '/dashboard/kinerja',
    '/dashboard/kinerja-saya'
  ]
  const isPegawaiAllowedPath = pegawaiAllowedPaths.some(p => pathname.startsWith(p))
  // Jika Pegawai mencoba akses dashboard selain yang diizinkan
  if (role === 'Pegawai' && pathname.startsWith('/dashboard') && !isPegawaiAllowedPath) {
    console.log('Middleware BLOCK - Pegawai trying to access restricted dashboard')
    return NextResponse.redirect(new URL('/dashboard/kinerja-saya', req.url))
  }
  // Allow all other requests
  return NextResponse.next()
}
export const config = {
  matcher: [
    '/dashboard',         // ← TAMBAHAN: tangkap /dashboard langsung
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|logo).*)'
  ]
}
