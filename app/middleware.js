import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Jika belum login, redirect ke login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Jika role Pegawai coba akses dashboard selain absensi → redirect ke absensi
    if (token.role === 'Pegawai' && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/absensi', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: ['/dashboard/:path*']
}
