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
  ArrowLeft, CheckCircle, MessageCircle
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
      const res = await fetch('/api/pembayaran')
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
      const res = await fetch('/api/siswa')
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
    // ✅ Hanya generate jika sudah melewati tanggal 1 (artinya mulai tanggal 2 ke atas)
    if (tanggalSekarang <= 1) {
      return
    }

    setGenerating(true)
    try {
      // Pisahkan siswa aktif dan cuti
      const siswaAktif = siswaData.filter(s => (s.status || 'Aktif') === 'Aktif')
      const siswaCutiIds = new Set(
        siswaData.filter(s => s.status === 'Cuti').map(s => s.id)
      )

      // ✅ Hapus pending SPP bulan lalu untuk siswa yang Cuti
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

      // ✅ Hapus pending SPP bulan berjalan (n) jika ada, karena aturan baru adalah n-1
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
      const [siswaData, pembayaranRes] = await Promise.all([
        fetchSiswa(),
        fetch('/api/pembayaran').then(r => r.json()).catch(() => [])
      ])
      const pembayaranData = Array.isArray(pembayaranRes) ? pembayaranRes : []
      setPembayaran(pembayaranData)
      setLoading(false)
      if (siswaData.length > 0) {
        await generateSPPBulanan(siswaData, pembayaranData)
      }
    }
    init()
  }, [])

  const filteredData = useMemo(() => {
    let data = pembayaran
    if (activeTab === 'spp') {
      data = pembayaran.filter(p => p.jenis !== 'Pengeluaran' && p.status === 'lunas')
    } else if (activeTab === 'tagihan') {
      data = pembayaran.filter(p => p.status === 'pending')
    } else if (activeTab === 'pengeluaran') {
      data = pembayaran.filter(p => p.jenis === 'Pengeluaran')
    }
    return data.filter(p =>
      p.namaSiswa?.toLowerCase().includes(search.toLowerCase()) ||
      p.jenis?.toLowerCase().includes(search.toLowerCase())
    )
  }, [pembayaran, activeTab, search])

  const stats = useMemo(() => {
    const income = pembayaran
      .filter(p => p.jenis !== 'Pengeluaran' && p.status === 'lunas')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)
    const expense = pembayaran
      .filter(p => p.jenis === 'Pengeluaran')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)
    const pending = pembayaran
      .filter(p => p.status === 'pending')
      .reduce((acc, curr) => acc + (curr.jumlah || 0), 0)
    return { income, expense, pending, net: income - expense }
  }, [pembayaran])

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
      toast.success(bayarItem ? 'Pembayaran berhasil dikonfirmasi!' : formData.jenis === 'Pengeluaran' ? 'Pengeluaran dicatat' : 'Pembayaran berhasil')
      setIsDialogOpen(false)
      setBayarItem(null)
      fetchPembayaran()
    } catch (error) {
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

Oleh karena itu, bagi yang masih ada kewajiban administrasi pendidikan dapat segera melunasinya dan bagi yang sudah kami mengucapkan terima kasih🙏🏼.

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

Besar harapan kami Bapak/Ibu dapat menyelesaikan kewajiban administrasi. Terima kasih atas kerjasama dan perhatiannya 😊.

*Informasi Hubungi:*
☎️ Nia Kurniawati. ST. : 0878 7107 9085
☎️ Slamet Irawan.         : 0895 4028 47670

Hormat kami,
Bag. Keuangan BIN Bimbel 😇`


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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {bayarItem ? `Konfirmasi Pembayaran — ${bayarItem.namaSiswa}` :
                  formData.jenis === 'Pengeluaran' ? 'Catat Pengeluaran' : 'Data Pembayaran'}
              </DialogTitle>
              <DialogDescription>
                {bayarItem ? `SPP ${bayarItem.bulan} ${bayarItem.tahun}` :
                  formData.jenis === 'Pengeluaran' ? 'Masukkan detail pengeluaran operasional' : 'Masukkan rincian pembayaran siswa'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {bayarItem ? (
                <div className="bg-blue-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Siswa</span><span className="font-semibold">{bayarItem.namaSiswa}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Periode</span><span className="font-semibold">{bayarItem.bulan} {bayarItem.tahun}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Jumlah</span><span className="font-bold text-blue-700">{formatCurrency(bayarItem.jumlah)}</span></div>
                </div>
              ) : (
                <>
                  {formData.jenis !== 'Pengeluaran' ? (
                    <div className="space-y-2">
                      <Label>Nama Siswa *</Label>
                      <Select value={formData.siswaId} onValueChange={handleSiswaChange}>
                        <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                        <SelectContent>
                          {/* ✅ Hanya tampilkan siswa Aktif di dropdown */}
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
                </>
              )}
              <div className="space-y-2">
                <Label>Jumlah (Rp) *</Label>
                <Input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                  required
                  readOnly={!!bayarItem}
                  className={bayarItem ? 'bg-gray-50' : ''}
                />
              </div>
              {!bayarItem && (
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
              )}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setBayarItem(null) }} className="flex-1">Batal</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : bayarItem ? '✓ Konfirmasi Bayar' : 'Simpan'}
                </Button>
              </div>
            </form>
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
                ({pembayaran.filter(p => p.status === 'pending').length} siswa)
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
                      <TableHead>Jenis</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                      {activeTab === 'tagihan' && <TableHead>Kirim WA</TableHead>}
                      {activeTab === 'tagihan' && <TableHead>Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-gray-500">
                          {new Date(p.createdAt).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="font-medium">{p.namaSiswa}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
