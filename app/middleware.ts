import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  })

  const pathname = req.nextUrl.pathname

  // Biarkan halaman login dan API auth lewat
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Belum login → redirect ke login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = typeof token.role === 'string' ? token.role.toLowerCase() : ''

  // Jika akses dashboard
  if (pathname.startsWith('/dashboard')) {
    // Pegawai tidak boleh masuk dashboard → redirect ke absensi
    if (role === 'pegawai') {
      return NextResponse.redirect(new URL('/absensi', req.url))
    }
    // Selain Owner dan Admin tidak boleh masuk dashboard
    if (!['owner', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Jika akses kinerja-saya, hanya pegawai yang boleh
  if (pathname.startsWith('/kinerja-saya')) {
    if (role !== 'pegawai') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/kinerja-saya/:path*']
}
```

**Langkah:**
1. **Hapus** `middleware.js`
2. **Ganti** seluruh isi `middleware.ts` dengan kode di atas
3. Commit & push:
```
git add .
git commit -m "fix: gabungkan middleware, proteksi dashboard dan kinerja-saya"
git push
