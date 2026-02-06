'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Wallet,
  Loader2,
  Receipt,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ArrowLeft
} from 'lucide-react'

const bulanOptions = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const tahunOptions = ['2023', '2024', '2025', '2026']

export default function KeuanganPage() {
  const [activeTab, setActiveTab] = useState('spp') // spp, tagihan, laporan, pengeluaran
  const [pembayaran, setPembayaran] = useState([])
  const [siswaList, setSiswaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    siswaId: '',
    namaSiswa: '',
    jenis: 'SPP',
    bulan: new Date().toLocaleDateString('id-ID', { month: 'long' }),
    tahun: new Date().getFullYear().toString(),
    jumlah: '',
    status: 'lunas',
    keterangan: '' // Used for expenses
  })

  // Fetch Data
  const fetchPembayaran = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pembayaran')
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setPembayaran(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pembayaran:', error)
      toast.error('Gagal memuat data')
      setPembayaran([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSiswa = async () => {
    try {
      const res = await fetch('/api/siswa')
      if (res.ok) {
        const data = await res.json()
        setSiswaList(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching siswa:', error)
    }
  }

  useEffect(() => {
    fetchPembayaran()
    fetchSiswa()
  }, [])

  // Derived Data
  const filteredData = useMemo(() => {
    let data = pembayaran

    if (activeTab === 'spp') {
      data = pembayaran.filter(p => p.jenis !== 'Pengeluaran' && p.status === 'lunas')
    } else if (activeTab === 'tagihan') {
      data = pembayaran.filter(p => p.status === 'pending')
    } else if (activeTab === 'pengeluaran') {
      data = pembayaran.filter(p => p.jenis === 'Pengeluaran')
    }
    // Laporan uses all data

    return data.filter(p =>
      p.namaSiswa?.toLowerCase().includes(search.toLowerCase()) ||
      p.jenis?.toLowerCase().includes(search.toLowerCase())
    )
  }, [pembayaran, activeTab, search])

  const stats = useMemo(() => {
    const income = pembayaran
      .filter(p => p.jenis !== 'Pengeluaran' && p.status === 'lunas')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)

    const expense = pembayaran
      .filter(p => p.jenis === 'Pengeluaran')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)

    const pending = pembayaran
      .filter(p => p.status === 'pending')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)

    return { income, expense, pending, net: income - expense }
  }, [pembayaran])

  // Handlers
  const handleOpenDialog = () => {
    setFormData({
      siswaId: '',
      namaSiswa: '',
      jenis: activeTab === 'pengeluaran' ? 'Pengeluaran' : 'SPP',
      bulan: new Date().toLocaleDateString('id-ID', { month: 'long' }),
      tahun: new Date().getFullYear().toString(),
      jumlah: '',
      status: activeTab === 'tagihan' ? 'pending' : 'lunas',
      keterangan: ''
    })
    setIsDialogOpen(true)
  }

  const handleSiswaChange = (value) => {
    const selectedSiswa = siswaList.find(s => s.id === value)
    if (selectedSiswa) {
      setFormData({
        ...formData,
        siswaId: value,
        namaSiswa: selectedSiswa.nama
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Prepare payload based on type
      const payload = {
        ...formData,
        jumlah: parseInt(formData.jumlah),
        // If expense, use 'EXPENSE' ID and description as name
        siswaId: formData.jenis === 'Pengeluaran' ? 'EXPENSE' : formData.siswaId,
        namaSiswa: formData.jenis === 'Pengeluaran' ? formData.keterangan : formData.namaSiswa
      }

      const res = await fetch('/api/pembayaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')

      toast.success(formData.jenis === 'Pengeluaran' ? 'Pengeluaran dicatat' : 'Pembayaran berhasil')
      setIsDialogOpen(false)
      fetchPembayaran()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2">
              <a href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Keuangan</h1>
          </div>
          <p className="text-gray-500">Kelola arus kas dan laporan keuangan</p>
        </div>

        {activeTab !== 'laporan' && (
          <Button
            onClick={handleOpenDialog}
            className={`
              ${activeTab === 'pengeluaran'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}
            `}
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'pengeluaran' ? 'Catat Pengeluaran' : 'Tambah Pembayaran'}
          </Button>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {formData.jenis === 'Pengeluaran' ? 'Catat Pengeluaran' : 'Data Pembayaran'}
              </DialogTitle>
              <DialogDescription>
                {formData.jenis === 'Pengeluaran' ? 'Masukkan detail pengeluaran operasional' : 'Masukkan rincian pembayaran siswa'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.jenis !== 'Pengeluaran' ? (
                <div className="space-y-2">
                  <Label>Nama Siswa *</Label>
                  <Select value={formData.siswaId} onValueChange={handleSiswaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih siswa" />
                    </SelectTrigger>
                    <SelectContent>
                      {siswaList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nama} - {s.kelas}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Keterangan Pengeluaran *</Label>
                  <Input
                    placeholder="Contoh: Bayar Listrik, Gaji Tutur, Pembelian Spidol"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Select value={formData.bulan} onValueChange={(val) => setFormData({ ...formData, bulan: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{bulanOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tahun</Label>
                  <Select value={formData.tahun} onValueChange={(val) => setFormData({ ...formData, tahun: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tahunOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={formData.jenis} onValueChange={(val) => setFormData({ ...formData, jenis: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeTab === 'pengeluaran' ? (
                      <SelectItem value="Pengeluaran">Pengeluaran Operasional</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="SPP">SPP Bulanan</SelectItem>
                        <SelectItem value="Pendaftaran">Biaya Pendaftaran</SelectItem>
                        <SelectItem value="Buku">Buku & Modul</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jumlah (Rp) *</Label>
                <Input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunas">Lunas</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Batal</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          onClick={() => setActiveTab('spp')}
          className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'spp' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'}`}
        >
          <CardHeader>
            <div className="p-3 bg-blue-100 rounded-xl w-fit mb-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Pemasukan SPP</CardTitle>
            <CardDescription>Rp {formatCurrency(stats.income)}</CardDescription>
          </CardHeader>
        </Card>

        <Card
          onClick={() => setActiveTab('tagihan')}
          className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'tagihan' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:shadow-lg'}`}
        >
          <CardHeader>
            <div className="p-3 bg-emerald-100 rounded-xl w-fit mb-2">
              <Receipt className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Tagihan Pending</CardTitle>
            <CardDescription>Rp {formatCurrency(stats.pending)}</CardDescription>
          </CardHeader>
        </Card>

        <Card
          onClick={() => setActiveTab('laporan')}
          className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'laporan' ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:shadow-lg'}`}
        >
          <CardHeader>
            <div className="p-3 bg-purple-100 rounded-xl w-fit mb-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Saldo Bersih</CardTitle>
            <CardDescription>Rp {formatCurrency(stats.net)}</CardDescription>
          </CardHeader>
        </Card>

        <Card
          onClick={() => setActiveTab('pengeluaran')}
          className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'pengeluaran' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-lg'}`}
        >
          <CardHeader>
            <div className="p-3 bg-amber-100 rounded-xl w-fit mb-2">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-lg">Pengeluaran</CardTitle>
            <CardDescription>Rp {formatCurrency(stats.expense)}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content Area */}
      {activeTab === 'laporan' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Keuangan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="text-green-600" />
                  <span className="font-medium text-green-900">Total Pemasukan</span>
                </div>
                <span className="font-bold text-green-700">{formatCurrency(stats.income)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="text-red-600" />
                  <span className="font-medium text-red-900">Total Pengeluaran</span>
                </div>
                <span className="font-bold text-red-700">{formatCurrency(stats.expense)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="text-blue-600" />
                  <span className="font-medium text-blue-900">Saldo Akhir</span>
                </div>
                <span className="font-bold text-blue-700">{formatCurrency(stats.net)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <CardTitle className="text-lg capitalize">
                  {activeTab === 'spp' ? 'Riwayat Pemasukan' :
                    activeTab === 'pengeluaran' ? 'Riwayat Pengeluaran' :
                      'Daftar Tagihan Pending'}
                </CardTitle>
                <CardDescription>
                  {filteredData.length} data ditemukan
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari data..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>{activeTab === 'pengeluaran' ? 'Keterangan' : 'Nama Siswa'}</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-gray-500">
                          {new Date(p.createdAt).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="font-medium">{p.namaSiswa}</TableCell>
                        <TableCell>{p.jenis}</TableCell>
                        <TableCell>{p.bulan} {p.tahun}</TableCell>
                        <TableCell>{formatCurrency(p.jumlah)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={p.status === 'lunas' ? 'default' : 'secondary'}
                            className={p.status === 'lunas' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
