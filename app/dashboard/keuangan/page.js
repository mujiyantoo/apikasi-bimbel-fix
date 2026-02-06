'use client'

import { useState, useEffect } from 'react'
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
  X,
  CreditCard
} from 'lucide-react'

const bulanOptions = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const tahunOptions = ['2023', '2024', '2025', '2026']

export default function KeuanganPage() {
  const [pembayaran, setPembayaran] = useState([])
  const [siswaList, setSiswaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    siswaId: '',
    namaSiswa: '',
    jenis: 'SPP',
    bulan: new Date().toLocaleDateString('id-ID', { month: 'long' }),
    tahun: new Date().getFullYear().toString(),
    jumlah: '',
    status: 'lunas'
  })

  // Fetch Payment Data
  const fetchPembayaran = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pembayaran')
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      const data = await res.json()
      setPembayaran(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pembayaran:', error)
      toast.error('Gagal memuat data pembayaran')
      setPembayaran([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch Student Data for Dropdown
  const fetchSiswa = async () => {
    try {
      const res = await fetch('/api/siswa')
      if (res.ok) {
        const data = await res.json()
        setSiswaList(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching siswa list:', error)
    }
  }

  useEffect(() => {
    fetchPembayaran()
    fetchSiswa()
  }, [])

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
      const res = await fetch('/api/pembayaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          jumlah: parseInt(formData.jumlah)
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan')
      }

      toast.success('Pembayaran berhasil dicatat')
      setIsDialogOpen(false)
      fetchPembayaran()

      // Reset form but keep defaults
      setFormData({
        siswaId: '',
        namaSiswa: '',
        jenis: 'SPP',
        bulan: new Date().toLocaleDateString('id-ID', { month: 'long' }),
        tahun: new Date().getFullYear().toString(),
        jumlah: '',
        status: 'lunas'
      })
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

  // Filter functionality
  const filteredPembayaran = pembayaran.filter(p =>
    p.namaSiswa?.toLowerCase().includes(search.toLowerCase()) ||
    p.jenis?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Keuangan</h1>
          <p className="text-gray-500 mt-1">Kelola pembayaran SPP dan transaksi</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pembayaran
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Catat Pembayaran Baru</DialogTitle>
              <DialogDescription>
                Masukkan detail pembayaran siswa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Siswa *</Label>
                <Select
                  value={formData.siswaId}
                  onValueChange={handleSiswaChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih siswa" />
                  </SelectTrigger>
                  <SelectContent>
                    {siswaList.length > 0 ? (
                      siswaList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nama} - {s.kelas}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="disabled" disabled>Data siswa tidak ditemukan</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Select
                    value={formData.bulan}
                    onValueChange={(val) => setFormData({ ...formData, bulan: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bulanOptions.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tahun</Label>
                  <Select
                    value={formData.tahun}
                    onValueChange={(val) => setFormData({ ...formData, tahun: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tahunOptions.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Jenis Pembayaran</Label>
                <Select
                  value={formData.jenis}
                  onValueChange={(val) => setFormData({ ...formData, jenis: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPP">SPP Bulanan</SelectItem>
                    <SelectItem value="Pendaftaran">Biaya Pendaftaran</SelectItem>
                    <SelectItem value="Buku">Buku & Modul</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jumlah (Rp) *</Label>
                <Input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                  placeholder="Contoh: 150000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunas">Lunas</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                  ) : (
                    'Simpan'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Cari nama siswa atau jenis pembayaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Riwayat Pembayaran</CardTitle>
              <CardDescription>{filteredPembayaran.length} transaksi ditemukan</CardDescription>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredPembayaran.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Belum ada data pembayaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPembayaran.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell className="font-medium">{p.namaSiswa}</TableCell>
                      <TableCell>{p.jenis}</TableCell>
                      <TableCell>{p.bulan} {p.tahun}</TableCell>
                      <TableCell>{formatCurrency(p.jumlah)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'lunas' ? 'default' : 'secondary'} className={p.status === 'lunas' ? 'bg-green-600 hover:bg-green-700' : ''}>
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
    </div>
  )
}
