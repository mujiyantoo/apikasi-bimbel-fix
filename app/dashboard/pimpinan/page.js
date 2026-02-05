'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  UserCog,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  DollarSign,
  Target,
  CheckCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function PimpinanPage() {
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
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error:', error)
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

  // Sample data for charts
  const monthlyData = [
    { name: 'Jan', siswa: 12, pendapatan: 5000000 },
    { name: 'Feb', siswa: 15, pendapatan: 6200000 },
    { name: 'Mar', siswa: 18, pendapatan: 7500000 },
    { name: 'Apr', siswa: 22, pendapatan: 8800000 },
    { name: 'Mei', siswa: 25, pendapatan: 9500000 },
    { name: 'Jun', siswa: stats.totalSiswa || 28, pendapatan: stats.totalPendapatan || 10000000 },
  ]

  const kelasDistribution = [
    { name: 'SMP', value: 35 },
    { name: 'SMA IPA', value: 40 },
    { name: 'SMA IPS', value: 25 },
  ]

  const pembayaranStats = [
    { name: 'Lunas', value: 75 },
    { name: 'Pending', value: stats.pembayaranPending || 15 },
    { name: 'Terlambat', value: 10 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard Pimpinan</h1>
          <p className="text-gray-500 mt-1">Ringkasan dan analisis data bimbingan belajar</p>
        </div>
        <Button
          onClick={fetchStats}
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Siswa</p>
                <p className="text-3xl font-bold mt-1">{loading ? '...' : stats.totalSiswa}</p>
                <div className="flex items-center mt-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  <span>+12% dari bulan lalu</span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Pegawai</p>
                <p className="text-3xl font-bold mt-1">{loading ? '...' : stats.totalPegawai}</p>
                <div className="flex items-center mt-2 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Aktif semua</span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <UserCog className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Pembayaran Pending</p>
                <p className="text-3xl font-bold mt-1">{loading ? '...' : stats.pembayaranPending}</p>
                <div className="flex items-center mt-2 text-sm">
                  <Target className="w-4 h-4 mr-1" />
                  <span>Perlu ditindak</span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Wallet className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Pendapatan</p>
                <p className="text-2xl font-bold mt-1">{loading ? '...' : formatCurrency(stats.totalPendapatan)}</p>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+8% growth</span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Pendapatan */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Trend Pendapatan Bulanan
            </CardTitle>
            <CardDescription>Perkembangan pendapatan 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="pendapatan" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend Siswa */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Pertumbuhan Jumlah Siswa
            </CardTitle>
            <CardDescription>Perkembangan jumlah siswa 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="siswa" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribusi Kelas */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              Distribusi Siswa per Jenjang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={kelasDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {kelasDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {kelasDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Pembayaran */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600" />
              Status Pembayaran SPP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pembayaranStats.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-gray-500">{item.value}%</span>
                  </div>
                  <Progress 
                    value={item.value} 
                    className="h-3"
                    style={{ 
                      backgroundColor: '#f3f4f6',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Target Koleksi Bulan Ini</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">85% tercapai</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Info */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ringkasan Eksekutif</h3>
              <p className="text-indigo-100 text-sm mt-1">
                Bimbel berjalan dengan baik. Pertumbuhan siswa positif dan tingkat koleksi pembayaran di atas target.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.totalSiswa + stats.totalPegawai}</p>
                <p className="text-xs text-indigo-200">Total Anggota</p>
              </div>
              <div className="w-px bg-white/30" />
              <div className="text-center">
                <p className="text-3xl font-bold">85%</p>
                <p className="text-xs text-indigo-200">Target Tercapai</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
