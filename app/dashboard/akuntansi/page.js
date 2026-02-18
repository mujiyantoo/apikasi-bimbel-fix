'use client'

import { RoleProtector } from '@/components/RoleProtector'

export default function akuntansi page() {
  return (
    <RoleProtector allowedRoles={['Owner']}>
      {/* Isi halaman akuntansi yang sudah ada */}
    </RoleProtector>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calculator, BookOpen, FileSpreadsheet, PieChart } from 'lucide-react'

export default function AkuntansiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Akuntansi</h1>
        <p className="text-gray-500 mt-1">Kelola buku kas dan jurnal akuntansi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-blue-50 rounded-xl w-fit">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Buku Kas</CardTitle>
            <CardDescription>Catat pemasukan & pengeluaran</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-emerald-50 rounded-xl w-fit">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Jurnal Umum</CardTitle>
            <CardDescription>Jurnal transaksi harian</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-purple-50 rounded-xl w-fit">
              <Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Neraca</CardTitle>
            <CardDescription>Laporan neraca keuangan</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-amber-50 rounded-xl w-fit">
              <PieChart className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-lg">Laba Rugi</CardTitle>
            <CardDescription>Laporan laba rugi</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-8 text-center">
          <Calculator className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Modul Akuntansi</h3>
          <p className="text-gray-500 mt-2">Fitur lengkap akan segera tersedia. Termasuk buku kas, jurnal umum, neraca, dan laporan laba rugi.</p>
        </CardContent>
      </Card>
    </div>
  )
}
