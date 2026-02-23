'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, DollarSign, Loader2, Plus, X } from 'lucide-react'
import { RoleProtector } from '@/components/RoleProtector'

const bulanOptions = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
]

const jenjangOptions = ['SD', 'SMP', 'SMA']
const kategoriOptions = ['Reguler', 'Private']

const defaultForm = {
  tanggal: new Date().toISOString().split('T')[0],
  jam_mulai: '',
  jam_selesai: '',
  jenjang: '',
  kategori: '',
  keterangan: ''
}

export default function KinerjaSayaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kinerja, setKinerja] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [pesan, setPesan] = useState(null)
  const [pegawaiSaya, setPegawaiSaya] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/absensi')
  }, [status])

  useEffect(() => {
    if (session) fetchKinerja()
  }, [session, filterBulan, filterTahun])

  const fetchKinerja = async () => {
    setLoading(true)
    try {
      const resPegawai = await fetch('/api/pegawai')
      const dataPegawai = await resPegawai.json()
      const list = Array.isArray(dataPegawai) ? dataPegawai : []

      const found = list.find(p =>
        p.nama?.toLowerCase() === session.user.name?.toLowerCase()
      )
      setPegawaiSaya(found || null)

      if (!found) {
        setKinerja([])
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      params.set('pengajar_id', found.id)
      params.set('bulan', filterBulan)
      params.set('tahun', filterTahun)

      const res = await fetch('/api/kinerja?' + params)
      const data = await res.json()
      setKinerja(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setKinerja([])
    } finally {
      setLoading(false)
    }
  }

  const hitungGaji = (jenjang, kategori, jamMulai, jamSelesai) => {
    if (!jamMulai || !jamSelesai) return 0
    const parts1 = jamMulai.split(':')
    const parts2 = jamSelesai.split(':')
    const h1 = parseInt(parts1[0])
    const m1 = parseInt(parts1[1])
    const h2 = parseInt(parts2[0])
    const m2 = parseInt(parts2[1])
    const menit = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (menit <= 0) return 0

    const tarifReguler = { 'SD': 24000, 'SMP': 25000, 'SMA': 22000 }
    const tarifPR = { 'SD': 24000, 'SMP': 25000, 'SMA': 33000 }

    if (kategori === 'Reguler') {
      const sesi = Math.floor(menit / 60)
      return (tarifReguler[jenjang] || 0) * sesi
    } else {
      return Math.round((menit / 90) * 0.75 * (tarifPR[jenjang] || 0))
    }
  }

  const handleSubmit = async () => {
    if (!form.tanggal || !form.jam_mulai || !form.jam_selesai || !form.jenjang || !form.kategori) {
      setPesan({ type: 'error', text: 'Harap isi semua field yang wajib!' })
      return
    }
    if (!pegawaiSaya) {
      setPesan({ type: 'error', text: 'Data pegawai tidak ditemukan.' })
      return
    }

    const parts1 = form.jam_mulai.split(':')
    const parts2 = form.jam_selesai.split(':')
    const h1 = parseInt(parts1[0])
    const m1 = parseInt(parts1[1])
    const h2 = parseInt(parts2[0])
    const m2 = parseInt(parts2[1])
    const menit = (h2 * 60 + m2) - (h1 * 60 + m1)

    if (menit <= 0) {
      setPesan({ type: 'error', text: 'Jam selesai harus lebih dari jam mulai!' })
      return
    }

    const gaji = hitungGaji(form.jenjang, form.kategori, form.jam_mulai, form.jam_selesai)

    setSubmitLoading(true)
    setPesan(null)
    try {
      const res = await fetch('/api/kinerja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pengajar_id: pegawaiSaya.id,
          pengajar_nama: pegawaiSaya.nama,
          tanggal: form.tanggal,
          jam_mulai: form.jam_mulai,
          jam_selesai: form.jam_selesai,
          menit_mengajar: menit,
          jenjang: form.jenjang,
          kategori: form.kategori,
          keterangan: form.keterangan,
          gaji
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      setPesan({ type: 'success', text: 'Kinerja berhasil disimpan!' })
      setForm(defaultForm)
      setShowForm(false)
      fetchKinerja()
    } catch (err) {
      setPesan({ type: 'error', text: err.message })
    } finally {
      setSubmitLoading(false)
    }
  }

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(angka)

  const totalGaji = kinerja.reduce((sum, item) => sum + (item.gaji || 0), 0)
  const previewGaji = hitungGaji(form.jenjang, form.kategori, form.jam_mulai, form.jam_selesai)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

 return (
  <RoleProtector allowedRoles={['Owner']}>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/absensi')} className="gap-1 bg-white">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Kinerja Saya</h1>
              <p className="text-sm text-gray-500">{session && session.user && session.user.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchKinerja} variant="outline" size="sm" className="bg-white">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button onClick={() => { setShowForm(!showForm); setPesan(null) }} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {showForm ? 'Batal' : 'Tambah Kinerja'}
            </Button>
          </div>
        </div>

        {/* Pesan */}
        {pesan && (
          <div className={'rounded-xl p-3 flex items-center gap-2 text-sm ' + (pesan.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
            {pesan.text}
          </div>
        )}

        {/* Form Input Kinerja */}
        {showForm && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <h2 className="font-bold text-gray-900">Input Kinerja Mengajar</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tanggal *</Label>
                  <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
                </div>
                <div>
                  <Label>Jam Mulai *</Label>
                  <Input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} />
                </div>
                <div>
                  <Label>Jam Selesai *</Label>
                  <Input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Jenjang *</Label>
                  <Select value={form.jenjang} onValueChange={(v) => setForm({ ...form, jenjang: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
                    <SelectContent>
                      {jenjangOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategori *</Label>
                  <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {kategoriOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Keterangan / Materi</Label>
                <Input
                  placeholder="Contoh: Matematika bab persamaan linear"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                />
              </div>

              {previewGaji > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">Estimasi Gaji:</span>
                  <span className="font-bold text-green-600">{formatRupiah(previewGaji)}</span>
                </div>
              )}

              <Button onClick={handleSubmit} disabled={submitLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {submitLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Simpan Kinerja
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label>Bulan</Label>
                <Select value={filterBulan.toString()} onValueChange={(v) => setFilterBulan(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {bulanOptions.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Tahun</Label>
                <Input type="number" value={filterTahun} onChange={(e) => setFilterTahun(parseInt(e.target.value))} />
              </div>
            </div>
          </CardHeader>
          <CardContent>

            {/* Info tarif */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">Reguler (per sesi)</p>
                <p className="text-xs text-gray-600">SD: Rp 24.000</p>
                <p className="text-xs text-gray-600">SMP: Rp 25.000</p>
                <p className="text-xs text-gray-600">SMA: Rp 22.000</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <p className="text-xs font-semibold text-orange-700 mb-1">PR (menit/90 × 0,75 × tarif)</p>
                <p className="text-xs text-gray-600">SD: Rp 24.000</p>
                <p className="text-xs text-gray-600">SMP: Rp 25.000</p>
                <p className="text-xs text-gray-600">SMA: Rp 33.000</p>
              </div>
            </div>

            {/* Total Gaji */}
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Total Gaji Bulan Ini:</span>
                <span className="text-2xl font-bold text-green-600 flex items-center">
                  <DollarSign className="w-6 h-6 mr-1" />
                  {formatRupiah(totalGaji)}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">{kinerja.length} sesi mengajar</p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              </div>
            ) : kinerja.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Belum ada data kinerja bulan ini</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Jam</th>
                      <th className="px-4 py-3 text-left">Durasi</th>
                      <th className="px-4 py-3 text-left">Jenjang</th>
                      <th className="px-4 py-3 text-left">Kategori</th>
                      <th className="px-4 py-3 text-left">Keterangan / Materi</th>
                      <th className="px-4 py-3 text-left">Gaji</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {kinerja.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(item.tanggal).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.jam_mulai} - {item.jam_selesai}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.menit_mengajar} menit
                        </td>
                        <td className="px-4 py-3">{item.jenjang}</td>
                        <td className="px-4 py-3">
                          <span className={'px-2 py-1 rounded text-xs font-medium ' + (item.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')}>
                            {item.kategori}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 italic">
                          {item.keterangan || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">
                          {formatRupiah(item.gaji)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-50 font-bold">
                      <td colSpan={6} className="px-4 py-3 text-gray-700">Total</td>
                      <td className="px-4 py-3 text-green-600">{formatRupiah(totalGaji)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
 </RoleProtector>
  )
}
