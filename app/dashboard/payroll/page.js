'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, ChevronUp, RefreshCw, FileDown, DollarSign, Clock, Calendar } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function PayrollPage() {
  const { data: session } = useSession()

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
      const res = await fetch('/api/payroll?bulan=' + filterBulan + '&tahun=' + filterTahun)
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
    setExpandedRows(prev => ({ ...prev, [pengajarId]: !prev[pengajarId] }))
  }

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(angka)

  const formatJam = (menit) => {
    const jam = Math.floor(menit / 60)
    const sisa = menit % 60
    return jam + 'j ' + sisa + 'm'
  }

  const totalKeseluruhan = payroll.reduce((sum, item) => sum + item.total_gaji, 0)
  const totalJamKeseluruhan = payroll.reduce((sum, item) => sum + item.total_jam, 0)
  const totalSesiKeseluruhan = payroll.reduce((sum, item) => sum + item.jumlah_sesi, 0)
  const namaBulan = bulanOptions.find(b => b.value === filterBulan)?.label

  const exportToExcel = () => {
  const dataToExport = []
  payroll.forEach(item => {
    dataToExport.push({
      'Pengajar': item.pengajar_nama,
      'Tanggal': '',
      'Jam': '',
      'Durasi': '',
      'Jenjang': '',
      'Kategori': '',
      'Keterangan': '',
      'Gaji': item.total_gaji,
    })
    item.rincian.forEach(r => {
      dataToExport.push({
        'Pengajar': '',
        'Tanggal': new Date(r.tanggal).toLocaleDateString('id-ID'),
        'Jam': r.jam_mulai + ' - ' + r.jam_selesai,
        'Durasi': r.menit_mengajar + ' mnt',
        'Jenjang': r.jenjang,
        'Kategori': r.kategori,
        'Keterangan': r.keterangan || '-',
        'Gaji': r.gaji,
      })
    })
  })
  const ws = XLSX.utils.json_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll')
  XLSX.writeFile(wb, 'Payroll_' + namaBulan + '_' + filterTahun + '.xlsx')
}
  const exportToPDF = () => {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('LAPORAN PAYROLL PENGAJAR BIN BIMBEL CABANG PANUMBANGAN', 14, 15)
  doc.setFontSize(10)
  doc.text('Periode: ' + namaBulan + ' ' + filterTahun, 14, 22)

  const tableData = []
  payroll.forEach(item => {
    tableData.push([
      { content: item.pengajar_nama, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [239, 246, 255] } }
    ])
    item.rincian.forEach(r => {
      tableData.push([
        new Date(r.tanggal).toLocaleDateString('id-ID'),
        r.jam_mulai + ' - ' + r.jam_selesai,
        r.menit_mengajar + ' mnt',
        r.jenjang,
        r.kategori,
        r.keterangan || '-',
        formatRupiah(r.gaji),
      ])
    })
    tableData.push([
      { content: 'Subtotal ' + item.pengajar_nama, colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
      { content: formatRupiah(item.total_gaji), styles: { fontStyle: 'bold', textColor: [22, 163, 74], fillColor: [240, 253, 244] } }
    ])
  })

  doc.autoTable({
    startY: 28,
    head: [['Tanggal', 'Jam', 'Durasi', 'Jenjang', 'Kategori', 'Keterangan', 'Gaji']],
    body: tableData,
    foot: [['TOTAL KESELURUHAN', '', '', '', '', '', formatRupiah(totalKeseluruhan)]],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
    styles: { fontSize: 8 }
  })
  doc.save('Payroll_' + namaBulan + '_' + filterTahun + '.pdf')
}

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Payroll Pengajar</h1>
          <p className="text-xs md:text-sm text-gray-500">Daftar gaji — {namaBulan} {filterTahun}</p>
        </div>
        <Button onClick={fetchPayroll} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm">Total Gaji Bulan Ini</p>
                <p className="text-xl md:text-2xl font-bold mt-1">{formatRupiah(totalKeseluruhan)}</p>
              </div>
              <div className="p-2 md:p-3 bg-white/20 rounded-xl"><DollarSign className="w-6 h-6 md:w-8 md:h-8" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm">Total Jam Mengajar</p>
                <p className="text-xl md:text-2xl font-bold mt-1">{formatJam(totalJamKeseluruhan)}</p>
              </div>
              <div className="p-2 md:p-3 bg-white/20 rounded-xl"><Clock className="w-6 h-6 md:w-8 md:h-8" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs md:text-sm">Total Sesi Mengajar</p>
                <p className="text-xl md:text-2xl font-bold mt-1">{totalSesiKeseluruhan} sesi</p>
              </div>
              <div className="p-2 md:p-3 bg-white/20 rounded-xl"><Calendar className="w-6 h-6 md:w-8 md:h-8" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Payroll */}
      <Card>
        <CardHeader>
          {/* Filter Bulan & Tahun */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs mb-1 block">Bulan</Label>
              <Select value={filterBulan.toString()} onValueChange={(v) => setFilterBulan(parseInt(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bulanOptions.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tahun</Label>
              <Input className="h-9 text-sm" type="number" value={filterTahun} onChange={(e) => setFilterTahun(parseInt(e.target.value))} />
            </div>
          </div>
          {/* Tombol Export */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportToExcel} variant="outline" size="sm" className="w-full">
              <FileDown className="w-4 h-4 mr-1" /> Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm" className="w-full">
              <FileDown className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : payroll.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Belum ada data payroll untuk periode ini</div>
          ) : (
            <div className="space-y-2">

              {/* Header tabel - desktop only */}
              <div className="hidden md:grid md:grid-cols-12 text-xs font-semibold text-gray-500 px-4 pb-1 border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Nama Pengajar</div>
                <div className="col-span-2 text-center">Sesi</div>
                <div className="col-span-2 text-center">Jam</div>
                <div className="col-span-2 text-right">Total Gaji</div>
              </div>

              {payroll.map((item, idx) => (
                <div key={item.pengajar_id} className="border rounded-lg overflow-hidden">

                  {/* Baris utama - Mobile layout berbeda dari desktop */}
                  <div
                    className="p-3 md:p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleExpand(item.pengajar_id)}
                  >
                    {/* Mobile layout */}
                    <div className="flex items-center gap-3 md:hidden">
                      <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {item.pengajar_nama?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{item.pengajar_nama}</p>
                        <p className="text-xs text-gray-400">{item.jumlah_sesi} sesi · {formatJam(item.total_jam)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <p className="text-sm font-bold text-green-600">{formatRupiah(item.total_gaji)}</p>
                        {expandedRows[item.pengajar_id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:grid md:grid-cols-12 items-center">
                      <div className="col-span-1 text-sm font-bold text-gray-400">{idx + 1}</div>
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {item.pengajar_nama?.charAt(0)?.toUpperCase()}
                        </div>
                        <p className="font-semibold text-gray-900">{item.pengajar_nama}</p>
                      </div>
                      <div className="col-span-2 text-center text-sm text-gray-600">{item.jumlah_sesi} sesi</div>
                      <div className="col-span-2 text-center text-sm text-gray-600">{formatJam(item.total_jam)}</div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <p className="text-lg font-bold text-green-600">{formatRupiah(item.total_gaji)}</p>
                        {expandedRows[item.pengajar_id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Detail rincian */}
                  {expandedRows[item.pengajar_id] && (
                    <div className="p-3 md:p-4 bg-white border-t">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Rincian Mengajar</p>

                      {/* Mobile: card per item */}
                      <div className="space-y-2 md:hidden">
                        {item.rincian.map((r) => (
                          <div key={r.id} className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-700">{new Date(r.tanggal).toLocaleDateString('id-ID')}</span>
                              <span className="font-bold text-green-600">{formatRupiah(r.gaji)}</span>
                            </div>
                            <div className="flex gap-2 text-gray-500">
                              <span>{r.jam_mulai} - {r.jam_selesai}</span>
                              <span>·</span>
                              <span>{r.menit_mengajar} mnt</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{r.jenjang}</span>
                              <span className={'px-2 py-0.5 rounded ' + (r.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>{r.kategori}</span>
                            </div>
                            {r.keterangan && <p className="text-gray-400 italic">{r.keterangan}</p>}
                          </div>
                        ))}
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                          <span className="text-xs font-bold text-gray-700">Subtotal</span>
                          <span className="text-sm font-bold text-green-600">{formatRupiah(item.total_gaji)}</span>
                        </div>
                      </div>

                      {/* Desktop: tabel */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs">Tanggal</th>
                              <th className="px-3 py-2 text-left text-xs">Jam</th>
                              <th className="px-3 py-2 text-left text-xs">Durasi</th>
                              <th className="px-3 py-2 text-left text-xs">Jenjang</th>
                              <th className="px-3 py-2 text-left text-xs">Kategori</th>
                              <th className="px-3 py-2 text-left text-xs">Keterangan</th>
                              <th className="px-3 py-2 text-right text-xs">Gaji</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {item.rincian.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{r.jam_mulai} - {r.jam_selesai}</td>
                                <td className="px-3 py-2">{r.menit_mengajar} mnt</td>
                                <td className="px-3 py-2">{r.jenjang}</td>
                                <td className="px-3 py-2">
                                  <span className={'px-2 py-1 rounded text-xs ' + (r.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                                    {r.kategori}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-500 italic text-xs">{r.keterangan || '-'}</td>
                                <td className="px-3 py-2 text-right font-semibold text-green-600 whitespace-nowrap">{formatRupiah(r.gaji)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-green-50 font-bold">
                              <td colSpan={6} className="px-3 py-2 text-gray-700 text-sm">Subtotal {item.pengajar_nama}</td>
                              <td className="px-3 py-2 text-right text-green-600">{formatRupiah(item.total_gaji)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Total keseluruhan */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg mt-2">
                <div>
                  <p className="font-bold text-gray-800 text-sm md:text-base">Total Keseluruhan</p>
                  <p className="text-xs text-gray-500">{payroll.length} pengajar · {totalSesiKeseluruhan} sesi · {formatJam(totalJamKeseluruhan)}</p>
                </div>
                <p className="text-lg md:text-2xl font-bold text-green-600">{formatRupiah(totalKeseluruhan)}</p>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
