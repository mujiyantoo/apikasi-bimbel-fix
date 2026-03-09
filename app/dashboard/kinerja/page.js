'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RefreshCw, DollarSign, Loader2, Plus, X } from 'lucide-react'
// RoleProtector dihapus - proteksi role sudah ditangani oleh middleware.js

const bulanOptions = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
]

const jenjangOptions = ['SD', 'SMP', 'SMA']
const kategoriOptions = ['Reguler', 'PR', 'Piket']

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
  console.log('ROLE:', session?.user?.role)
  const [kinerja, setKinerja] = useState([])
  const [loading, setLoading] = useState(true)

  // Default dates: Monday to Saturday of the current week (or previous if today is Sunday)
  const getInitialDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Start = Senin (Monday)
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const start = new Date(today)
    start.setDate(today.getDate() - diffToMonday)

    // End = Sabtu (Saturday)
    const end = new Date(start)
    end.setDate(start.getDate() + 5)

    // Format YYYY-MM-DD
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  const initialDates = getInitialDates()
  const [startDate, setStartDate] = useState(initialDates.start)
  const [endDate, setEndDate] = useState(initialDates.end)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [pesan, setPesan] = useState(null)
  const [pegawaiSaya, setPegawaiSaya] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) setLoginError('Email atau password salah')
    setLoginLoading(false)
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Jangan redirect - biarkan login form yang muncul
    }
  }, [status])

  useEffect(() => {
    if (session && startDate && endDate) fetchKinerja()
  }, [session, startDate, endDate])

  const fetchKinerja = async () => {
    setLoading(true)
    try {
      const resPegawai = await fetch('/api/pegawai')
      const dataPegawai = await resPegawai.json()
      const pegawaiList = dataPegawai.success && dataPegawai.data ? dataPegawai.data : dataPegawai
      const list = Array.isArray(pegawaiList) ? pegawaiList : []
      const found = list.find(p => p.nama?.trim().toLowerCase() === session?.user?.name?.trim().toLowerCase())
      setPegawaiSaya(found || null)
      if (!found) {
        setPesan({ type: 'error', text: 'Data pegawai tidak ditemukan. Pastikan nama akun login sama dengan nama di data pegawai.' })
        setKinerja([])
        setLoading(false)
        return
      }
      const params = new URLSearchParams()
      params.set('pengajar_id', found.id)
      params.set('startDate', startDate)
      params.set('endDate', endDate)
      const res = await fetch('/api/kinerja?' + params)
      const data = await res.json()
      setKinerja(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchKinerja error:', err)
      setKinerja([])
    } finally {
      setLoading(false)
    }
  }

  const hitungGaji = (jenjang, kategori, jamMulai, jamSelesai) => {
    // Piket: flat Rp 7.000 per sesi
    if (kategori === 'Piket') return 7000

    if (!jamMulai || !jamSelesai) return 0
    const parts1 = jamMulai.split(':')
    const parts2 = jamSelesai.split(':')
    const h1 = parseInt(parts1[0]), m1 = parseInt(parts1[1])
    const h2 = parseInt(parts2[0]), m2 = parseInt(parts2[1])
    const menit = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (menit <= 0) return 0
    const tarifReguler = { 'SD': 24000, 'SMP': 25000, 'SMA': 25000 }
    const tarifPR = { 'SD': 25000, 'SMP': 25000, 'SMA': 25000 }
    if (kategori === 'Reguler') {
      return (tarifReguler[jenjang] || 0) * Math.floor(menit / 60)
    } else {
      return Math.round((menit / 90) * 0.75 * (tarifPR[jenjang] || 0))
    }
  }

  const handleSubmit = async () => {
    const isPiket = form.kategori === 'Piket'
    if (!form.tanggal || !form.jam_mulai || !form.jam_selesai || !form.kategori) {
      setPesan({ type: 'error', text: 'Harap isi semua field yang wajib!' }); return
    }
    if (!isPiket && !form.jenjang) {
      setPesan({ type: 'error', text: 'Harap pilih jenjang!' }); return
    }
    if (!pegawaiSaya) { setPesan({ type: 'error', text: 'Data pegawai tidak ditemukan.' }); return }
    const parts1 = form.jam_mulai.split(':'), parts2 = form.jam_selesai.split(':')
    const menit = (parseInt(parts2[0]) * 60 + parseInt(parts2[1])) - (parseInt(parts1[0]) * 60 + parseInt(parts1[1]))
    if (menit <= 0) { setPesan({ type: 'error', text: 'Jam selesai harus lebih dari jam mulai!' }); return }
    const gaji = hitungGaji(form.jenjang, form.kategori, form.jam_mulai, form.jam_selesai)
    setSubmitLoading(true)
    setPesan(null)
    try {
      const res = await fetch('/api/kinerja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pengajar_id: pegawaiSaya.id, pengajar_nama: pegawaiSaya.nama,
          tanggal: form.tanggal, jam_mulai: form.jam_mulai, jam_selesai: form.jam_selesai,
          menit_mengajar: menit, jenjang: form.jenjang || '-', kategori: form.kategori,
          keterangan: form.keterangan, gaji
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

  // Tampilkan login form jika belum login
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Kinerja Saya</h1>
            <p className="text-gray-500 text-sm mt-1">Bina Insan Nusantara</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@bimbel.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loginLoading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 max-w-4xl mx-auto space-y-4">

        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kinerja Saya</h1>
            <p className="text-sm text-gray-500">{session?.user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchKinerja} variant="outline" size="sm" className="bg-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => { setShowForm(!showForm); setPesan(null) }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {showForm ? 'Batal' : 'Tambah'}
            </Button>
          </div>
        </div>

        {pesan && (
          <div className={'rounded-xl p-3 text-sm ' + (pesan.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
            {pesan.text}
          </div>
        )}

        {showForm && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <h2 className="font-bold text-gray-900">Input Kinerja Mengajar</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
                {/* Jenjang disembunyikan jika Piket */}
                {form.kategori !== 'Piket' && (
                  <div>
                    <Label>Jenjang *</Label>
                    <Select value={form.jenjang} onValueChange={(v) => setForm({ ...form, jenjang: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        {jenjangOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={form.kategori === 'Piket' ? 'col-span-2' : ''}>
                  <Label>Kategori *</Label>
                  <Select
                    value={form.kategori}
                    onValueChange={(v) => setForm({ ...form, kategori: v, jenjang: v === 'Piket' ? '' : form.jenjang })}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {kategoriOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Keterangan / Materi</Label>
                <Input placeholder="Contoh: Matematika bab persamaan linear"
                  value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
              </div>
              {(previewGaji > 0 || form.kategori === 'Piket') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">Estimasi Gaji:</span>
                  <span className="font-bold text-green-600">{formatRupiah(form.kategori === 'Piket' ? 7000 : previewGaji)}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Tanggal Akhir</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">Reguler (per sesi)</p>
                <p className="text-xs text-gray-600">SD: Rp 24.000</p>
                <p className="text-xs text-gray-600">SMP: Rp 25.000</p>
                <p className="text-xs text-gray-600">SMA: Rp 25.000</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <p className="text-xs font-semibold text-orange-700 mb-1">PR (mnt/90×0,75×tarif)</p>
                <p className="text-xs text-gray-600">SD: Rp 24.000</p>
                <p className="text-xs text-gray-600">SMP: Rp 25.000</p>
                <p className="text-xs text-gray-600">SMA: Rp 25.000</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 mb-1">Piket (flat per sesi)</p>
                <p className="text-xs text-gray-600">Semua: Rp 7.000</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium text-green-700">Total Gaji Periode Ini</span>
                <span className="text-xl font-bold text-green-600 flex items-center">
                  <DollarSign className="w-5 h-5 mr-1" />
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
              <div className="text-center py-8 text-gray-500">Belum ada data kinerja periode ini</div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs">Tanggal</th>
                      <th className="px-3 py-3 text-left text-xs">Jam</th>
                      <th className="px-3 py-3 text-left text-xs">Durasi</th>
                      <th className="px-3 py-3 text-left text-xs">Jenjang</th>
                      <th className="px-3 py-3 text-left text-xs">Kat.</th>
                      <th className="px-3 py-3 text-left text-xs">Keterangan</th>
                      <th className="px-3 py-3 text-right text-xs">Gaji</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {kinerja.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs">{item.jam_mulai}-{item.jam_selesai}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs">{item.menit_mengajar}m</td>
                        <td className="px-3 py-2 text-xs">{item.jenjang || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={
                            'px-1.5 py-0.5 rounded text-xs font-medium ' +
                            (item.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700' :
                              item.kategori === 'Piket' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700')
                          }>
                            {item.kategori}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 italic text-xs max-w-[120px] truncate">
                          {item.keterangan || '-'}
                        </td>
                        <td className="px-3 py-2 font-semibold text-green-600 whitespace-nowrap text-xs text-right">
                          {formatRupiah(item.gaji)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-50 font-bold">
                      <td colSpan={6} className="px-3 py-3 text-gray-700 text-xs">Total</td>
                      <td className="px-3 py-3 text-green-600 text-xs text-right">{formatRupiah(totalGaji)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
