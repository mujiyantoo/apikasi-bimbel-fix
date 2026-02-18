'use client'

import { RoleProtector } from '@/components/RoleProtector'

export default function AkuntansiPage() {
  return (
    <RoleProtector allowedRoles={['Owner']}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Akuntansi</h1>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Halaman Akuntansi - Coming Soon</p>
          <p className="text-sm text-gray-400 mt-2">Fitur buku kas dan jurnal akan segera hadir</p>
        </div>
      </div>
    </RoleProtector>
  )
}
