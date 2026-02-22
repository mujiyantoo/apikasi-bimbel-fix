'use client'

import { useState, useEffect } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { MapPin, LogIn, LogOut, Clock, CheckCircle, XCircle, Loader2, AlertCircle, TrendingUp, ChevronRight } from 'lucide-react'

export default function AbsensiPage() {
  const { data: session, status } = useSession()
  const [lokasi, setLokasi] = useState(null)
  const [lokasiError, setLokasiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [absensiHariIni, setAbsensiHariIni] = useState(null)
  const [pesan, setPesan] = useState(null)
  const [jamSekarang, setJamSekarang] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [kinerjaRingkasan, setKinerjaRingkasan] = useState({ jumlah: 0, total: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setJamSekarang(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (session) {
      ambilLokasi()
      fetchAbsensiHariIni()
      fetchKinerjaRingkasan()
    }
  }, [session])

  const ambilLokasi = () => {
    setLokasiError('')
    if (!navigator.geolocation) { setLokasiError('Browser tidak mendukung GPS'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLokasi({ lat: pos.coords.latitude, lng: pos.coords.longitude, akurasi: Math.round(pos.coords.accuracy) }),
      () => setLokasiError('Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin lokasi diberikan.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const fetchAbsensiHariIni = async () => {
    if (!session) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/absensi?pegawai_id=${session.user.id}&tanggal=${today}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) setAbsensiHariIni(data[0])
      else setAbsensiHariIni(null)
    } catch (err) { console.error(err) }
  }

  const fetchKinerjaRingkasan = async () => {
    if (!session) return
    try {
      const bulan = new Date().getMonth() + 1
      const tahun = new Date().getFullYear()
      const res = await fetch(`/api/kinerja?pengajar_id=${session.user.id}&bulan=${bulan}&tahun=${tahun}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const total = data.reduce((sum, k) => sum + (k.gaji || 0), 0)
        setKinerjaRingkasan({ jumlah: data.length, total })
      }
    } catch (err) { console.error(err) }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) setLoginError('Email atau password salah')
    setLoginLoading(false)
  }

  const handleAbsen = async (tipe) => {
    if (!lokasi) { setPesan({ type: 'error', text: 'GPS belum aktif. Klik tombol refresh lokasi.' }); return }
    setLoading(true)
    setPesan(null)
    try {
      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pegawai_id: session.user.id,
          pegawai_nama: session.user.name,
          lat: lokasi.lat,
          lng: lokasi.lng,
          tipe
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPesan({ type: 'success', text: data.message })
      fetchAbsensiHariIni()
    } catch (err) {
      setPesan({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const formatJam = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatTanggal = () => {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(angka)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Halaman Login
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Absensi Pegawai</h1>
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
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loginLoading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Halaman Absensi
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-sm mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-5 text-center">
          <p className="text-sm text-gray-500">{formatTanggal()}</p>
          <p className="text-4xl font-bold text-blue-600 mt-1 font-mono">{jamSekarang}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
              {session.user.name?.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.role}</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="mt-3 text-xs text-red-500 underline">Keluar</button>
        </div>

        {/* Status GPS */}
        <div className={`rounded-2xl shadow-md p-4 ${lokasi ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className={`w-5 h-5 ${lokasi ? 'text-green-600' : 'text-red-500'}`} />
              <div>
                <p className={`text-sm font-semibold ${lokasi ? 'text-green-700' : 'text-red-600'}`}>
                  {lokasi ? 'GPS Aktif' : 'GPS Tidak Aktif'}
                </p>
                {lokasi && <p className="text-xs text-green-600">Akurasi ±{lokasi.akurasi}m</p>}
                {lokasiError && <p className="text-xs text-red-500">{lokasiError}</p>}
              </div>
            </div>
            <button onClick={ambilLokasi} className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Refresh
            </button>
          </div>
        </div>

        {/* Status Absensi Hari Ini */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h2 className="font-bold text-gray-900 mb-3">Status Absensi Hari Ini</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 text-center ${absensiHariIni?.waktu_masuk ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Masuk</p>
              <p className={`text-lg font-bold ${absensiHariIni?.waktu_masuk ? 'text-green-600' : 'text-gray-300'}`}>
                {absensiHariIni?.waktu_masuk ? formatJam(absensiHariIni.waktu_masuk) : '--:--'}
              </p>
              {absensiHariIni?.jarak_masuk && <p className="text-xs text-gray-400">{absensiHariIni.jarak_masuk}m dari kantor</p>}
            </div>
            <div className={`rounded-xl p-3 text-center ${absensiHariIni?.waktu_keluar ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Keluar</p>
              <p className={`text-lg font-bold ${absensiHariIni?.waktu_keluar ? 'text-blue-600' : 'text-gray-300'}`}>
                {absensiHariIni?.waktu_keluar ? formatJam(absensiHariIni.waktu_keluar) : '--:--'}
              </p>
              {absensiHariIni?.jarak_keluar && <p className="text-xs text-gray-400">{absensiHariIni.jarak_keluar}m dari kantor</p>}
            </div>
          </div>
        </div>

        {/* Pesan */}
        {pesan && (
          <div className={`rounded-xl p-3 flex items-center gap-2 text-sm ${pesan.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {pesan.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {pesan.text}
          </div>
        )}

        {/* Tombol Absen */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAbsen('masuk')}
            disabled={loading || !!absensiHariIni?.waktu_masuk || !lokasi}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex flex-col items-center gap-1 shadow-md transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
            <span className="text-sm">Absen Masuk</span>
          </button>
          <button
            onClick={() => handleAbsen('keluar')}
            disabled={loading || !absensiHariIni?.waktu_masuk || !!absensiHariIni?.waktu_keluar || !lokasi}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex flex-col items-center gap-1 shadow-md transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />}
            <span className="text-sm">Absen Keluar</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">Absensi hanya bisa dilakukan dalam radius 20 meter dari kantor</p>

        {/* ✅ LINK KE HALAMAN KINERJA */}
        <Link
          href="/dashboard/kinerja"
          className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between hover:bg-blue-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Kinerja Bulan Ini</p>
              <p className="text-xs text-gray-500">{kinerjaRingkasan.jumlah} sesi · {formatRupiah(kinerjaRingkasan.total)}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </Link>

      </div>
    </div>
  )
}
