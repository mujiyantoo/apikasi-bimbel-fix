'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, ChevronUp, RefreshCw, FileDown, DollarSign, Clock, Calendar } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function PayrollPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'Admin'

  const [payroll, setPayroll] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [expandedRows, setExpandedRows] = useState({})

  const bulanOptions = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ]

  const fetchPayroll = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll?bulan=${filterBulan}&tahun=${filterTahun}`)
      const data = await res.json()
      setPayroll(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayroll()
  }, [filterBulan, filterTahun])

  const toggleExpand = (pengajarId) => {
    setExpandedRows(prev => ({
      ...prev,
      [pengajarId]: !prev[pengajarId]
    }))
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka)
  }

  const formatJam = (menit) => {
    const jam = Math.floor(menit / 60)
    const sisa = menit % 60
    return `${jam}j ${sisa}m`
  }

  const totalKeseluruhan = payroll.reduce((sum, item) => sum + item.total_gaji, 0)
  const totalJamKeseluruhan = payroll.reduce((sum, item) => sum + item.total_jam, 0)
  const totalSesiKeseluruhan = payroll.reduce((sum, item) => sum + item.jumlah_sesi, 0)

  const exportToExcel = () => {
    const dataToExport = []
    
    payroll.forEach(item => {
      dataToExport.push({
        'Pengajar': item.pengajar_nama,
        'Total Gaji': item.total_gaji,
        'Total Jam': formatJam(item.total_jam),
        'Jumlah Sesi': item.jumlah_sesi
      })
      
      item.rincian.forEach(r => {
        dataToExport.push({
          'Pengajar': `  → ${new Date(r.tanggal).toLocaleDateString('id-ID')}`,
          'Total Gaji': r.gaji,
          'Total Jam': `${r.jam_mulai}-${r.jam_selesai}`,
          'Jumlah Sesi': `${r.jenjang} ${r.kategori}`
        })
      })
    })

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll')
    
    const fileName = `Payroll_${bulanOptions.find(b => b.value === filterBulan)?.label}_${filterTahun}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text('LAPORAN PAYROLL PENGAJAR', 14, 15)
    doc.setFontSize(10)
    doc.text(`Periode: ${bulanOptions.find(b => b.value === filterBulan)?.label} ${filterTahun}`, 14, 22)

    const tableData = payroll.map(item => [
      item.pengajar_nama,
      formatRupiah(item.total_gaji),
      formatJam(item.total_jam),
      item.jumlah_sesi + ' sesi'
    ])

    doc.autoTable({
      startY: 28,
      head: [['Pengajar', 'Total Gaji', 'Total Jam', 'Jumlah Sesi']],
      body: tableData,
      foot: [['TOTAL KESELURUHAN', formatRupiah(totalKeseluruhan), formatJam(totalJamKeseluruhan), totalSesiKeseluruhan + ' sesi']],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    })

    const fileName = `Payroll_${bulanOptions.find(b => b.value === filterBulan)?.label}_${filterTahun}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Pengajar</h1>
          <p className="text-sm text-gray-500">Ringkasan gaji berdasarkan data kinerja</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPayroll} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Gaji Bulan Ini</p>
                <p className="text-2xl font-bold mt-1">{formatRupiah(totalKeseluruhan)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Jam Mengajar</p>
                <p className="text-2xl font-bold mt-1">{formatJam(totalJamKeseluruhan)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Sesi Mengajar</p>
                <p className="text-2xl font-bold mt-1">{totalSesiKeseluruhan} sesi</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label>Bulan</Label>
              <Select value={filterBulan.toString()} onValueChange={(v) => setFilterBulan(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bulanOptions.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Tahun</Label>
              <Input type="number" value={filterTahun} onChange={(e) => setFilterTahun(parseInt(e.target.value))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToExcel} variant="outline">
                <FileDown className="w-4 h-4 mr-1" /> Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <FileDown className="w-4 h-4 mr-1" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : payroll.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Belum ada data payroll untuk periode ini</div>
          ) : (
            <div className="space-y-2">
              {payroll.map((item) => (
                <div key={item.pengajar_id} className="border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleExpand(item.pengajar_id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Button variant="ghost" size="sm" className="p-0 h-auto">
                        {expandedRows[item.pengajar_id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </Button>
                      <div>
                        <p className="font-semibold text-gray-900">{item.pengajar_nama}</p>
                        <p className="text-sm text-gray-500">{item.jumlah_sesi} sesi • {formatJam(item.total_jam)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{formatRupiah(item.total_gaji)}</p>
                    </div>
                  </div>

                  {expandedRows[item.pengajar_id] && (
                    <div className="p-4 bg-white border-t">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs">Tanggal</th>
                            <th className="px-3 py-2 text-left text-xs">Jam</th>
                            <th className="px-3 py-2 text-left text-xs">Durasi</th>
                            <th className="px-3 py-2 text-left text-xs">Jenjang</th>
                            <th className="px-3 py-2 text-left text-xs">Kategori</th>
                            <th className="px-3 py-2 text-right text-xs">Gaji</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {item.rincian.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                              <td className="px-3 py-2">{r.jam_mulai} - {r.jam_selesai}</td>
                              <td className="px-3 py-2">{r.menit_mengajar} menit</td>
                              <td className="px-3 py-2">{r.jenjang}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${r.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {r.kategori}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-green-600">{formatRupiah(r.gaji)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
