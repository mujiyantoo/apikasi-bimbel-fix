'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * RoleProtector - komponen client-side untuk proteksi halaman berdasarkan role
 * 
 * Aturan:
 *   - Owner  : akses semua halaman
 *   - Admin  : akses semua KECUALI laporan, pimpinan, akuntansi
 *   - Pegawai: akses HANYA absensi dan kinerja
 */
export function RoleProtector({ children, allowedRoles }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.replace('/login')
      return
    }

    const role = session?.user?.role || ''

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(role)) {
        // Arahkan ke halaman default sesuai role
        if (role === 'Pegawai') {
          router.replace('/dashboard/absensi')
        } else {
          router.replace('/dashboard')
        }
      }
    }
  }, [session, status, allowedRoles, router])

  if (status === 'loading') {
    return <div>Memuat...</div>
  }

  const role = session?.user?.role || ''

  // Jika tidak ada session, jangan render children
  if (!session) return null

  // Jika ada pembatasan role dan user tidak punya akses, jangan render
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return null
  }

  return children
}
