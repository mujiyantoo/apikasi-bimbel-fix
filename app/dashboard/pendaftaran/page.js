'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Search, Trash2, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function PendaftaranPage() {
  const [pendaftaran, setPendaftaran] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchPendaftaran = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const res = await fetch(`/api/pendaftaran?${params}`)
      const data = await res.json()
      setPendaftaran(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendaftaran()
  }, [filterStatus])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchPendaftaran()
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      await fetch('/api/pendaftaran', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      fetchPendaftaran()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data pendaftaran ini?')) return
    try {
      await fetch(`/api/pendaftaran?id=${id}`, { method: 'DELETE' })
      fetchPendaftaran()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'Diterima') return <Badge className="bg-green-100 text-green-700">✅ Diterima</Badge>
    if (status === 'Ditolak') return <Badge className="bg-red-100 text-red-700">❌ Ditolak</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700">⏳ Baru</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Pendaftaran</h1>
            <p className="text-sm text-gray-500">Kelola data calon siswa yang mendaftar</p>
          </div>
        </div>
        <Button onClick={fetchPendaftaran} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Cari nama atau telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="w-4 h-4" />
          </Button>
        </form>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="Baru">Baru</option>
          <option value="Diterima">Diterima</option>
          <option value="Ditolak">Ditolak</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{pendaftaran.filter(p => p.status === 'Baru').length}</p>
          <p className="text-sm text-yellow-700">Pendaftar Baru</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <p className="text-2xl font-bold text-green-600">{pendaftaran.filter(p => p.status === 'Diterima').length}</p>
          <p className="text-sm text-green-700">Diterima</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
          <p className="text-2xl font-bold text-red-600">{pendaftaran.filter(p => p.status === 'Ditolak').length}</p>
          <p className="text-sm text-red-700">Ditolak</p>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b">
          <p className="font-semibold text-gray-700">{pendaftaran.length} total pendaftar</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : pendaftaran.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada data pendaftaran</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kelas</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telepon</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Program</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendaftaran.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.nama_lengkap}</td>
                    <td className="px-4 py-3">{item.kelas}</td>
                    <td className="px-4 py-3">{item.telepon}</td>
                    <td className="px-4 py-3">{item.program}</td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleUpdateStatus(item.id, 'Diterima')}
                          title="Terima"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-600 hover:bg-yellow-50"
                          onClick={() => handleUpdateStatus(item.id, 'Baru')}
                          title="Set Baru"
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleUpdateStatus(item.id, 'Ditolak')}
                          title="Tolak"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-gray-600 hover:bg-red-50"
                          onClick={() => handleDelete(item.id)}
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
