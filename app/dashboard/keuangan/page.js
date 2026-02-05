'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, CreditCard, Receipt, TrendingUp } from 'lucide-react'

export default function KeuanganPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Keuangan</h1>
        <p className="text-gray-500 mt-1">Kelola pembayaran SPP dan laporan keuangan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-blue-50 rounded-xl w-fit">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Pembayaran SPP</CardTitle>
            <CardDescription>Catat pembayaran siswa</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-emerald-50 rounded-xl w-fit">
              <Receipt className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Tagihan</CardTitle>
            <CardDescription>Lihat tagihan pending</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-purple-50 rounded-xl w-fit">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Laporan</CardTitle>
            <CardDescription>Laporan keuangan</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-amber-50 rounded-xl w-fit">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-lg">Pengeluaran</CardTitle>
            <CardDescription>Catat pengeluaran</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-8 text-center">
          <Wallet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Modul Keuangan</h3>
          <p className="text-gray-500 mt-2">Fitur lengkap akan segera tersedia. Termasuk pembayaran SPP, tagihan, dan laporan keuangan.</p>
        </CardContent>
      </Card>
    </div>
  )
}
