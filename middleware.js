import { NextResponse } from 'next/server'

export function middleware(req) {
  const pathname = req.nextUrl.pathname

  // Halaman publik - tidak perlu auth
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/absensi') ||
    pathname.startsWith('/dashboard/absensi') ||
    pathname.startsWith('/dashboard/kinerja') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Cek keberadaan session cookie (tanpa decode JWT)
  // NextAuth menyimpan session di cookie ini
  const sessionCookie =
    req.cookies.get('next-auth.session-token') ||
    req.cookies.get('__Secure-next-auth.session-token')

  // Jika tidak ada cookie session, redirect ke login
  if (!sessionCookie && pathname.startsWith('/dashboard')) {
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
