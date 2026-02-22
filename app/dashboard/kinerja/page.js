'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, RefreshCw, DollarSign } from 'lucide-react'

export default function KinerjaPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'Admin'
  const userEmail = session?.user?.email

  const [kinerja, setKinerja] = useState([])
  const [pegawai, setPegawai] = useState([])
  const [currentPegawaiId, setCurrentPegawaiId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [filterPengajar, setFilterPengajar] = useState('all')
  
  const [formData, setFormData] = useState({
    pengajar_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    jam_mulai: '',
    jam_selesai: '',
    jenjang: '',
    kategori: '',
    keterangan: ''
  })

  const bulanOptions = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ]

  const fetchPegawai = async () => {
    try {
      const res = await fetch('/api/pegawai')
      const data = await res.json()
      const pengajarList = Array.isArray(data) ? data.filter(p => p.jabatan?.toLowerCase().includes('pengajar') || p.jabatan?.toLowerCase().includes('guru')) : []
      setPegawai(pengajarList)

      // Cari pegawai berdasarkan email user yang login
      if (userRole !== 'Owner') {
        const currentUser = pengajarList.find(p => p.email === userEmail)
        if (currentUser) {
          setCurrentPegawaiId(currentUser.id)
          setFilterPengajar(currentUser.id)
          setFormData(prev => ({ ...prev, pengajar_id: currentUser.id }))
        }
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchKinerja = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('bulan', filterBulan)
      params.set('tahun', filterTahun)
      
      // Kalau bukan Owner, filter otomatis by currentPegawaiId
      if (userRole !== 'Owner' && currentPegawaiId) {
        params.set('pengajar_id', currentPegawaiId)
      } else if (filterPengajar !== 'all') {
        params.set('pengajar_id', filterPengajar)
      }
      
      const res = await fetch(`/api/kinerja?${params}`)
      const data = await res.json()
      setKinerja(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPegawai()
  }, [])

  useEffect(() => {
    if (userRole !== 'Owner' && !currentPegawaiId) return // Tunggu currentPegawaiId terisi dulu
    fetchKinerja()
  }, [filterBulan, filterTahun, filterPengajar, currentPegawaiId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/kinerja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await res.json()

      if (res.ok) {
        alert(`Kinerja berhasil ditambahkan!\nGaji: Rp ${result.gaji.toLocaleString('id-ID')}`)
        setIsDialogOpen(false)
        resetForm()
        fetchKinerja()
      } else {
        alert(result.error || 'Gagal menambahkan kinerja')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Gagal menambahkan kinerja')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data kinerja ini?')) return
    try {
      await fetch(`/api/kinerja?id=${id}`, { method: 'DELETE' })
      fetchKinerja()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      pengajar_id: userRole !== 'Owner' && currentPegawaiId ? currentPegawaiId : '',
      tanggal: new Date().toISOString().split('T')[0],
      jam_mulai: '',
      jam_selesai: '',
      jenjang: '',
      kategori: '',
      keterangan: ''
    })
  }

  const totalGaji = kinerja.reduce((sum, item) => sum + (item.gaji || 0), 0)

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kinerja Pengajar</h1>
          <p className="text-sm text-gray-500">Catat dan hitung gaji mengajar</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchKinerja} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-1" /> Tambah Kinerja
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Kinerja Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {userRole === 'Owner' ? (
                  <div>
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
                ) : (
                  <div>
                    <Label>Pengajar</Label>
                    <Input 
                      value={pegawai.find(p => p.id === currentPegawaiId)?.nama || 'Loading...'} 
                      disabled 
                      className="bg-gray-100"
                    />
                  </div>
                )}
                <div>
                  <Label>Tanggal *</Label>
                  <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jam Mulai *</Label>
                    <Input type="time" value={formData.jam_mulai} onChange={(e) => setFormData({...formData, jam_mulai: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Jam Selesai *</Label>
                    <Input type="time" value={formData.jam_selesai} onChange={(e) => setFormData({...formData, jam_selesai: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jenjang *</Label>
                    <Select value={formData.jenjang} onValueChange={(v) => setFormData({...formData, jenjang: v})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Jenjang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SD">SD</SelectItem>
                        <SelectItem value="SMP">SMP</SelectItem>
                        <SelectItem value="SMA">SMA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kategori *</Label>
                    <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Reguler">Reguler</SelectItem>
                        <SelectItem value="PR">PR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Keterangan</Label>
                  <Input value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
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
              <Label>Bulan</Label>
              <Select value={filterBulan.toString()} onValueChange={(v) => setFilterBulan(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bulanOptions.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Tahun</Label>
              <Input type="number" value={filterTahun} onChange={(e) => setFilterTahun(parseInt(e.target.value))} />
            </div>
            {userRole === 'Owner' && (
              <div className="flex-1">
                <Label>Pengajar</Label>
                <Select value={filterPengajar} onValueChange={setFilterPengajar}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Pengajar</SelectItem>
                    {pegawai.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Total Gaji Periode Ini:</span>
              <span className="text-2xl font-bold text-green-600 flex items-center">
                <DollarSign className="w-6 h-6 mr-1" />
                {formatRupiah(totalGaji)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : kinerja.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Belum ada data kinerja</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    {userRole === 'Owner' && <th className="px-4 py-3 text-left">Pengajar</th>}
                    <th className="px-4 py-3 text-left">Jam</th>
                    <th className="px-4 py-3 text-left">Durasi</th>
                    <th className="px-4 py-3 text-left">Jenjang</th>
                    <th className="px-4 py-3 text-left">Kategori</th>
                    <th className="px-4 py-3 text-left">Gaji</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {kinerja.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                      {userRole === 'Owner' && <td className="px-4 py-3">{item.pengajar_nama}</td>}
                      <td className="px-4 py-3">{item.jam_mulai} - {item.jam_selesai}</td>
                      <td className="px-4 py-3">{item.menit_mengajar} menit</td>
                      <td className="px-4 py-3">{item.jenjang}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${item.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">{formatRupiah(item.gaji)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
