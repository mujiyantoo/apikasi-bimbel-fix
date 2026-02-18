import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  })

  const pathname = req.nextUrl.pathname

  // Boleh akses tanpa login
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  // Belum login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = token.role?.toLowerCase()

  // ROLE YANG DIIZINKAN
  const allowedRoles = ['owner', 'admin']

  if (!allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Lolos semua pengecekan
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
