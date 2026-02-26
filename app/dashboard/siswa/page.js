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
  Plus, Search, Edit2, Trash2, Users, Loader2, X, ArrowLeft, FileSpreadsheet, FileText
} from 'lucide-react'
import Link from 'next/link'

const kelasOptions = ['TK', '1 SD', '2 SD', '3 SD', '4 SD', '5 SD', '6 SD', '7 SMP', '8 SMP', '9 SMP', '10 SMA', '11 SMA', '12 SMA']
const statusOptions = ['Aktif', 'Cuti']

const isTK = (kelas) => kelas === 'TK'
const isSD = (kelas) => ['1 SD', '2 SD', '3 SD', '4 SD', '5 SD', '6 SD'].includes(kelas)
const isSMP = (kelas) => ['7 SMP', '8 SMP', '9 SMP'].includes(kelas)
const isSMA = (kelas) => ['10 SMA', '11 SMA', '12 SMA'].includes(kelas)

const formatTanggal = (date) =>
  new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const getTanggalCetak = () =>
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const defaultForm = {
  nama: '', nis: '', kelas: '', mataPelajaran: '',
  tanggalMasuk: '', jenisKelamin: '', alamat: '', telepon: '',
  status: 'Aktif'
}

export default function SiswaPage() {
  const [siswa, setSiswa] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(defaultForm)

  const fetchSiswa = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filterKelas && filterKelas !== 'all') params.append('kelas', filterKelas)
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus)
      const res = await fetch(`/api/siswa?${params}`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setSiswa(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching siswa:', error)
      toast.error('Gagal memuat data siswa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSiswa() }, [search, filterKelas, filterStatus])

  const resetForm = () => { setFormData(defaultForm); setEditingSiswa(null) }

  const handleKelasChange = (value) => {
    setFormData({ ...formData, kelas: value, mataPelajaran: isTK(value) ? 'Calistung' : '' })
  }

  const handleOpenDialog = (siswaData = null) => {
    if (siswaData) {
      setEditingSiswa(siswaData)
      setFormData({
        nama: siswaData.nama,
        nis: siswaData.nis,
        kelas: siswaData.kelas,
        mataPelajaran: siswaData.mataPelajaran || '',
        tanggalMasuk: siswaData.tanggalMasuk || '',
        jenisKelamin: siswaData.jenisKelamin || '',
        alamat: siswaData.alamat || '',
        telepon: siswaData.telepon || '',
        status: siswaData.status || 'Aktif'
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingSiswa ? `/api/siswa/${editingSiswa.id}` : '/api/siswa'
      const method = editingSiswa ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')
      toast.success(editingSiswa ? 'Siswa berhasil diupdate' : 'Siswa berhasil ditambahkan')
      setIsDialogOpen(false)
      resetForm()
      await fetchSiswa()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus siswa "${nama}"?`)) return
    try {
      const res = await fetch(`/api/siswa/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menghapus siswa')
      }
      toast.success('Siswa berhasil dihapus')
      fetchSiswa()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Toggle status langsung dari tabel
  const handleToggleStatus = async (s) => {
    const newStatus = s.status === 'Aktif' ? 'Cuti' : 'Aktif'
    try {
      const res = await fetch(`/api/siswa/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, status: newStatus })
      })
      if (!res.ok) throw new Error('Gagal update status')
      toast.success(`Status ${s.nama} diubah ke ${newStatus}`)
      fetchSiswa()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleExportExcel = () => {
    const tanggalCetak = getTanggalCetak()
    const headers = ['No', 'Nama', 'NIS', 'Kelas', 'Mata Pelajaran', 'Status', 'Tanggal Masuk', 'Jenis Kelamin', 'Telepon']
    const rows = siswa.map((s, i) => [
      i + 1, s.nama, s.nis, s.kelas,
      s.mataPelajaran || '-',
      s.status || 'Aktif',
      s.tanggalMasuk ? formatTanggal(s.tanggalMasuk) : '-',
      s.jenisKelamin || '-',
      s.telepon || '-'
    ])
    const semuaBaris = [
      [`Daftar Siswa Bimbel`],
      [`Dicetak: ${tanggalCetak}`],
      [''],
      headers,
      ...rows
    ]
    const csvContent = semuaBaris
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Daftar_Siswa_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('File Excel berhasil diunduh')
  }

  const handleExportPDF = () => {
    const tanggalCetak = getTanggalCetak()
    const printContent = `
      <!DOCTYPE html><html><head><meta charset="utf-8" /><title>Daftar Siswa</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; font-size:11px; padding:20px; color:#000; }
        .header { text-align:center; margin-bottom:16px; border-bottom:2px solid #000; padding-bottom:10px; }
        .header h1 { font-size:16px; font-weight:bold; margin-bottom:4px; }
        .meta { display:flex; justify-content:space-between; margin-bottom:12px; font-size:10px; color:#555; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background-color:#1d4ed8; color:white; }
        th { padding:7px 8px; text-align:left; font-size:10px; font-weight:bold; }
        td { padding:6px 8px; border-bottom:1px solid #e5e7eb; font-size:10px; }
        tr:nth-child(even) td { background-color:#f8faff; }
        .badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold; }
        .aktif { background:#dcfce7; color:#15803d; }
        .cuti { background:#fef3c7; color:#92400e; }
        .footer { margin-top:20px; font-size:10px; color:#888; text-align:right; }
      </style></head><body>
      <div class="header">
        <h1>Daftar Siswa Bimbingan Belajar</h1>
        <p>Data seluruh siswa yang terdaftar</p>
      </div>
      <div class="meta">
        <span>Total Siswa: <strong>${siswa.length} siswa</strong></span>
        <span>Dicetak: <strong>${tanggalCetak}</strong></span>
      </div>
      <table>
        <thead>
          <tr><th>No</th><th>Nama</th><th>NIS</th><th>Kelas</th><th>Mata Pelajaran</th><th>Status</th><th>Tanggal Masuk</th><th>Jenis Kelamin</th><th>Telepon</th></tr>
        </thead>
        <tbody>
          ${siswa.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${s.nama}</strong></td>
              <td>${s.nis}</td>
              <td>${s.kelas}</td>
              <td>${s.mataPelajaran || '-'}</td>
              <td><span class="badge ${(s.status || 'Aktif') === 'Aktif' ? 'aktif' : 'cuti'}">${s.status || 'Aktif'}</span></td>
              <td>${s.tanggalMasuk ? formatTanggal(s.tanggalMasuk) : '-'}</td>
              <td>${s.jenisKelamin || '-'}</td>
              <td>${s.telepon || '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">Dokumen ini dicetak pada ${tanggalCetak}</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
      </body></html>`
    const printWindow = window.open('', '_blank', 'width=1000,height=700')
    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  const jumlahAktif = siswa.filter(s => (s.status || 'Aktif') === 'Aktif').length
  const jumlahCuti = siswa.filter(s => s.status === 'Cuti').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-500 mt-1">Kelola data siswa bimbingan belajar</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportExcel} className="border-green-500 text-green-700 hover:bg-green-50">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="border-red-400 text-red-600 hover:bg-red-50">
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah Siswa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSiswa ? 'Edit Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
                <DialogDescription>{editingSiswa ? 'Perbarui data siswa' : 'Masukkan data siswa baru'}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap *</Label>
                  <Input value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} placeholder="Masukkan nama lengkap" required />
                </div>
                <div className="space-y-2">
                  <Label>NIS *</Label>
                  <Input value={formData.nis} onChange={(e) => setFormData({ ...formData, nis: e.target.value })} placeholder="Masukkan NIS" required disabled={!!editingSiswa} />
                </div>
                <div className="space-y-2">
                  <Label>Kelas *</Label>
                  <Select value={formData.kelas} onValueChange={handleKelasChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                    <SelectContent>{kelasOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {formData.kelas && (
                  <div className="space-y-2">
                    <Label>Mata Pelajaran *</Label>
                    {isTK(formData.kelas) && (
                      <><Input value="Calistung" disabled className="bg-gray-50" /><p className="text-xs text-gray-400">Otomatis: Calistung</p></>
                    )}
                    {(isSD(formData.kelas) || isSMP(formData.kelas)) && (
                      <Select value={formData.mataPelajaran} onValueChange={(v) => setFormData({ ...formData, mataPelajaran: v })}>
                        <SelectTrigger><SelectValue placeholder="Pilih Reguler atau Privat" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Reguler">Reguler</SelectItem>
                          <SelectItem value="Privat">Privat</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {isSMA(formData.kelas) && (
                      <><Input value={formData.mataPelajaran} onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })} placeholder="Contoh: Fisika, Kimia..." required /><p className="text-xs text-gray-400">SMA: isi manual</p></>
                    )}
                  </div>
                )}

                {/* STATUS */}
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">✅ Aktif</SelectItem>
                      <SelectItem value="Cuti">⏸️ Cuti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jenis Kelamin</Label>
                  <Select value={formData.jenisKelamin} onValueChange={(v) => setFormData({ ...formData, jenisKelamin: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>No. Telepon</Label>
                  <Input value={formData.telepon} onChange={(e) => setFormData({ ...formData, telepon: e.target.value })} placeholder="Masukkan no. telepon" />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Mulai Masuk</Label>
                  <Input type="date" value={formData.tanggalMasuk} onChange={(e) => setFormData({ ...formData, tanggalMasuk: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} placeholder="Masukkan alamat" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Batal</Button>
                  <Button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600">
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : editingSiswa ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Aktif/Cuti */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-green-50 border-green-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase">Siswa Aktif</p>
              <p className="text-2xl font-bold text-green-700">{jumlahAktif}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-lg">✅</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-yellow-50 border-yellow-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-yellow-600 uppercase">Siswa Cuti</p>
              <p className="text-2xl font-bold text-yellow-700">{jumlahCuti}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-lg">⏸️</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Cari nama atau NIS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterKelas} onValueChange={setFilterKelas}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Filter Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Aktif">✅ Aktif</SelectItem>
                <SelectItem value="Cuti">⏸️ Cuti</SelectItem>
              </SelectContent>
            </Select>
            {(search || filterKelas || filterStatus) && (
              <Button variant="ghost" onClick={() => { setSearch(''); setFilterKelas(''); setFilterStatus('') }} className="text-gray-500">
                <X className="w-4 h-4 mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Daftar Siswa</CardTitle>
              <CardDescription>{siswa.length} siswa terdaftar</CardDescription>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : siswa.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Belum ada data siswa</p>
              <Button onClick={() => handleOpenDialog()} variant="link" className="mt-2 text-blue-600">Tambah siswa pertama</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Masuk</TableHead>
                    <TableHead>Jenis Kelamin</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siswa.map((s) => (
                    <TableRow key={s.id} className={(s.status === 'Cuti') ? 'opacity-60 bg-yellow-50' : ''}>
                      <TableCell className="font-medium">{s.nama}</TableCell>
                      <TableCell><Badge variant="secondary">{s.nis}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{s.kelas}</Badge></TableCell>
                      <TableCell>
                        {s.mataPelajaran === 'Reguler' ? <Badge className="bg-blue-100 text-blue-700">Reguler</Badge>
                          : s.mataPelajaran === 'Privat' ? <Badge className="bg-purple-100 text-purple-700">Privat</Badge>
                          : s.mataPelajaran === 'Calistung' ? <Badge className="bg-green-100 text-green-700">Calistung</Badge>
                          : s.mataPelajaran || '-'}
                      </TableCell>
                      <TableCell>
                        {/* Klik badge untuk toggle status langsung */}
                        <button onClick={() => handleToggleStatus(s)} title="Klik untuk ubah status">
                          {(s.status || 'Aktif') === 'Aktif'
                            ? <Badge className="bg-green-100 text-green-700 cursor-pointer hover:bg-green-200">✅ Aktif</Badge>
                            : <Badge className="bg-yellow-100 text-yellow-700 cursor-pointer hover:bg-yellow-200">⏸️ Cuti</Badge>
                          }
                        </button>
                      </TableCell>
                      <TableCell>{s.tanggalMasuk ? formatTanggal(s.tanggalMasuk) : '-'}</TableCell>
                      <TableCell>{s.jenisKelamin || '-'}</TableCell>
                      <TableCell>{s.telepon || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(s)} className="text-blue-600 hover:bg-blue-50">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id, s.nama)} className="text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
