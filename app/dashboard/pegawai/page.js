'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
  Edit2,
  Trash2,
  UserCog,
  Loader2,
  X,
  ArrowLeft,
  KeyRound,
  CheckCircle
} from 'lucide-react'

const jabatanOptions = ['Guru', 'Tutor', 'Admin', 'Keuangan', 'Kebersihan', 'Keamanan', 'Lainnya']

export default function PegawaiPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'Admin'

  const [pegawai, setPegawai] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAkunDialogOpen, setIsAkunDialogOpen] = useState(false)
  const [editingPegawai, setEditingPegawai] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [akunSubmitting, setAkunSubmitting] = useState(false)
  const [selectedPegawai, setSelectedPegawai] = useState(null)
  const [akunBerhasil, setAkunBerhasil] = useState([])

  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    jabatan: '',
    jenisKelamin: '',
    alamat: '',
    telepon: ''
  })

  const [akunData, setAkunData] = useState({
    email: '',
    password: ''
  })

  const fetchPegawai = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const res = await fetch(`/api/pegawai?${params}`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setPegawai(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pegawai:', error)
      toast.error('Gagal memuat data pegawai')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPegawai()
  }, [search])

  const resetForm = () => {
    setFormData({ nama: '', nip: '', jabatan: '', jenisKelamin: '', alamat: '', telepon: '' })
    setEditingPegawai(null)
  }

  const handleOpenDialog = (pegawaiData = null) => {
    if (pegawaiData) {
      setEditingPegawai(pegawaiData)
      setFormData({
        nama: pegawaiData.nama,
        nip: pegawaiData.nip,
        jabatan: pegawaiData.jabatan,
        jenisKelamin: pegawaiData.jenisKelamin || '',
        alamat: pegawaiData.alamat || '',
        telepon: pegawaiData.telepon || ''
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleOpenAkunDialog = (p) => {
    setSelectedPegawai(p)
    setAkunData({ email: '', password: '' })
    setIsAkunDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingPegawai ? `/api/pegawai/${editingPegawai.id}` : '/api/pegawai'
      const method = editingPegawai ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')
      toast.success(editingPegawai ? 'Pegawai berhasil diupdate' : 'Pegawai berhasil ditambahkan')
      setIsDialogOpen(false)
      resetForm()
      fetchPegawai()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBuatAkun = async (e) => {
    e.preventDefault()
    setAkunSubmitting(true)
    try {
      const res = await fetch('/api/register-pegawai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: selectedPegawai.nama,
          email: akunData.email,
          password: akunData.password,
          jabatan: selectedPegawai.jabatan,
          secret: 'RAHASIA123'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun')
      toast.success(`Akun login berhasil dibuat untuk ${selectedPegawai.nama}`)
      setAkunBerhasil(prev => [...prev, selectedPegawai.id])
      setIsAkunDialogOpen(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setAkunSubmitting(false)
    }
  }

  const handleDelete = async (id, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pegawai "${nama}"?`)) return
    try {
      const res = await fetch(`/api/pegawai/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menghapus pegawai')
      }
      toast.success('Pegawai berhasil dihapus')
      fetchPegawai()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getJabatanColor = (jabatan) => {
    const colors = {
      'Guru': 'bg-blue-100 text-blue-700',
      'Tutor': 'bg-green-100 text-green-700',
      'Admin': 'bg-purple-100 text-purple-700',
      'Keuangan': 'bg-amber-100 text-amber-700',
    }
    return colors[jabatan] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2">
              <a href="/dashboard"><ArrowLeft className="h-4 w-4" /></a>
            </Button>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Data Pegawai</h1>
          </div>
          <p className="text-gray-500">Kelola data pegawai dan staf</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pegawai
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPegawai ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</DialogTitle>
              <DialogDescription>
                {editingPegawai ? 'Perbarui data pegawai' : 'Masukkan data pegawai baru'}
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
                <Label htmlFor="nip">NIP *</Label>
                <Input
                  id="nip"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="Masukkan NIP"
                  required
                  disabled={!!editingPegawai}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jabatan">Jabatan *</Label>
                <Select value={formData.jabatan} onValueChange={(value) => setFormData({ ...formData, jabatan: value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                  <SelectContent>
                    {jabatanOptions.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenisKelamin">Jenis Kelamin</Label>
                <Select value={formData.jenisKelamin} onValueChange={(value) => setFormData({ ...formData, jenisKelamin: value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
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
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Masukkan alamat"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Batal</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : editingPegawai ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog Buat Akun Login - hanya Owner */}
      <Dialog open={isAkunDialogOpen} onOpenChange={setIsAkunDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              Buat Akun Login
            </DialogTitle>
            <DialogDescription>
              Buat akun login untuk <strong>{selectedPegawai?.nama}</strong> agar bisa absensi
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBuatAkun} className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={akunData.email}
                onChange={(e) => setAkunData({ ...akunData, email: e.target.value })}
                placeholder="Contoh: nama@binbimbel.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="text"
                value={akunData.password}
                onChange={(e) => setAkunData({ ...akunData, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-400">Password ini yang dipakai pegawai untuk login di halaman absensi</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              📱 Pegawai login absensi di: <strong>https://bin.biz.id/absensi</strong>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAkunDialogOpen(false)} className="flex-1">Batal</Button>
              <Button type="submit" disabled={akunSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {akunSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuat...</> : <><KeyRound className="w-4 h-4 mr-2" /> Buat Akun</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {search && (
              <Button variant="ghost" onClick={() => setSearch('')} className="text-gray-500">
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
              <CardTitle className="text-lg">Daftar Pegawai</CardTitle>
              <CardDescription>{pegawai.length} pegawai terdaftar</CardDescription>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <UserCog className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : pegawai.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Belum ada data pegawai</p>
              <Button onClick={() => handleOpenDialog()} variant="link" className="mt-2 text-emerald-600">
                Tambah pegawai pertama
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Jenis Kelamin</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(pegawai) && pegawai.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nama}</TableCell>
                      <TableCell><Badge variant="secondary">{p.nip}</Badge></TableCell>
                      <TableCell><Badge className={getJabatanColor(p.jabatan)}>{p.jabatan}</Badge></TableCell>
                      <TableCell>{p.jenisKelamin || '-'}</TableCell>
                      <TableCell>{p.telepon || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Tombol Buat Akun - hanya Owner */}
                          {userRole === 'Owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAkunDialog(p)}
                              className={akunBerhasil.includes(p.id) ? 'text-green-600 hover:bg-green-50' : 'text-blue-600 hover:bg-blue-50'}
                              title="Buat akun login absensi"
                            >
                              {akunBerhasil.includes(p.id)
                                ? <CheckCircle className="w-4 h-4" />
                                : <KeyRound className="w-4 h-4" />
                              }
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(p)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p.id, p.nama)}
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
