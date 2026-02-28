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
    console.log('Middleware BLOCK - No token:', pathname)
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = token.role || '' // JANGAN lowercase! Pakai original
  const email = token.email || ''
  
  console.log('Middleware - Path:', pathname, '| Role:', role, '| Email:', email)

  // ========== KINERJA - BOLEH UNTUK OWNER & PEGAWAI ==========
  if (pathname.startsWith('/dashboard/kinerja') || pathname.startsWith('/dashboard/kinerja-saya')) {
    if (role === 'Owner' || role === 'Pegawai') {
      console.log('Middleware ALLOW - Kinerja access for:', role)
      return NextResponse.next()
    } else {
      console.log('Middleware BLOCK - Kinerja not allowed for:', role)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // ========== HALAMAN KHUSUS OWNER ==========
  const ownerOnlyPaths = [
    '/dashboard/siswa',
    '/dashboard/akuntansi',
    '/dashboard/pimpinan',
    '/dashboard/laporan',
    '/dashboard/pengaturan'
  ]

  const requiresOwner = ownerOnlyPaths.some(p => pathname.startsWith(p))

  if (requiresOwner && role !== 'Owner') {
    console.log('Middleware BLOCK - Owner-only page for:', role)
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // ========== DASHBOARD UMUM ==========
  if (pathname.startsWith('/dashboard')) {
    // Pegawai tidak boleh akses dashboard umum (redirect ke kinerja)
    if (role === 'Pegawai') {
      console.log('Middleware REDIRECT - Pegawai to kinerja-saya')
      return NextResponse.redirect(new URL('/dashboard/kinerja-saya', req.url))
    }
    
    // Admin & Owner boleh akses
    if (role === 'Admin' || role === 'Owner') {
      console.log('Middleware ALLOW - Dashboard for:', role)
      return NextResponse.next()
    }

    // Role tidak dikenal
    console.log('Middleware BLOCK - Unknown role:', role)
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Allow semua request lainnya
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|logo|api).*)'
  ]
}
