'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function RoleProtector({ allowedRoles, children }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    const userRole = (session?.user?.role || '').toLowerCase()
    const allowed = allowedRoles.map(r => r.toLowerCase())

    if (!allowed.includes(userRole)) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, allowedRoles])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  const userRole = (session?.user?.role || '').toLowerCase()
  const allowed = allowedRoles.map(r => r.toLowerCase())

  if (!allowed.includes(userRole)) {
    return null
  }

  return <>{children}</>
}
