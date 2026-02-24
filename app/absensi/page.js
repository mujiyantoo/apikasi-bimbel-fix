'use client'

import { useState, useEffect } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { MapPin, LogIn, LogOut, CheckCircle, XCircle, Loader2, AlertCircle, TrendingUp, ChevronRight, Navigation } from 'lucide-react'

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
    if (!lokasi) { setPesan({ type: 'error', text: 'GPS belum aktif. Ketuk status GPS untuk refresh.' }); return }
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
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(angka)

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <Loader2 className="w-8 h-8 animate-spin text-white opacity-60" />
      </div>
    )
  }

  // ─── LOGIN PAGE ───────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
          .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
          .input-dark { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: white; border-radius: 12px; padding: 14px 16px; width: 100%; font-size: 14px; outline: none; transition: all 0.2s; }
          .input-dark::placeholder { color: rgba(255,255,255,0.3); }
          .input-dark:focus { border-color: rgba(99,102,241,0.6); background: rgba(255,255,255,0.1); }
          .btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: white; font-weight: 700; padding: 14px; border-radius: 12px; width: 100%; cursor: pointer; font-size: 15px; transition: all 0.2s; }
          .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
          .btn-primary:active { transform: scale(0.98); }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        `}</style>

        {/* Logo */}
        <div className="mb-10 text-center font-jakarta">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 glass">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Bina Insan</h1>
          <p className="text-slate-400 text-sm mt-1">Nusantara · Sistem Absensi</p>
        </div>

        {/* Form */}
        <div className="glass rounded-3xl p-7 w-full max-w-sm font-jakarta">
          <h2 className="text-xl font-bold text-white mb-1">Masuk</h2>
          <p className="text-slate-400 text-sm mb-6">Gunakan akun pegawai Anda</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-dark" placeholder="email@bimbel.com" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-dark" placeholder="••••••••" required />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 shrink-0" /> {loginError}
              </div>
            )}

            <div className="pt-2">
              <button type="submit" disabled={loginLoading} className="btn-primary flex items-center justify-center gap-2">
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loginLoading ? 'Masuk...' : 'Masuk'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ─── MAIN PAGE ────────────────────────────────────────────────
  const sudahMasuk = !!absensiHariIni?.waktu_masuk
  const sudahKeluar = !!absensiHariIni?.waktu_keluar

  return (
    <div className="min-h-screen font-jakarta" style={{ background: '#f1f5f9' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* Top bar gelap */}
      <div className="px-5 pt-8 pb-20 relative"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)' }}>

        {/* Tanggal + GPS */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-400 text-xs font-medium">{tanggalSekarang}</p>
          <button onClick={ambilLokasi}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              lokasi
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            <Navigation className="w-3 h-3" />
            {lokasi ? `±${lokasi.akurasi}m` : 'GPS Off'}
          </button>
        </div>

        {/* Jam besar */}
        <p className="text-white font-bold text-center tracking-tight"
          style={{ fontSize: '3.5rem', lineHeight: 1, letterSpacing: '-2px' }}>
          {jamSekarang}
        </p>
      </div>

      {/* Card utama - floating */}
      <div className="px-4 -mt-14 space-y-3 pb-8 max-w-sm mx-auto">

        {/* Profil card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header profil */}
          <div className="px-5 pt-5 pb-4 flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">{getInitials(session.user.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">{session.user.role}</p>
              <p className="text-white font-bold text-base truncate">{session.user.name}</p>
            </div>
          </div>

          {/* Jam masuk & keluar */}
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-5 py-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Datang</p>
              <p className={`text-xl font-bold ${sudahMasuk ? 'text-slate-800' : 'text-slate-200'}`}>
                {sudahMasuk ? formatJam(absensiHariIni.waktu_masuk) : '--:--'}
              </p>
              {sudahMasuk && <p className="text-xs text-emerald-500 font-medium mt-1">✓ Tercatat</p>}
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Pulang</p>
              <p className={`text-xl font-bold ${sudahKeluar ? 'text-slate-800' : 'text-slate-200'}`}>
                {sudahKeluar ? formatJam(absensiHariIni.waktu_keluar) : '--:--'}
              </p>
              {sudahKeluar && <p className="text-xs text-blue-500 font-medium mt-1">✓ Tercatat</p>}
            </div>
          </div>
        </div>

        {/* Pesan */}
        {pesan && (
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-medium ${
            pesan.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
          <button onClick={() => handleAbsen('masuk')}
            disabled={loading || sudahMasuk || !lokasi}
            className="rounded-2xl py-5 flex flex-col items-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: sudahMasuk || !lokasi
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: sudahMasuk || !lokasi ? '#94a3b8' : 'white',
              boxShadow: sudahMasuk || !lokasi ? 'none' : '0 8px 24px rgba(16,185,129,0.3)'
            }}>
            {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <LogIn className="w-7 h-7" />}
            {sudahMasuk ? 'Sudah Masuk' : 'Absen Masuk'}
          </button>

          <button onClick={() => handleAbsen('keluar')}
            disabled={loading || !sudahMasuk || sudahKeluar || !lokasi}
            className="rounded-2xl py-5 flex flex-col items-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: !sudahMasuk || sudahKeluar || !lokasi
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: !sudahMasuk || sudahKeluar || !lokasi ? '#94a3b8' : 'white',
              boxShadow: !sudahMasuk || sudahKeluar || !lokasi ? 'none' : '0 8px 24px rgba(99,102,241,0.3)'
            }}>
            {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <LogOut className="w-7 h-7" />}
            {sudahKeluar ? 'Sudah Keluar' : 'Absen Keluar'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" />
          Radius 20 meter dari kantor
        </p>

        {/* Kinerja Card */}
        <Link href="/dashboard/kinerja"
          className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between hover:shadow-lg transition-all active:scale-95 group block">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Kinerja Bulan Ini</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {kinerjaRingkasan.jumlah} sesi · {formatRupiah(kinerjaRingkasan.total)}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors" />
        </Link>

        {/* Keluar */}
        <button onClick={() => signOut()}
          className="w-full py-3 text-sm text-slate-400 hover:text-red-500 font-medium transition-colors">
          Keluar dari Akun
        </button>
      </div>
    </div>
  )
}
