'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus, Search, Wallet, Loader2, Receipt, CreditCard,
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign,
  ArrowLeft, CheckCircle, MessageCircle, RefreshCw,
  ShieldCheck, Sparkles, User, Calendar, Banknote, X
} from 'lucide-react'

const SPP_TARIF = { SD: 200000, SMP: 250000, SMA: 250000 }

const getSPPTarif = (kelas = '') => {
  const k = kelas.toUpperCase()
  if (k.includes('SD') || k.match(/^[1-6]/)) return SPP_TARIF.SD
  if (k.includes('SMP') || k.match(/^[7-9]/)) return SPP_TARIF.SMP
  if (k.includes('SMA') || k.match(/^1[0-2]/)) return SPP_TARIF.SMA
  return SPP_TARIF.SD
}

const bulanOptions = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
const tahunOptions = ['2023', '2024', '2025', '2026']

// === LOGIKA n-1: Tagihan terbit setelah tanggal 1, untuk bulan SEBELUMNYA ===
const _now = new Date()
const _bulanLaluDate = new Date(_now.getFullYear(), _now.getMonth() - 1, 1)
const bulanTagihan = bulanOptions[_bulanLaluDate.getMonth()]
const tahunTagihan = _bulanLaluDate.getFullYear().toString()
const tanggalSekarang = _now.getDate() // hari ke berapa bulan ini

// Untuk default form (tetap pakai bulan berjalan agar fleksibel input manual)
const bulanSekarang = bulanOptions[_now.getMonth()]
const tahunSekarang = _now.getFullYear().toString()

export default function KeuanganPage() {
  const [activeTab, setActiveTab] = useState('tagihan')
  const [pembayaran, setPembayaran] = useState([])
  const [siswaList, setSiswaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bayarItem, setBayarItem] = useState(null)
  const [showPaySuccess, setShowPaySuccess] = useState(false)
  const [lastPaidItem, setLastPaidItem] = useState(null)
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'Admin'

  const [formData, setFormData] = useState({
    siswaId: '', namaSiswa: '', jenis: 'SPP',
    bulan: bulanSekarang, tahun: tahunSekarang,
    jumlah: '', status: 'lunas', keterangan: ''
  })

  const fetchPembayaran = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/pembayaran?_t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setPembayaran(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pembayaran:', error)
      toast.error('Gagal memuat data')
      setPembayaran([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSiswa = async () => {
    try {
      const res = await fetch(`/api/siswa?_t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSiswaList(Array.isArray(data) ? data : [])
        return Array.isArray(data) ? data : []
      }
    } catch (error) {
      console.error('Error fetching siswa:', error)
    }
    return []
  }

  // =============================================
  // AUTO-GENERATE PENDING SPP BULANAN (SISTEM n-1)
  // ✅ Tagihan = bulan SEBELUMNYA (bukan bulan ini)
  // ✅ Hanya berjalan setelah tanggal 1 setiap bulan
  // ✅ Skip siswa Cuti
  // ✅ Hapus pending SPP siswa yang sedang Cuti
  // =============================================
  const generateSPPBulanan = async (siswaData, pembayaranData) => {
    setGenerating(true)
    try {
      // Pisahkan siswa aktif dan cuti
      const siswaAktif = siswaData.filter(s => (s.status || 'Aktif') === 'Aktif')
      const siswaCutiIds = new Set(
        siswaData.filter(s => s.status === 'Cuti').map(s => s.id)
      )

      // ✅ Hapus pending SPP bulan lalu untuk siswa yang Cuti (SELALU DIJALANKAN)
      const pendingHarusDihapus = pembayaranData.filter(p =>
        p.status === 'pending' &&
        p.jenis === 'SPP' &&
        p.bulan?.toLowerCase() === bulanTagihan.toLowerCase() &&
        p.tahun === tahunTagihan &&
        siswaCutiIds.has(p.siswaId)
      )

      if (pendingHarusDihapus.length > 0) {
        await Promise.all(
          pendingHarusDihapus.map(p =>
            fetch(`/api/pembayaran?id=${p.id}`, { method: 'DELETE' })
          )
        )
        toast.info(`${pendingHarusDihapus.length} tagihan SPP siswa Cuti dihapus otomatis`)
      }

      // ✅ Hapus pending SPP bulan berjalan (n) jika ada, karena aturan baru adalah n-1 (SELALU DIJALANKAN)
      // Contoh: Jika sekarang Maret, maka tagihan Maret belum boleh ada (terbit April nanti)
      const tagihanSalahBulan = pembayaranData.filter(p =>
        p.status === 'pending' &&
        p.jenis === 'SPP' &&
        p.bulan?.toLowerCase() === bulanSekarang.toLowerCase() &&
        p.tahun === tahunSekarang
      )

      if (tagihanSalahBulan.length > 0) {
        await Promise.all(
          tagihanSalahBulan.map(p =>
            fetch(`/api/pembayaran?id=${p.id}`, { method: 'DELETE' })
          )
        )
        toast.info(`${tagihanSalahBulan.length} tagihan bulan berjalan dihapus (menyesuaikan aturan n-1)`)
      }

      // ✅ Pembuatan tagihan n-1 HANYA berjalan jika sudah melewati tanggal 1 (artinya mulai tgl 2)
      if (tanggalSekarang <= 1) {
        if (pendingHarusDihapus.length > 0 || tagihanSalahBulan.length > 0) {
          await fetchPembayaran()
        }
        return // Stop untuk generate tagihan baru
      }

      // ✅ Buat pending hanya untuk siswa Aktif yang belum punya SPP bulan lalu (n-1)
      const sudahAdaSPP = new Set(
        pembayaranData
          .filter(p => p.jenis === 'SPP' && p.bulan?.toLowerCase() === bulanTagihan.toLowerCase() && p.tahun === tahunTagihan)
          .map(p => p.siswaId)
      )

      const siswaBlumAdaSPP = siswaAktif.filter(s => !sudahAdaSPP.has(s.id))

      if (siswaBlumAdaSPP.length > 0) {
        await Promise.all(
          siswaBlumAdaSPP.map(siswa =>
            fetch('/api/pembayaran', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                siswaId: siswa.id,
                namaSiswa: siswa.nama,
                jenis: 'SPP',
                bulan: bulanTagihan,
                tahun: tahunTagihan,
                jumlah: getSPPTarif(siswa.kelas),
                status: 'pending',
                keterangan: `SPP ${bulanTagihan} ${tahunTagihan} - ${siswa.kelas}`
              })
            })
          )
        )
        toast.info(`${siswaBlumAdaSPP.length} tagihan SPP ${bulanTagihan} ${tahunTagihan} dibuat otomatis`)
      }

      await fetchPembayaran()
    } catch (err) {
      console.error('Generate SPP error:', err)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      // ✅ LANGKAH 1: Hapus tagihan SPP pending bulan berjalan (n) dari server terlebih dahulu
      // Ini memastikan tidak ada tagihan bulan ini yang muncul di daftar pending
      try {
        const cleanupRes = await fetch('/api/pembayaran?action=cleanup', { method: 'DELETE' })
        const cleanupData = await cleanupRes.json()
        if (cleanupData.deletedCount > 0) {
          toast.info(`${cleanupData.deletedCount} tagihan ${cleanupData.bulan} (bulan ini) telah dihapus otomatis`)
        }
      } catch (e) {
        console.error('Cleanup error:', e)
      }

      // ✅ LANGKAH 2: Ambil data siswa dan pembayaran (sudah bersih)
      const [siswaData, pembayaranRes] = await Promise.all([
        fetchSiswa(),
        fetch(`/api/pembayaran?_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => [])
      ])
      const pembayaranData = Array.isArray(pembayaranRes) ? pembayaranRes : []
      setPembayaran(pembayaranData)
      setLoading(false)

      // ✅ LANGKAH 3: Generate tagihan bulan lalu (n-1) jika belum ada dan sudah lewat tgl 1
      if (siswaData.length > 0) {
        await generateSPPBulanan(siswaData, pembayaranData)
      }
    }
    init()
  }, [])

  const filteredData = useMemo(() => {
    let data = pembayaran
    // Set ID siswa yang sedang Cuti untuk filter
    const siswaCutiIds = new Set(siswaList.filter(s => s.status === 'Cuti').map(s => s.id))
    if (activeTab === 'spp') {
      data = pembayaran.filter(p => p.jenis !== 'Pengeluaran' && p.status === 'lunas')
    } else if (activeTab === 'tagihan') {
      // ✅ Hanya tampilkan tagihan pending untuk bulan (n-1), exclude siswa Cuti
      data = pembayaran.filter(p =>
        p.status === 'pending' &&
        p.bulan?.toLowerCase() === bulanTagihan.toLowerCase() &&
        p.tahun === tahunTagihan &&
        !siswaCutiIds.has(p.siswaId) // ❌ Hilangkan siswa Cuti
      )
    } else if (activeTab === 'pengeluaran') {
      data = pembayaran.filter(p => p.jenis === 'Pengeluaran')
    }
    return data.filter(p =>
      p.namaSiswa?.toLowerCase().includes(search.toLowerCase()) ||
      p.jenis?.toLowerCase().includes(search.toLowerCase())
    )
  }, [pembayaran, activeTab, search, siswaList])

  const stats = useMemo(() => {
    const siswaCutiIds = new Set(siswaList.filter(s => s.status === 'Cuti').map(s => s.id))
    const income = pembayaran
      .filter(p => p.jenis !== 'Pengeluaran' && p.status === 'lunas')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)
    const expense = pembayaran
      .filter(p => p.jenis === 'Pengeluaran')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)
    // ✅ Pending hanya untuk bulan (n-1) dan bukan siswa Cuti
    const pending = pembayaran
      .filter(p =>
        p.status === 'pending' &&
        p.bulan?.toLowerCase() === bulanTagihan.toLowerCase() &&
        p.tahun === tahunTagihan &&
        !siswaCutiIds.has(p.siswaId) // ❌ Exclude siswa Cuti
      )
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)
    return { income, expense, pending, net: income - expense }
  }, [pembayaran, siswaList])

  const handleOpenDialog = () => {
    setFormData({
      siswaId: '', namaSiswa: '',
      jenis: activeTab === 'pengeluaran' ? 'Pengeluaran' : 'SPP',
      bulan: bulanSekarang, tahun: tahunSekarang,
      jumlah: '', status: activeTab === 'tagihan' ? 'pending' : 'lunas',
      keterangan: ''
    })
    setBayarItem(null)
    setIsDialogOpen(true)
  }

  // ✅ Fungsi langsung proses pembayaran (tanpa dialog)
  const handleBayarLangsung = async (item) => {
    if (!confirm(`Konfirmasi pembayaran ${item.namaSiswa} sebesar ${formatCurrency(item.jumlah)}?`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/pembayaran?id=${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'lunas' })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')

      toast.success(`Pembayaran ${item.namaSiswa} berhasil!`)

      // ✅ Debug: log semua ID untuk troubleshooting
      console.log('=== DEBUG PAYMENT ===')
      console.log('item.id:', item.id)
      console.log('item._id:', item._id)
      console.log('item:', item)

      // ✅ Langsung update state lokal agar card langsung berubah
      setPembayaran(prev => {
        const updated = prev.map(p => {
          const match = (p.id === item.id || p._id === item.id || p.id === item._id || p._id === item._id)
          console.log(`Checking p.id=${p.id}, p._id=${p._id} vs item.id=${item.id}, item._id=${item._id} => ${match}`)
          return match ? { ...p, status: 'lunas' } : p
        })
        console.log('Pending count after update:', updated.filter(p => p.status === 'pending').length)
        return updated
      })

    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBayar = (item) => {
    setBayarItem(item)
    setFormData({
      siswaId: item.siswaId, namaSiswa: item.namaSiswa,
      jenis: item.jenis, bulan: item.bulan, tahun: item.tahun,
      jumlah: item.jumlah.toString(), status: 'lunas',
      keterangan: item.keterangan || ''
    })
    setIsDialogOpen(true)
  }

  const handleSiswaChange = (value) => {
    const selectedSiswa = siswaList.find(s => s.id === value)
    if (selectedSiswa) {
      setFormData({
        ...formData,
        siswaId: value,
        namaSiswa: selectedSiswa.nama,
        jumlah: formData.jenis === 'SPP' ? getSPPTarif(selectedSiswa.kelas).toString() : formData.jumlah
      })
    }
  }

  const handleJenisChange = (val) => {
    const siswa = siswaList.find(s => s.id === formData.siswaId)
    setFormData({
      ...formData, jenis: val,
      jumlah: val === 'SPP' && siswa ? getSPPTarif(siswa.kelas).toString() : formData.jumlah
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let res
      if (bayarItem?.id) {
        // Optimistic update: immediately move item from pending→lunas in UI
        setPembayaran(prev => prev.map(p =>
          p.id === bayarItem.id ? { ...p, status: 'lunas', jumlah: parseInt(formData.jumlah) } : p
        ))

        res = await fetch(`/api/pembayaran?id=${bayarItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'lunas', jumlah: parseInt(formData.jumlah) })
        })
      } else {
        const payload = {
          ...formData,
          jumlah: parseInt(formData.jumlah),
          siswaId: formData.jenis === 'Pengeluaran' ? 'EXPENSE' : formData.siswaId,
          namaSiswa: formData.jenis === 'Pengeluaran' ? formData.keterangan : formData.namaSiswa
        }
        res = await fetch('/api/pembayaran', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')

      if (bayarItem) {
        // Show beautiful success overlay
        setLastPaidItem(bayarItem)
        setIsDialogOpen(false)
        setBayarItem(null)
        setShowPaySuccess(true)
        setTimeout(() => setShowPaySuccess(false), 3000)
        toast.success(`✅ Pembayaran ${bayarItem.namaSiswa} berhasil dikonfirmasi!`, { duration: 4000 })
      } else {
        toast.success(formData.jenis === 'Pengeluaran' ? 'Pengeluaran berhasil dicatat' : 'Pembayaran berhasil ditambahkan')
        setIsDialogOpen(false)
        setBayarItem(null)
      }
      fetchPembayaran()
    } catch (error) {
      // Revert optimistic update on error
      if (bayarItem?.id) {
        setPembayaran(prev => prev.map(p =>
          p.id === bayarItem.id ? { ...p, status: 'pending' } : p
        ))
      }
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

  // ============================================================
  // KIRIM WA — ambil noWa dari siswaList berdasarkan siswaId
  // Format pesan bisa diubah sesuai kebutuhan
  // ============================================================
  const handleKirimWA = (item) => {
    const siswa = siswaList.find(s => s.id === item.siswaId)
    const noWa = (siswa?.noWa || siswa?.no_wa || siswa?.telepon || siswa?.nomorWa || '').replace(/[^0-9]/g, '')

    if (!noWa) {
      alert(`Nomor WA siswa "${item.namaSiswa}" belum tersedia di data siswa.`)
      return
    }

    // Nomor WA: ganti awalan 0 dengan 62
    const waNumber = noWa.startsWith('0') ? '62' + noWa.slice(1) : noWa

    // ======================================================
    // FORMAT SURAT TAGIHAN RESMI BIN BIMBEL
    // ======================================================
    const now = new Date()
    const tglSekarang = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const jamSekarang = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    const pesan = `*Bimbingan Belajar Bina Insan Nusantara*
*Informasi Administrasi Bimbel*
==========================
Yth. Bapak/Ibu Wali Murid,
Assalamualaikum Warahmatullahi Wabarakatuh,

Bapak/Ibu orang tua wali siswa BIN Bimbel, kami informasikan sehubungan telah berakhirnya kegiatan belajar mengajar untuk bulan ${item.bulan} ${item.tahun}.

Oleh karena itu, bagi yang masih ada kewajiban administrasi pendidikan dapat segera melunasinya dan bagi yang sudah kami mengucapkan terima kasih.

Berdasarkan data pada sistem keuangan hingga ${tglSekarang} Pukul: ${jamSekarang} WIB, kami sampaikan data tagihan hingga Bulan ${item.bulan} ${item.tahun}:

*Siswa:*
NIS      : ${siswa?.nis || '-'}
Nama  : ${item.namaSiswa}
Kelas   : ${siswa?.kelas || '-'}

Sebesar *${formatCurrency(item.jumlah)}*
----------------------------------
Pembayaran bisa dilakukan melalui transfer ke nomor rekening berikut:
- BRI           : 4454 0101 5235 508 - Nia Kurniawati
- BCA          : 6235 0636 91           - Nia Kurniawati
- BNI           : 1629 8263 12           - Nia Kurniawati
- BJB           : 0081 9531 7110 0    - Mujiyanto
- Mandiri    : 1770 0208 9202 9    - Mujiyanto
- Dana         : 0878 7107 9085       - Nia Kurniawati
- Gopay       : 0878 7107 9085       - Nia Kurniawati
- Shopee Pay : 0878 7107 9085    - Nia Kurniawati

Besar harapan kami Bapak/Ibu dapat menyelesaikan kewajiban administrasi. Terima kasih atas kerjasama dan perhatiannya.

*Informasi Hubungi:*
Nia Kurniawati. ST. : 0878 7107 9085
Slamet Irawan.         : 0895 4028 47670

Hormat kami,
Bag. Keuangan BIN Bimbel`


    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(pesan)}`
    window.open(url, '_blank')
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Keuangan</h1>
          </div>
          <p className="text-gray-500">Kelola arus kas dan laporan keuangan</p>
          {generating && (
            <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Menyiapkan tagihan SPP {bulanTagihan} {tahunTagihan}...
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Tagihan aktif: SPP <strong>{bulanTagihan} {tahunTagihan}</strong> (terbit otomatis setelah tgl 1)
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchPembayaran}
            disabled={loading}
            title="Refresh data tagihan"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {activeTab !== 'laporan' && (
            <Button onClick={handleOpenDialog} className={
              activeTab === 'pengeluaran'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            }>
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'pengeluaran' ? 'Catat Pengeluaran' : 'Tambah Pembayaran'}
            </Button>
          )}
        </div>

        {/* ====== DIALOG TAMBAH PEMBAYARAN / PENGELUARAN (biasa) ====== */}
        <Dialog open={isDialogOpen && !bayarItem} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); setBayarItem(null) } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {formData.jenis === 'Pengeluaran' ? 'Catat Pengeluaran' : 'Data Pembayaran'}
              </DialogTitle>
              <DialogDescription>
                {formData.jenis === 'Pengeluaran' ? 'Masukkan detail pengeluaran operasional' : 'Masukkan rincian pembayaran siswa'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.jenis !== 'Pengeluaran' ? (
                <div className="space-y-2">
                  <Label>Nama Siswa *</Label>
                  <Select value={formData.siswaId} onValueChange={handleSiswaChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                    <SelectContent>
                      {siswaList.filter(s => (s.status || 'Aktif') === 'Aktif').map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nama} - {s.kelas}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Keterangan Pengeluaran *</Label>
                  <Input
                    placeholder="Contoh: Bayar Listrik, Gaji Tutor, Pembelian Spidol"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Select value={formData.bulan} onValueChange={(val) => setFormData({ ...formData, bulan: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{bulanOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tahun</Label>
                  <Select value={formData.tahun} onValueChange={(val) => setFormData({ ...formData, tahun: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tahunOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={formData.jenis} onValueChange={handleJenisChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeTab === 'pengeluaran' ? (
                      <SelectItem value="Pengeluaran">Pengeluaran Operasional</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="SPP">SPP Bulanan</SelectItem>
                        <SelectItem value="Pendaftaran">Biaya Pendaftaran</SelectItem>
                        <SelectItem value="Buku">Buku & Modul</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {formData.jenis === 'SPP' && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                  Tarif: SD Rp 200.000 · SMP Rp 250.000 · SMA Rp 250.000
                </div>
              )}
              <div className="space-y-2">
                <Label>Jumlah (Rp) *</Label>
                <Input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunas">Lunas</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setBayarItem(null) }} className="flex-1">Batal</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ====== DIALOG KONFIRMASI BAYAR — BEAUTIFUL ====== */}
        <Dialog open={isDialogOpen && !!bayarItem} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); setBayarItem(null) } }}>
          <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-2xl">
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-6 pt-8 pb-6 text-white text-center">
              {/* Close button */}
              <button
                onClick={() => { setIsDialogOpen(false); setBayarItem(null) }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              {/* Icon */}
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/30 shadow-lg">
                    <ShieldCheck className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  </div>
                </div>
              </div>
              <h2 className="text-lg font-bold tracking-wide">Konfirmasi Pembayaran</h2>
              <p className="text-emerald-100 text-sm mt-1">Pastikan data berikut sudah benar</p>
            </div>

            {/* Info Card */}
            {bayarItem && (
              <div className="px-6 py-5 space-y-3 bg-white">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Nama Siswa</p>
                      <p className="font-semibold text-gray-800 truncate">{bayarItem.namaSiswa}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Periode</p>
                      <p className="font-semibold text-gray-800">{bayarItem.bulan} {bayarItem.tahun}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold border border-orange-200">SPP</span>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-200 flex items-center justify-center flex-shrink-0">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Pembayaran</p>
                      <p className="font-bold text-emerald-700 text-lg">{formatCurrency(bayarItem.jumlah)}</p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Klik <strong>Konfirmasi Bayar</strong> untuk menandai tagihan ini sebagai <span className="text-green-600 font-semibold">Lunas</span>
                </p>

                {/* Action Buttons */}
                <form onSubmit={handleSubmit} className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsDialogOpen(false); setBayarItem(null) }}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <X className="w-4 h-4 mr-1.5" /> Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md shadow-emerald-200 transition-all active:scale-95"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-1.5" /> Konfirmasi Bayar</>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card onClick={() => setActiveTab('spp')} className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'spp' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'}`}>
          <CardHeader>
            <div className="p-3 bg-blue-100 rounded-xl w-fit mb-2"><CreditCard className="w-6 h-6 text-blue-600" /></div>
            <CardTitle className="text-lg">Pemasukan SPP</CardTitle>
            <CardDescription>{formatCurrency(stats.income)}</CardDescription>
          </CardHeader>
        </Card>
        <Card onClick={() => setActiveTab('tagihan')} className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'tagihan' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:shadow-lg'}`}>
          <CardHeader>
            <div className="p-3 bg-emerald-100 rounded-xl w-fit mb-2"><Receipt className="w-6 h-6 text-emerald-600" /></div>
            <CardTitle className="text-lg">Tagihan Pending</CardTitle>
            <CardDescription>
              {formatCurrency(stats.pending)}
              <span className="ml-2 text-emerald-600 font-semibold">
                ({pembayaran.filter(p => {
                  const isCuti = siswaList.some(s => s.id === p.siswaId && s.status === 'Cuti')
                  return p.status === 'pending' &&
                    p.bulan?.toLowerCase() === bulanTagihan.toLowerCase() &&
                    p.tahun === tahunTagihan &&
                    !isCuti
                }).length} siswa)
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
        {userRole === 'Owner' && (
          <Card onClick={() => setActiveTab('laporan')} className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'laporan' ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:shadow-lg'}`}>
            <CardHeader>
              <div className="p-3 bg-purple-100 rounded-xl w-fit mb-2"><TrendingUp className="w-6 h-6 text-purple-600" /></div>
              <CardTitle className="text-lg">Saldo Bersih</CardTitle>
              <CardDescription>{formatCurrency(stats.net)}</CardDescription>
            </CardHeader>
          </Card>
        )}
        <Card onClick={() => setActiveTab('pengeluaran')} className={`border-0 shadow-md cursor-pointer transition-all ${activeTab === 'pengeluaran' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-lg'}`}>
          <CardHeader>
            <div className="p-3 bg-amber-100 rounded-xl w-fit mb-2"><Wallet className="w-6 h-6 text-amber-600" /></div>
            <CardTitle className="text-lg">Pengeluaran</CardTitle>
            <CardDescription>{formatCurrency(stats.expense)}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Info Tarif SPP */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'SPP SD', amount: SPP_TARIF.SD, color: 'blue' },
          { label: 'SPP SMP', amount: SPP_TARIF.SMP, color: 'indigo' },
          { label: 'SPP SMA', amount: SPP_TARIF.SMA, color: 'purple' },
        ].map(({ label, amount, color }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3 text-center`}>
            <p className={`text-xs font-bold text-${color}-600 mb-1`}>{label}</p>
            <p className={`text-sm font-bold text-${color}-800`}>{formatCurrency(amount)}</p>
            <p className="text-xs text-gray-400">per bulan</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      {activeTab === 'laporan' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Ringkasan Keuangan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3"><ArrowUpRight className="text-green-600" /><span className="font-medium text-green-900">Total Pemasukan</span></div>
                <span className="font-bold text-green-700">{formatCurrency(stats.income)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3"><ArrowDownRight className="text-red-600" /><span className="font-medium text-red-900">Total Pengeluaran</span></div>
                <span className="font-bold text-red-700">{formatCurrency(stats.expense)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3"><DollarSign className="text-blue-600" /><span className="font-medium text-blue-900">Saldo Akhir</span></div>
                <span className="font-bold text-blue-700">{formatCurrency(stats.net)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <CardTitle className="text-lg capitalize">
                  {activeTab === 'spp' ? 'Riwayat Pemasukan' :
                    activeTab === 'pengeluaran' ? 'Riwayat Pengeluaran' : 'Daftar Tagihan Pending'}
                </CardTitle>
                <CardDescription>{filteredData.length} data ditemukan</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="Cari data..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>{activeTab === 'pengeluaran' ? 'Keterangan' : 'Nama Siswa'}</TableHead>
                      {activeTab !== 'pengeluaran' && <TableHead>Kelas</TableHead>}
                      <TableHead>Jenis</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                      {activeTab === 'tagihan' && <TableHead>Kirim WA</TableHead>}
                      {activeTab === 'tagihan' && <TableHead>Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((p) => {
                      const siswa = siswaList.find(s => s.id === p.siswaId);
                      const kelasSiswa = siswa?.kelas || '-';
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-gray-500">
                            {new Date(p.createdAt).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="font-medium">{p.namaSiswa}</TableCell>
                          {activeTab !== 'pengeluaran' && (
                            <TableCell>{kelasSiswa}</TableCell>
                          )}
                          <TableCell>{p.jenis}</TableCell>
                          <TableCell>{p.bulan} {p.tahun}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(p.jumlah)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={p.status === 'lunas' ? 'default' : 'secondary'}
                              className={p.status === 'lunas' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-100 text-orange-700'}
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          {activeTab === 'tagihan' && (
                            <TableCell>
                              <button
                                onClick={() => handleKirimWA(p)}
                                title={`Kirim tagihan ke WA ${p.namaSiswa}`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 transition-all shadow-sm"
                              >
                                <MessageCircle className="w-4 h-4 text-white" />
                              </button>
                            </TableCell>
                          )}
                          {activeTab === 'tagihan' && (
                            <TableCell>
                              <Button size="sm" onClick={() => handleBayar(p)} className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" /> Bayar
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ====== PAYMENT SUCCESS OVERLAY ====== */}
      {showPaySuccess && lastPaidItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.3s ease' }}
          onClick={() => setShowPaySuccess(false)}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.7) } to { opacity: 1; transform: scale(1) } }
            @keyframes checkDraw { from { stroke-dashoffset: 60 } to { stroke-dashoffset: 0 } }
            @keyframes ringPulse { 0%,100% { transform: scale(1); opacity:0.6 } 50% { transform: scale(1.15); opacity:0.2 } }
          `}</style>
          <div
            className="bg-white rounded-3xl shadow-2xl px-10 py-8 text-center max-w-xs w-full mx-4"
            style={{ animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Animated ring + check */}
            <div className="flex justify-center mb-4 relative">
              <div
                className="absolute w-24 h-24 rounded-full bg-emerald-100"
                style={{ animation: 'ringPulse 1.5s ease-in-out infinite' }}
              />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                <svg viewBox="0 0 40 40" className="w-10 h-10">
                  <polyline
                    points="8,20 16,28 32,12"
                    fill="none"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="60"
                    style={{ animation: 'checkDraw 0.5s ease 0.2s forwards', strokeDashoffset: 60 }}
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">Pembayaran Berhasil!</h3>
            <p className="text-gray-500 text-sm mb-3">{lastPaidItem.namaSiswa}</p>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-emerald-700 text-base">{formatCurrency(lastPaidItem.jumlah)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">SPP {lastPaidItem.bulan} {lastPaidItem.tahun} · <span className="text-green-600 font-medium">Lunas ✓</span></p>
            <p className="text-xs text-gray-300 mt-3">Klik di mana saja untuk menutup</p>
          </div>
        </div>
      )}
    </div>
  )
}
