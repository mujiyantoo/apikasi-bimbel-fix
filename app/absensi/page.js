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

  const sudahMasuk = !!absensiHariIni?.waktu_masuk
  const sudahKeluar = !!absensiHariIni?.waktu_keluar

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
          * { font-family: 'Plus Jakarta Sans', sans-serif; }
          .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
          .input-dark { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: white; border-radius: 12px; padding: 14px 16px; width: 100%; font-size: 14px; outline: none; transition: all 0.2s; box-sizing: border-box; }
          .input-dark::placeholder { color: rgba(255,255,255,0.3); }
          .input-dark:focus { border-color: rgba(99,102,241,0.6); background: rgba(255,255,255,0.1); }
          .btn-login { background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: white; font-weight: 700; padding: 14px; border-radius: 12px; width: 100%; cursor: pointer; font-size: 15px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .btn-login:hover { opacity: 0.9; }
          .btn-login:active { transform: scale(0.98); }
          .btn-login:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>

        <div className="mb-8 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 glass">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Bina Insan</h1>
          <p className="text-slate-400 text-sm mt-1">Nusantara · Sistem Absensi</p>
        </div>

        <div className="glass rounded-3xl p-7 w-full max-w-sm">
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
              <div className="flex items-center gap-2 text-red-400 text-sm px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <XCircle className="w-4 h-4 shrink-0" /> {loginError}
              </div>
            )}
            <div className="pt-2">
              <button type="submit" disabled={loginLoading} className="btn-login">
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
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
        .absen-btn { border: none; cursor: pointer; border-radius: 20px; padding: 20px 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; transition: all 0.2s; width: 100%; }
        .absen-btn:active { transform: scale(0.97); }
        .absen-btn:disabled { cursor: not-allowed; opacity: 1; }
      `}</style>

      {/* HEADER - warna gelap, tidak ada trick negative margin */}
      <div style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)', padding: '36px 20px 24px' }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>

          {/* Baris tanggal & GPS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{tanggalSekarang}</p>
            <button onClick={ambilLokasi} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
              background: lokasi ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: lokasi ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
              color: lokasi ? '#34d399' : '#f87171'
            }}>
              <Navigation size={11} />
              {lokasi ? `±${lokasi.akurasi}m` : 'GPS Off · Tap'}
            </button>
          </div>

          {/* Jam besar */}
          <p style={{ color: 'white', fontWeight: 800, fontSize: 52, textAlign: 'center', letterSpacing: -3, margin: 0, lineHeight: 1 }}>
            {jamSekarang}
          </p>
        </div>
      </div>

      {/* CONTENT - normal flow, tidak overlap */}
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '16px 16px 40px' }}>

        {/* Profil + Jam Masuk/Keluar */}
        <div style={{ background: 'white', borderRadius: 24, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 12 }}>
          {/* Header profil */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, background: 'rgba(255,255,255,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>{getInitials(session.user.name)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 2px' }}>{session.user.role}</p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.user.name}</p>
            </div>
          </div>

          {/* Waktu masuk & keluar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ padding: '16px 20px', borderRight: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 6px' }}>Datang</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: sudahMasuk ? '#1e293b' : '#e2e8f0', margin: '0 0 4px' }}>
                {sudahMasuk ? formatJam(absensiHariIni.waktu_masuk) : '--:--'}
              </p>
              {sudahMasuk && <p style={{ fontSize: 11, color: '#10b981', fontWeight: 600, margin: 0 }}>✓ Tercatat</p>}
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 6px' }}>Pulang</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: sudahKeluar ? '#1e293b' : '#e2e8f0', margin: '0 0 4px' }}>
                {sudahKeluar ? formatJam(absensiHariIni.waktu_keluar) : '--:--'}
              </p>
              {sudahKeluar && <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, margin: 0 }}>✓ Tercatat</p>}
            </div>
          </div>
        </div>

        {/* Pesan */}
        {pesan && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderRadius: 16, fontSize: 13, fontWeight: 500, marginBottom: 12,
            background: pesan.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: pesan.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
            color: pesan.type === 'success' ? '#15803d' : '#dc2626'
          }}>
            {pesan.type === 'success'
              ? <CheckCircle size={18} style={{ flexShrink: 0 }} />
              : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
            {pesan.text}
          </div>
        )}

        {/* Tombol Absen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <button
            className="absen-btn"
            onClick={() => handleAbsen('masuk')}
            disabled={loading || sudahMasuk || !lokasi}
            style={{
              background: sudahMasuk || !lokasi ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #059669)',
              color: sudahMasuk || !lokasi ? '#94a3b8' : 'white',
              boxShadow: sudahMasuk || !lokasi ? 'none' : '0 8px 20px rgba(16,185,129,0.3)'
            }}>
            {loading ? <Loader2 size={28} className="animate-spin" /> : <LogIn size={28} />}
            {sudahMasuk ? 'Sudah Masuk' : 'Absen Masuk'}
          </button>

          <button
            className="absen-btn"
            onClick={() => handleAbsen('keluar')}
            disabled={loading || !sudahMasuk || sudahKeluar || !lokasi}
            style={{
              background: !sudahMasuk || sudahKeluar || !lokasi ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: !sudahMasuk || sudahKeluar || !lokasi ? '#94a3b8' : 'white',
              boxShadow: !sudahMasuk || sudahKeluar || !lokasi ? 'none' : '0 8px 20px rgba(99,102,241,0.3)'
            }}>
            {loading ? <Loader2 size={28} className="animate-spin" /> : <LogOut size={28} />}
            {sudahKeluar ? 'Sudah Keluar' : 'Absen Keluar'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '0 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <MapPin size={11} /> Radius 20 meter dari kantor
        </p>

        {/* Kinerja Card */}
        <Link href="/dashboard/kinerja" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'white', borderRadius: 20, padding: '14px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textDecoration: 'none', marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="#7c3aed" />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, margin: '0 0 2px' }}>Kinerja Bulan Ini</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                {kinerjaRingkasan.jumlah} sesi · {formatRupiah(kinerjaRingkasan.total)}
              </p>
            </div>
          </div>
          <ChevronRight size={18} color="#cbd5e1" />
        </Link>

        {/* Keluar */}
        <button onClick={() => signOut()} style={{
          width: '100%', padding: '12px', background: 'none', border: 'none',
          color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer'
        }}>
          Keluar dari Akun
        </button>

      </div>
    </div>
  )
}
