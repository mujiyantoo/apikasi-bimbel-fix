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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Loader2,
  X,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

const kelasOptions = ['TK', '1 SD', '2 SD', '3 SD', '4 SD', '5 SD', '6 SD', '7 SMP', '8 SMP', '9 SMP', '10 SMA', '11 SMA', '12 SMA']
const mataPelajaranOptions = ['calistung', 'Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris', 'PKN']

export default function SiswaPage() {
  const [siswa, setSiswa] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nama: '',
    nis: '',
    kelas: '',
    mataPelajaran: '',
    tanggalMasuk: '',
    jenisKelamin: '',
    alamat: '',
    telepon: ''
  })

  const fetchSiswa = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filterKelas) params.append('kelas', filterKelas)

      const res = await fetch(`/api/siswa?${params}`)

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      setSiswa(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching siswa:', error)
      toast.error('Gagal memuat data siswa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSiswa()
  }, [search, filterKelas])

  const resetForm = () => {
    setFormData({
      nama: '',
      nis: '',
      kelas: '',
      kelas: '',
      mataPelajaran: '',
      tanggalMasuk: '',
      jenisKelamin: '',
      alamat: '',
      telepon: ''
    })
    setEditingSiswa(null)
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
        telepon: siswaData.telepon || ''
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    console.log('Starting submission...', formData);

    try {
      const url = editingSiswa ? `/api/siswa/${editingSiswa.id}` : '/api/siswa'
      const method = editingSiswa ? 'PUT' : 'POST'

      console.log(`Sending ${method} request to ${url} with data:`, formData);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      console.log('Response status:', res.status);
      const data = await res.json()
      console.log('Response data:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan')
      }

      toast.success(editingSiswa ? 'Siswa berhasil diupdate' : 'Siswa berhasil ditambahkan')
      setIsDialogOpen(false)
      resetForm()
      await fetchSiswa() // Ensure this completes
      console.log('Refreshed student list');
    } catch (error) {
      console.error('Submission error:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-500 mt-1">Kelola data siswa bimbingan belajar</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Siswa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSiswa ? 'Edit Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
              <DialogDescription>
                {editingSiswa ? 'Perbarui data siswa' : 'Masukkan data siswa baru'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap *</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nis">NIS *</Label>
                <Input
                  id="nis"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="Masukkan NIS"
                  required
                  disabled={!!editingSiswa}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kelas">Kelas *</Label>
                <Select
                  value={formData.kelas}
                  onValueChange={(value) => setFormData({ ...formData, kelas: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {kelasOptions.map((kelas) => (
                      <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mataPelajaran">Mata Pelajaran *</Label>
                <Select
                  value={formData.mataPelajaran}
                  onValueChange={(value) => setFormData({ ...formData, mataPelajaran: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {mataPelajaranOptions.map((mp) => (
                      <SelectItem key={mp} value={mp}>{mp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenisKelamin">Jenis Kelamin</Label>
                <Select
                  value={formData.jenisKelamin}
                  onValueChange={(value) => setFormData({ ...formData, jenisKelamin: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telepon">No. Telepon</Label>
                <Input
                  id="telepon"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  placeholder="Masukkan no. telepon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalMasuk">Tanggal Mulai Masuk</Label>
                <Input
                  id="tanggalMasuk"
                  type="date"
                  value={formData.tanggalMasuk}
                  onChange={(e) => setFormData({ ...formData, tanggalMasuk: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Masukkan alamat"
                />
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
                    editingSiswa ? 'Update' : 'Simpan'
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari nama atau NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterKelas} onValueChange={setFilterKelas}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasOptions.map((kelas) => (
                  <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || filterKelas) && (
              <Button
                variant="ghost"
                onClick={() => { setSearch(''); setFilterKelas(''); }}
                className="text-gray-500"
              >
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
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : siswa.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Belum ada data siswa</p>
              <Button
                onClick={() => handleOpenDialog()}
                variant="link"
                className="mt-2 text-blue-600"
              >
                Tambah siswa pertama
              </Button>
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
                    <TableHead>Tanggal Masuk</TableHead>
                    <TableHead>Jenis Kelamin</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(siswa) && siswa.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nama}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.nis}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.kelas}</Badge>
                      </TableCell>
                      <TableCell>{s.mataPelajaran || '-'}</TableCell>
                      <TableCell>
                        {s.tanggalMasuk ? new Date(s.tanggalMasuk).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        }) : '-'}
                      </TableCell>
                      <TableCell>{s.jenisKelamin || '-'}</TableCell>
                      <TableCell>{s.telepon || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(s)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(s.id, s.nama)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
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
