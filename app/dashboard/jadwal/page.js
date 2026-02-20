'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Plus, FileDown, Trash2, Edit, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function JadwalPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'Admin'

  const [jadwal, setJadwal] = useState([])
  const [pegawai, setPegawai] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterHari, setFilterHari] = useState('all')
  const [filterTanggal, setFilterTanggal] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({
    hari: '',
    tanggal: '',
    kelas: '',
    waktu_mulai: '',
    waktu_selesai: '',
    mata_pelajaran: '',
    pengajar_id: '',
    ruangan: ''
  })

  const hariOptions = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

  const fetchJadwal = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterHari !== 'all') params.set('hari', filterHari)
      if (filterTanggal) params.set('tanggal', filterTanggal)
      
      const res = await fetch(`/api/jadwal?${params}`)
      const data = await res.json()
      setJadwal(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPegawai = async () => {
    try {
      const res = await fetch('/api/pegawai')
      const data = await res.json()
      setPegawai(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchJadwal()
    fetchPegawai()
  }, [filterHari, filterTanggal])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingId ? '/api/jadwal' : '/api/jadwal'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { ...formData, id: editingId } : formData

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      setIsDialogOpen(false)
      setEditingId(null)
      resetForm()
      fetchJadwal()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      hari: item.hari,
      tanggal: item.tanggal,
      kelas: item.kelas,
      waktu_mulai: item.waktu_mulai,
      waktu_selesai: item.waktu_selesai,
      mata_pelajaran: item.mata_pelajaran,
      pengajar_id: item.pengajar_id,
      ruangan: item.ruangan
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus jadwal ini?')) return
    try {
      await fetch(`/api/jadwal?id=${id}`, { method: 'DELETE' })
      fetchJadwal()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      hari: '',
      tanggal: '',
      kelas: '',
      waktu_mulai: '',
      waktu_selesai: '',
      mata_pelajaran: '',
      pengajar_id: '',
      ruangan: ''
    })
  }

  const exportToExcel = () => {
    const dataToExport = jadwal.map(item => ({
      'Hari': item.hari,
      'Tanggal': new Date(item.tanggal).toLocaleDateString('id-ID'),
      'Kelas': item.kelas,
      'Waktu': `${item.waktu_mulai} - ${item.waktu_selesai}`,
      'Mata Pelajaran': item.mata_pelajaran,
      'Pengajar': item.pengajar_nama,
      'Ruangan': item.ruangan
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal')
    
    const fileName = `Jadwal_${filterHari !== 'all' ? filterHari : 'Semua'}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text('JADWAL KBM BINA INSAN NUSANTARA', 14, 15)
    doc.setFontSize(10)
    doc.text(`${filterHari !== 'all' ? filterHari : 'Semua Hari'} - ${filterTanggal || 'Semua Tanggal'}`, 14, 22)

    const tableData = jadwal.map(item => [
      item.hari,
      new Date(item.tanggal).toLocaleDateString('id-ID'),
      item.kelas,
      `${item.waktu_mulai} - ${item.waktu_selesai}`,
      item.mata_pelajaran,
      item.pengajar_nama,
      item.ruangan
    ])

    doc.autoTable({
      startY: 28,
      head: [['Hari', 'Tanggal', 'Kelas', 'Waktu', 'Mata Pelajaran', 'Pengajar', 'Ruangan']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 }
    })

    const fileName = `Jadwal_${filterHari !== 'all' ? filterHari : 'Semua'}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jadwal Mengajar</h1>
          <p className="text-sm text-gray-500">Kelola jadwal mengajar pengajar</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchJadwal} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingId(null); }}>
                <Plus className="w-4 h-4 mr-1" /> Tambah Jadwal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hari *</Label>
                    <Select value={formData.hari} onValueChange={(v) => setFormData({...formData, hari: v})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Hari" />
                      </SelectTrigger>
                      <SelectContent>
                        {hariOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tanggal *</Label>
                    <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Kelas *</Label>
                    <Input value={formData.kelas} onChange={(e) => setFormData({...formData, kelas: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Waktu Mulai *</Label>
                    <Input type="time" value={formData.waktu_mulai} onChange={(e) => setFormData({...formData, waktu_mulai: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Waktu Selesai *</Label>
                    <Input type="time" value={formData.waktu_selesai} onChange={(e) => setFormData({...formData, waktu_selesai: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Mata Pelajaran *</Label>
                    <Input value={formData.mata_pelajaran} onChange={(e) => setFormData({...formData, mata_pelajaran: e.target.value})} required />
                  </div>
                  <div className="col-span-2">
                    <Label>Pengajar *</Label>
                    <Select value={formData.pengajar_id} onValueChange={(v) => setFormData({...formData, pengajar_id: v})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Pengajar" />
                      </SelectTrigger>
                      <SelectContent>
                        {pegawai.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ruangan *</Label>
                    <Input value={formData.ruangan} onChange={(e) => setFormData({...formData, ruangan: e.target.value})} required />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button type="submit">{editingId ? 'Update' : 'Simpan'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Filter Hari</Label>
              <Select value={filterHari} onValueChange={setFilterHari}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Hari</SelectItem>
                  {hariOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Filter Tanggal</Label>
              <Input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={exportToExcel} variant="outline">
                <FileDown className="w-4 h-4 mr-1" /> Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <FileDown className="w-4 h-4 mr-1" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : jadwal.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Belum ada jadwal</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Hari</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Kelas</th>
                    <th className="px-4 py-3 text-left">Waktu</th>
                    <th className="px-4 py-3 text-left">Mata Pelajaran</th>
                    <th className="px-4 py-3 text-left">Pengajar</th>
                    <th className="px-4 py-3 text-left">Ruangan</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jadwal.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{item.hari}</td>
                      <td className="px-4 py-3">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3">{item.kelas}</td>
                      <td className="px-4 py-3">{item.waktu_mulai} - {item.waktu_selesai}</td>
                      <td className="px-4 py-3">{item.mata_pelajaran}</td>
                      <td className="px-4 py-3">{item.pengajar_nama}</td>
                      <td className="px-4 py-3">{item.ruangan}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
