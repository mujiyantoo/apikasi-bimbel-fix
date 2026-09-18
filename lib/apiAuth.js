import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

export const ADMIN_ROLES = ['owner', 'admin']
export const STAFF_ROLES = ['pegawai', 'guru']

// Ambil session di dalam route handler API. Wajib pakai authOptions
// supaya callback session ikut berjalan dan field `role` tersedia.
export async function getApiSession() {
  return await getServerSession(authOptions)
}

export function getRole(session) {
  return ((session?.user?.role) || '').toLowerCase().trim()
}

export function isAdmin(session) {
  return ADMIN_ROLES.includes(getRole(session))
}

export function isStaff(session) {
  return STAFF_ROLES.includes(getRole(session))
}
