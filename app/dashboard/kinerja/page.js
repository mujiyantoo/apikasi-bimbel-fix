'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, DollarSign, Loader2 } from 'lucide-react'

const bulanOptions = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
]

export default function KinerjaSayaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kinerja, setKinerja] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/absensi')
  }, [status])

  useEffect(() => {
    if (session) fetchKinerja()
  }, [session, filterBulan, filterTahun])

  const fetchKinerja = async () => {
    setLoading(true)
    try {
      // Cari pegawai_id berdasarkan nama yang sama
      const resPegawai = await fetch('/api/pegawai')
      const dataPegawai = await resPegawai.json()
      const list = Array.isArray(dataPegawai) ? dataPegawai : []

      const pegawaiSaya = list.find(p =>
        p.nama?.toLowerCase() === session.user.name?.toLowerCase()
      )

      if (!pegawaiSaya) {
        setKinerja([])
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      params.set('pengajar_id', pegawaiSaya.id)
      params.set('bulan', filterBulan)
      params.set('tahun', filterTahun)

      const res = await fetch(`/api/kinerja?${params}`)
      const data = await res.json()
      setKinerja(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setKinerja([])
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(angka)

  const totalGaji = kinerja.reduce((sum, item) => sum + (item.gaji || 0), 0)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/absensi')} className="gap-1 bg-white">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Kinerja Saya</h1>
              <p className="text-sm text-gray-500">{session?.user?.name}</p>
            </div>
          </div>
          <Button onClick={fetchKinerja} variant="outline" size="sm" className="bg-white">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label>Bulan</Label>
                <Select value={filterBulan.toString()} onValueChange={(v) => setFilterBulan(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {bulanOptions.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Tahun</Label>
                <Input type="number" value={filterTahun} onChange={(e) => setFilterTahun(parseInt(e.target.value))} />
              </div>
            </div>
          </CardHeader>
          <CardContent>

            {/* Info tarif */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                <p className="text-xs text-gray-500">SD Reguler</p>
                <p className="font-bold text-blue-700">Rp 24.000/sesi</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <p className="text-xs text-gray-500">SMP Reguler</p>
                <p className="font-bold text-green-700">Rp 25.000/sesi</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                <p className="text-xs text-gray-500">SMA Reguler</p>
                <p className="font-bold text-purple-700">Rp 22.000/sesi</p>
              </div>
            </div>

            {/* Total Gaji */}
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Total Gaji Bulan Ini:</span>
                <span className="text-2xl font-bold text-green-600 flex items-center">
                  <DollarSign className="w-6 h-6 mr-1" />
                  {formatRupiah(totalGaji)}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">{kinerja.length} sesi mengajar</p>
            </div>

            {/* Tabel */}
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              </div>
            ) : kinerja.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Belum ada data kinerja bulan ini</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Jam</th>
                      <th className="px-4 py-3 text-left">Durasi</th>
                      <th className="px-4 py-3 text-left">Jenjang</th>
                      <th className="px-4 py-3 text-left">Kategori</th>
                      <th className="px-4 py-3 text-left">Keterangan / Materi</th>
                      <th className="px-4 py-3 text-left">Gaji</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {kinerja.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(item.tanggal).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.jam_mulai} - {item.jam_selesai}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.menit_mengajar} menit
                        </td>
                        <td className="px-4 py-3">{item.jenjang}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${item.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.kategori}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 italic">
                          {item.keterangan || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">
                          {formatRupiah(item.gaji)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-50 font-bold">
                      <td colSpan={6} className="px-4 py-3 text-gray-700">Total</td>
                      <td className="px-4 py-3 text-green-600">{formatRupiah(totalGaji)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
