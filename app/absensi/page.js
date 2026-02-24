'use client'

import { useState, useEffect } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { MapPin, LogIn, LogOut, Clock, CheckCircle, XCircle, Loader2, AlertCircle, TrendingUp, ChevronRight, Fingerprint, Wifi, WifiOff } from 'lucide-react'

export default function AbsensiPage() {
  const { data: session, status } = useSession()
  const [lokasi, setLokasi] = useState(null)
  const [lokasiError, setLokasiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [absensiHariIni, setAbsensiHariIni] = useState(null)
  const [pesan, setPesan] = useState(null)
  const [jamSekarang, setJamSekarang] = useState('')
  const [tanggalSekarang, setTanggalSekarang] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [kinerjaRingkasan, setKinerjaRingkasan] = useState({ jumlah: 0, total: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setJamSekarang(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setTanggalSekarang(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
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
      () => setLokasiError('Gagal mendapatkan lokasi.'),
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
      const resPegawai = await fetch('/api/pegawai')
      const dataPegawai = await resPegawai.json()
      const list = Array.isArray(dataPegawai) ? dataPegawai : []
      const pegawaiSaya = list.find(p => p.nama?.toLowerCase() === session.user.name?.toLowerCase())
      if (!pegawaiSaya) { setKinerjaRingkasan({ jumlah: 0, total: 0 }); return }
      const res = await fetch(`/api/kinerja?pengajar_id=${pegawaiSaya.id}&bulan=${bulan}&tahun=${tahun}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const total = data.reduce((sum, k) => sum + (k.gaji || 0), 0)
        setKinerjaRingkasan({ jumlah: data.length, total })
      }
    } catch (err) {
      setKinerjaRingkasan({ jumlah: 0, total: 0 })
    }
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
    if (!date) return '--:--'
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
  }

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(angka)

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    )
  }

  // Login Page
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900 px-6">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Absensi</h1>
          <p className="text-blue-200 text-sm mt-1">Bina Insan Nusantara</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Selamat Datang</h2>
          <p className="text-gray-500 text-sm mb-6">Masuk untuk melakukan absensi</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="email@bimbel.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2 border border-red-100">
                <XCircle className="w-4 h-4 shrink-0" /> {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loginLoading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Main Page
  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header dengan gradient */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 px-5 pt-10 pb-24 relative">
        {/* Tanggal */}
        <p className="text-blue-200 text-xs text-center mb-1">{tanggalSekarang}</p>

        {/* Jam besar */}
        <p className="text-white text-5xl font-bold text-center font-mono tracking-wide mb-5">
          {jamSekarang}
        </p>

        {/* GPS status pill */}
        <div className="flex justify-center">
          <button
            onClick={ambilLokasi}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur transition-all active:scale-95 ${
              lokasi
                ? 'bg-green-400/20 text-green-200 border border-green-400/30'
                : 'bg-red-400/20 text-red-200 border border-red-400/30'
            }`}
          >
            {lokasi ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {lokasi ? `GPS Aktif · ±${lokasi.akurasi}m` : 'GPS Tidak Aktif · Ketuk untuk refresh'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 -mt-16 space-y-4 pb-8 max-w-sm mx-auto">

        {/* Kartu Identitas User */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">{getInitials(session.user.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-200 uppercase tracking-wide font-semibold">{session.user.role}</p>
              <p className="text-white font-bold text-lg truncate">{session.user.name}</p>
              <p className="text-blue-200 text-xs truncate">{session.user.email}</p>
            </div>
          </div>

          {/* Waktu Masuk & Keluar */}
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Datang</p>
              <p className={`text-base font-bold ${absensiHariIni?.waktu_masuk ? 'text-green-600' : 'text-gray-300'}`}>
                {formatJam(absensiHariIni?.waktu_masuk)}
              </p>
              {absensiHariIni?.waktu_masuk && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">Tercatat</span>
                </div>
              )}
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Pulang</p>
              <p className={`text-base font-bold ${absensiHariIni?.waktu_keluar ? 'text-blue-600' : 'text-gray-300'}`}>
                {formatJam(absensiHariIni?.waktu_keluar)}
              </p>
              {absensiHariIni?.waktu_keluar && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-500">Tercatat</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pesan notifikasi */}
        {pesan && (
          <div className={`rounded-2xl p-4 flex items-center gap-3 text-sm font-medium shadow-md ${
            pesan.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {pesan.type === 'success'
              ? <CheckCircle className="w-5 h-5 shrink-0" />
              : <AlertCircle className="w-5 h-5 shrink-0" />}
            {pesan.text}
          </div>
        )}

        {/* Tombol Absen */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAbsen('masuk')}
            disabled={loading || !!absensiHariIni?.waktu_masuk || !lokasi}
            className="bg-gradient-to-br from-green-500 to-emerald-600 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 text-white font-bold py-5 rounded-2xl flex flex-col items-center gap-2 shadow-lg shadow-green-200 disabled:shadow-none transition-all active:scale-95 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <LogIn className="w-7 h-7" />}
            <span className="text-sm">Absen Masuk</span>
          </button>
          <button
            onClick={() => handleAbsen('keluar')}
            disabled={loading || !absensiHariIni?.waktu_masuk || !!absensiHariIni?.waktu_keluar || !lokasi}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 text-white font-bold py-5 rounded-2xl flex flex-col items-center gap-2 shadow-lg shadow-blue-200 disabled:shadow-none transition-all active:scale-95 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <LogOut className="w-7 h-7" />}
            <span className="text-sm">Absen Keluar</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" />
          Absensi hanya dalam radius 20 meter dari kantor
        </p>

        {/* Kinerja Card */}
        <Link
          href="/dashboard/kinerja"
          className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between hover:shadow-lg transition-all active:scale-95 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Kinerja Bulan Ini</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {kinerjaRingkasan.jumlah} sesi · {formatRupiah(kinerjaRingkasan.total)}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
        </Link>

        {/* Keluar */}
        <button
          onClick={() => signOut()}
          className="w-full py-3 text-sm text-red-400 hover:text-red-600 font-medium transition-colors"
        >
          Keluar dari Akun
        </button>

      </div>
    </div>
  )
}
