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
  DollarSign
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

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/stats')

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
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
            Dashboard ringkasan Bimbel Management System
          </p>
        </div>
        <Button
          onClick={fetchStats}
          variant="outline"
          className="self-start"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
