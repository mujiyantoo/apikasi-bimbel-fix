'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      const role = (session?.user?.role || '').trim().toLowerCase()

      // Pegawai/Guru HANYA boleh akses absensi dan kinerja
      if (role === 'pegawai' || role === 'guru') {
        const allowed =
          pathname.startsWith('/dashboard/absensi') ||
          pathname.startsWith('/dashboard/kinerja')

        if (!allowed) {
          router.replace('/dashboard/absensi')
        }
      }
    }
  }, [status, session, pathname])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0 p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
