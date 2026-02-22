'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, RefreshCw, MapPin, Users, CheckCircle, Clock, Settings } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const bulanOptions = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
]

export default function AbsensiDashboardPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'Admin'

  const [absensi, setAbsensi] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [showSetting, setShowSetting] = useState(false)
  const [lokasiKantor, setLokasiKantor] = useState({ lat: '', lng: '', radius: 20 })
  const [settingLoading, setSettingLoading] = useState(false)
  const [detectingLokasi, setDetectingLokasi] = useState(false)

  const fetchAbsensi = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('bulan', filterBulan)
      params.set('tahun', filterTahun)
      const res = await fetch(`/api/absensi?${params}`)
      const data = await res.json()
      setAbsensi(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLokasiKantor = async () => {
    try {
      const res = await fetch('/api/absensi/lokasi')
      const data = await res.json()
      setLokasiKantor(data)
    } catch (err) {}
  }

  useEffect(() => {
    fetchAbsensi()
    fetchLokasiKantor()
  }, [filterBulan, filterTahun])

  const handleDeteksiLokasi = () => {
    setDetectingLokasi(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLokasiKantor(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }))
        setDetectingLokasi(false)
        toast.success('Lokasi berhasil dideteksi!')
      },
      () => { toast.error('Gagal deteksi lokasi'); setDetectingLokasi(false) },
      { enableHighAccuracy: true }
    )
  }

  const handleSimpanLokasi = async () => {
    setSettingLoading(true)
    try {
      const res = await fetch('/api/absensi/lokasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lokasiKantor)
      })
      if (!res.ok) throw new Error()
      toast.success('Lokasi kantor berhasil disimpan')
      setShowSetting(false)
    } catch {
      toast.error('Gagal menyimpan lokasi')
    } finally {
      setSettingLoading(false)
    }
  }

  const formatJam = (date) => date ? new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
  const formatTanggal = (date) => date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'

  const totalHadir = absensi.filter(a => a.waktu_masuk).length
  const totalLengkap = absensi.filter(a => a.waktu_masuk && a.waktu_keluar).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitor Absensi</h1>
            <p className="text-sm text-gray-500">Data kehadiran pegawai berbasis GPS</p>
          </div>
        </div>
        <div className="flex gap-2">
          {userRole === 'Owner' && (
            <Button variant="outline" size="sm" onClick={() => setShowSetting(!showSetting)}>
              <Settings className="w-4 h-4 mr-1" /> Setting Lokasi
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchAbsensi}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Setting Lokasi Kantor - hanya Owner */}
      {showSetting && userRole === 'Owner' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Setting Lokasi Kantor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lokasiKantor.lat}
                  onChange={(e) => setLokasiKantor(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="-6.9175"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lokasiKantor.lng}
                  onChange={(e) => setLokasiKantor(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="107.6191"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Radius (meter)</label>
                <input
                  type="number"
                  value={lokasiKantor.radius}
                  onChange={(e) => setLokasiKantor(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="20"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDeteksiLokasi} disabled={detectingLokasi}>
                <MapPin className="w-4 h-4 mr-1" />
                {detectingLokasi ? 'Mendeteksi...' : 'Deteksi Lokasi Saya Sekarang'}
              </Button>
              <Button size="sm" onClick={handleSimpanLokasi} disabled={settingLoading} className="bg-blue-600 text-white">
                {settingLoading ? 'Menyimpan...' : 'Simpan Lokasi'}
              </Button>
            </div>
            <p className="text-xs text-blue-600">💡 Klik "Deteksi Lokasi Saya Sekarang" saat berada di kantor untuk mengisi koordinat otomatis</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{absensi.length}</p>
            <p className="text-xs text-gray-500">Total Catatan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{totalHadir}</p>
            <p className="text-xs text-gray-500">Sudah Masuk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-600">{totalLengkap}</p>
            <p className="text-xs text-gray-500">Masuk & Keluar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterBulan.toString()} onValueChange={(v) => setFilterBulan(parseInt(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bulanOptions.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <input
          type="number"
          value={filterTahun}
          onChange={(e) => setFilterTahun(parseInt(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm w-24"
        />
      </div>

      {/* Tabel */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat data...</div>
          ) : absensi.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Belum ada data absensi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Nama Pegawai</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tanggal</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Jam Masuk</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Jam Keluar</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Jarak Masuk</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {absensi.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.pegawai_nama}</td>
                      <td className="px-4 py-3">{formatTanggal(item.waktu_masuk)}</td>
                      <td className="px-4 py-3 text-green-600 font-mono">{formatJam(item.waktu_masuk)}</td>
                      <td className="px-4 py-3 text-blue-600 font-mono">{formatJam(item.waktu_keluar)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" /> {item.jarak_masuk}m
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.waktu_masuk && item.waktu_keluar ? (
                          <Badge className="bg-green-100 text-green-700">✅ Lengkap</Badge>
                        ) : item.waktu_masuk ? (
                          <Badge className="bg-yellow-100 text-yellow-700">⏳ Belum Keluar</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">❌ Tidak Hadir</Badge>
                        )}
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
