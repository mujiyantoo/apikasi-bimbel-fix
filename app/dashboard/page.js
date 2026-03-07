'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCog,
  Wallet,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  RefreshCw,
  GraduationCap,
  DollarSign,
  CheckCircle2,
  XCircle,
  MapPin,
  LogIn,
  LogOut
} from 'lucide-react'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalPegawai: 0,
    pembayaranPending: 0,
    totalPendapatan: 0,
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)
  const [absensiData, setAbsensiData] = useState([])
  const [jadwalHariIni, setJadwalHariIni] = useState([])
  const [loadingAbsensi, setLoadingAbsensi] = useState(true)

  const isAdminOrOwner = session?.user?.role === 'Admin' || session?.user?.role === 'Owner'

  // Nama hari Indonesia sesuai getDay()
  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAbsensiDashboard = async () => {
    setLoadingAbsensi(true)
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const date = String(now.getDate()).padStart(2, '0')
      const tanggalIni = `${year}-${month}-${date}`
      const hariIni = namaHari[now.getDay()]

      // Fetch pegawai, jadwal hari ini, absensi hari ini secara paralel
      const [pegawaiRes, jadwalRes, absensiRes] = await Promise.all([
        fetch('/api/pegawai'),
        fetch(`/api/jadwal?hari=${hariIni}`),
        fetch(`/api/absensi?tanggal=${tanggalIni}`)
      ])

      const [DataPegawaiRaw, jadwalList, absensiList] = await Promise.all([
        pegawaiRes.json(),
        jadwalRes.json(),
        absensiRes.json()
      ])

      // Normalisasi response getMongoConnection
      const pegawaiRaw = DataPegawaiRaw.success && DataPegawaiRaw.data ? DataPegawaiRaw.data : DataPegawaiRaw;
      const pegawaiFinal = Array.isArray(pegawaiRaw) ? pegawaiRaw : []

      // Filter jadwal yang tanggalnya = hari ini ATAU tidak punya tanggal spesifik
      const jadwalValid = Array.isArray(jadwalList)
        ? jadwalList.filter(j => !j.tanggal || j.tanggal === tanggalIni || j.tanggal === '')
        : []

      // Simpan di state context referensi semua pegawai, agar bisa di-map dengan absensi & jadwal.
      // Modifikasi state jadwalHariIni dihapus penggunaannya sebagai trigger tunggal, diganti dengan list pegawai final 
      setJadwalHariIni(jadwalValid)
      setAbsensiData(Array.isArray(absensiList) ? absensiList : [])

      // Simpan custom window property agar list pekerja tersedia untuk mapping
      window.__pegawaiList = pegawaiFinal;
    } catch (error) {
      console.error('Error fetching absensi dashboard:', error)
    } finally {
      setLoadingAbsensi(false)
    }
  }

  const handleRefreshAll = () => {
    fetchStats()
    fetchAbsensiDashboard()
  }

  useEffect(() => {
    fetchStats()
    fetchAbsensiDashboard()
    const handleFocus = () => { fetchStats(); fetchAbsensiDashboard() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const statCards = [
    {
      title: 'Total Siswa',
      value: stats.totalSiswa,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Pegawai',
      value: stats.totalPegawai,
      icon: UserCog,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Pembayaran Pending',
      value: stats.pembayaranPending,
      icon: Wallet,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'Total Pendapatan',
      value: formatCurrency(stats.totalPendapatan),
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Selamat Datang, {session?.user?.name || 'User'}!
          </h1>
          <p className="text-gray-500 mt-1">
            Dashboard Bimbel Bina Insan Nusantara Management System
          </p>
        </div>
        <Button
          onClick={handleRefreshAll}
          variant="outline"
          className="self-start"
          disabled={loading || loadingAbsensi}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${(loading || loadingAbsensi) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">Data terkini</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Aksi Cepat</CardTitle>
            <CardDescription>Akses menu yang sering digunakan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-12 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
              asChild
            >
              <a href="/dashboard/siswa">
                <Users className="w-5 h-5 mr-3" />
                Kelola Data Siswa
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
              asChild
            >
              <a href="/dashboard/pegawai">
                <UserCog className="w-5 h-5 mr-3" />
                Kelola Data Pegawai
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
              asChild
            >
              <a href="/dashboard/keuangan">
                <Wallet className="w-5 h-5 mr-3" />
                Kelola Pembayaran
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
              asChild
            >
              <a href="/dashboard/keuangan">
                <GraduationCap className="w-5 h-5 mr-3" />
                Lihat Laporan
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Aktivitas Terkini</CardTitle>
            <CardDescription>Log aktivitas sistem terbaru</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (stats.recentActivities && stats.recentActivities.length > 0) ? (
              <div className="space-y-4">
                {stats.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Belum ada aktivitas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Absensi Hari Ini — hanya untuk Admin & Owner */}
      {isAdminOrOwner && (() => {
        // Gabungkan antara pegawai yang PUNYA JADWAL hari ini dan yang SUDAH ABSEN hari ini
        const pegawaiHariIni = []
        const seen = new Set()

        // 1. Masukkan yang punya jadwal
        jadwalHariIni.forEach(j => {
          if (!seen.has(j.pengajar_id)) {
            seen.add(j.pengajar_id)
            pegawaiHariIni.push({
              id: j.pengajar_id,
              nama: j.pengajar_nama
            })
          }
        })

        // 2. Masukkan yang absen hari ini tapi mungkin tidak punya jadwal
        absensiData.forEach(a => {
          if (!seen.has(a.pegawai_id)) {
            seen.add(a.pegawai_id)
            pegawaiHariIni.push({
              id: a.pegawai_id,
              nama: a.pegawai_nama || 'Pegawai'
            })
          }
        })

        // Opsional: urutkan berdasarkan nama
        pegawaiHariIni.sort((a, b) => a.nama.localeCompare(b.nama))

        const jumlahHadir = pegawaiHariIni.filter(p => absensiData.some(a => a.pegawai_id === p.id)).length
        const jumlahBelum = pegawaiHariIni.length - jumlahHadir

        return (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Absensi Pegawai Hari Ini
                  </CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </CardDescription>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    ✅ {jumlahHadir} Hadir
                  </span>
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                    ❌ {jumlahBelum} Belum
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAbsensi ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pegawaiHariIni.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">Belum ada data absensi atau jadwal hari ini</p>
                  <p className="text-xs mt-1">Pegawai yang absen mandiri akan tampil di sini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Pegawai</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Jadwal Hari Ini</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Jam Masuk</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Jam Keluar</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Jarak</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pegawaiHariIni.map((p) => {
                        const absen = absensiData.find(a => a.pegawai_id === p.id)
                        const sudahMasuk = !!absen?.waktu_masuk
                        const sudahKeluar = !!absen?.waktu_keluar

                        // Cek kelas dari jadwal
                        const kelasList = jadwalHariIni
                          .filter(j => j.pengajar_id === p.id)
                          .map(j => `${j.kelas} (${j.waktu_mulai}–${j.waktu_selesai})`)
                          .join(', ')

                        return (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                                  {p.nama?.charAt(0) || '?'}
                                </div>
                                <span className="font-medium text-gray-900">{p.nama}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 text-xs">
                              {kelasList || <span className="italic text-gray-400">Tidak ada jadwal tercatat</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {sudahMasuk ? (
                                <span className="text-green-600 font-medium">
                                  {new Date(absen.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : <span className="text-gray-300">--:--</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {sudahKeluar ? (
                                <span className="text-blue-600 font-medium">
                                  {new Date(absen.waktu_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : <span className="text-gray-300">--:--</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {absen?.jarak_masuk ? (
                                <span className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                  <MapPin className="w-3 h-3" />{absen.jarak_masuk}m
                                </span>
                              ) : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {sudahKeluar ? (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> Selesai
                                </span>
                              ) : sudahMasuk ? (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  <LogIn className="w-3 h-3" /> Hadir
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                  <XCircle className="w-3 h-3" /> Belum Hadir
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Info Card */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Sistem Manajemen Bimbel</h3>
              <p className="text-blue-100 text-sm mt-1">
                Kelola semua data siswa, pegawai, dan keuangan dalam satu platform terintegrasi.
              </p>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 self-start">
              {session?.user?.role || 'User'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
