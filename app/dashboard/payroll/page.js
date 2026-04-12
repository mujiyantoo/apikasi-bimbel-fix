'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, ChevronUp, RefreshCw, FileDown, DollarSign, Clock, Calendar, Printer, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function PayrollPage() {
  const { data: session } = useSession()

  const [payroll, setPayroll] = useState([])
  const [loading, setLoading] = useState(true)

  // Default dates: 1st to last day of current month
  const getInitialDates = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const fmt = (d) => d.toISOString().split('T')[0]
    return {
      start: fmt(new Date(year, month, 1)),
      end: fmt(new Date(year, month + 1, 0))
    }
  }

  const initialDates = getInitialDates()
  const [startDate, setStartDate] = useState(initialDates.start)
  const [endDate, setEndDate] = useState(initialDates.end)

  const [expandedRows, setExpandedRows] = useState({})
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, nama, tanggal }
  const isOwner = session?.user?.role?.toLowerCase() === 'owner'


  const fetchPayroll = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll?startDate=${startDate}&endDate=${endDate}`)
      const data = await res.json()
      setPayroll(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKinerja = async (kinerjaId) => {
    setDeletingId(kinerjaId)
    try {
      const res = await fetch('/api/kinerja?id=' + kinerjaId, { method: 'DELETE' })
      if (res.ok) {
        setConfirmDelete(null)
        await fetchPayroll()
      } else {
        alert('Gagal menghapus data kinerja')
      }
    } catch (e) {
      alert('Terjadi kesalahan')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (startDate && endDate) {
      fetchPayroll()
    }
  }, [startDate, endDate])

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

  // Helper for formatting date in UI
  const formatDateLabel = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const periodeLabel = `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`

  // ================================================================
  // CETAK KWITANSI PER PENGAJAR — membuka popup print HTML modern
  // ================================================================
  const cetakKwitansi = (item, e) => {
    e.stopPropagation() // jangan toggle expand
    const now = new Date()
    const tglCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const jamCetak = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    const rowsHTML = item.rincian.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
        <td>${r.jam_mulai} - ${r.jam_selesai}</td>
        <td>${r.menit_mengajar} mnt</td>
        <td>${r.jenjang}</td>
        <td>${r.kategori}</td>
        <td>${r.keterangan || '-'}</td>
        <td class="nominal">${formatRupiah(r.gaji)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Kwitansi Honorarium — ${item.pengajar_nama}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
    .wrapper { max-width: 860px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 28px 32px; display: flex; align-items: center; gap: 20px; }
    .header-logo { width: 56px; height: 56px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #2563eb; flex-shrink: 0; }
    .header-info h1 { font-size: 18px; font-weight: 700; letter-spacing: 0.3px; }
    .header-info p { font-size: 12px; opacity: 0.8; margin-top: 2px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; padding: 3px 12px; font-size: 11px; margin-top: 6px; }
    .body { padding: 28px 32px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .meta-box { background: #f1f5f9; border-radius: 8px; padding: 14px 16px; }
    .meta-box label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; display: block; margin-bottom: 4px; }
    .meta-box span { font-size: 14px; font-weight: 700; color: #1e293b; }
    .meta-box.highlight { background: #eff6ff; border: 1px solid #bfdbfe; }
    .meta-box.highlight span { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #1e3a8a; color: white; }
    thead th { padding: 10px 10px; text-align: left; font-weight: 600; font-size: 11px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #eff6ff; }
    tbody td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .nominal { text-align: right; font-weight: 600; color: #16a34a; white-space: nowrap; }
    tfoot tr { background: #f0fdf4; }
    tfoot td { padding: 12px 10px; font-weight: 700; border-top: 2px solid #16a34a; }
    .total-label { color: #15803d; }
    .total-amount { text-align: right; color: #15803d; font-size: 15px; }
    .footer { padding: 24px 32px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-note { font-size: 11px; color: #94a3b8; }
    .signature { text-align: center; }
    .signature p { font-size: 11px; color: #64748b; }
    .signature .name { font-weight: 700; color: #1e293b; font-size: 13px; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 48px; }
    @media print {
      body { background: white; padding: 0; }
      .wrapper { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="header-logo">BIN</div>
    <div class="header-info">
      <h1>Bimbingan Belajar Bina Insan Nusantara</h1>
      <p>Kwitansi Honorarium Pengajar</p>
      <span class="badge">Periode: ${periodeLabel}</span>
    </div>
  </div>
  <div class="body">
    <div class="meta">
      <div class="meta-box">
        <label>Nama Pengajar</label>
        <span>${item.pengajar_nama}</span>
      </div>
      <div class="meta-box">
        <label>Periode</label>
        <span>${periodeLabel}</span>
      </div>
      <div class="meta-box">
        <label>Jumlah Sesi</label>
        <span>${item.jumlah_sesi} sesi · ${formatJam(item.total_jam)}</span>
      </div>
      <div class="meta-box highlight">
        <label>Total Honorarium</label>
        <span>${formatRupiah(item.total_gaji)}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Tanggal</th>
          <th>Jam</th>
          <th>Durasi</th>
          <th>Jenjang</th>
          <th>Kategori</th>
          <th>Keterangan</th>
          <th style="text-align:right">Gaji</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
      <tfoot>
        <tr>
          <td colspan="7" class="total-label">Total Honorarium ${item.pengajar_nama}</td>
          <td class="total-amount">${formatRupiah(item.total_gaji)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div class="footer">
    <div class="footer-note">
      <p>Dicetak: ${tglCetak} ${jamCetak} WIB</p>
      <p>Sistem Manajemen Bimbel BIN Nusantara</p>
    </div>
    <div class="signature">
      <p>Hormat kami,</p>
      <p class="name">Bag. Keuangan BIN Bimbel</p>
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`

    const win = window.open('', '_blank', 'width=950,height=700')
    win.document.write(html)
    win.document.close()
  }

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
    const safeStartDate = startDate || 'start'
    const safeEndDate = endDate || 'end'
    XLSX.writeFile(wb, `Payroll_${safeStartDate}_to_${safeEndDate}.xlsx`)
  }
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('LAPORAN PAYROLL PENGAJAR BIN BIMBEL CABANG PANUMBANGAN', 14, 15)
    doc.setFontSize(10)
    doc.text('Periode: ' + periodeLabel, 14, 22)

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
    doc.save('Payroll_' + startDate + '_' + endDate + '.pdf')
  }

  const exportKwitansiPDF = (item, e) => {
    e.stopPropagation()
    const doc = new jsPDF({ orientation: 'portrait' })
    const now = new Date()
    const tglCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const jamCetak = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    // Header Kwitansi
    doc.setFontSize(16)
    doc.setTextColor(30, 58, 138)
    doc.setFont(undefined, 'bold')
    doc.text('BIN', 14, 20)
    
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59)
    doc.text('Bimbingan Belajar Bina Insan Nusantara', 28, 20)
    
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Kwitansi Honorarium Pengajar', 28, 26)

    // Meta Info
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(`Nama Pengajar  : ${item.pengajar_nama}`, 14, 40)
    doc.text(`Periode        : ${periodeLabel}`, 14, 46)
    doc.text(`Jumlah Sesi    : ${item.jumlah_sesi} sesi (${formatJam(item.total_jam)})`, 14, 52)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text(`Total Honorarium : ${formatRupiah(item.total_gaji)}`, 14, 58)

    // Table Data
    const tableData = []
    item.rincian.forEach((r, index) => {
      tableData.push([
        index + 1,
        new Date(r.tanggal).toLocaleDateString('id-ID'),
        `${r.jam_mulai} - ${r.jam_selesai}`,
        `${r.menit_mengajar} mnt`,
        r.jenjang,
        r.kategori,
        r.keterangan || '-',
        formatRupiah(r.gaji),
      ])
    })

    doc.autoTable({
      startY: 65,
      head: [['No', 'Tanggal', 'Jam', 'Durasi', 'Jenjang', 'Kategori', 'Keterangan', 'Gaji']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'Total Honorarium', formatRupiah(item.total_gaji)]],
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      footStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        7: { halign: 'right' }
      }
    })

    // Footer
    const finalY = doc.lastAutoTable.finalY || 65
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.setFont(undefined, 'normal')
    doc.text(`Dicetak: ${tglCetak} ${jamCetak} WIB`, 14, finalY + 15)
    doc.text('Sistem Manajemen Bimbel BIN Nusantara', 14, finalY + 20)

    doc.setTextColor(30, 41, 59)
    doc.text('Hormat kami,', 150, finalY + 15)
    doc.setFont(undefined, 'bold')
    doc.text('Bag. Keuangan BIN Bimbel', 140, finalY + 35)

    doc.save(`Kwitansi_${item.pengajar_nama.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-14 md:pt-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Payroll Pengajar</h1>
          <p className="text-xs md:text-sm text-gray-500">Daftar gaji — {periodeLabel}</p>
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
          {/* Filter Tanggal */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs mb-1 block">Tanggal Mulai</Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tanggal Akhir</Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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
                <div className="col-span-4">Nama Pengajar</div>
                <div className="col-span-1 text-center"></div>
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
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {item.pengajar_nama?.charAt(0)?.toUpperCase()}
                        </div>
                        <p className="font-semibold text-gray-900">{item.pengajar_nama}</p>
                      </div>
                      {/* Tombol Cetak Kwitansi & PDF */}
                      <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                        <button
                          onClick={(e) => cetakKwitansi(item, e)}
                          title="Cetak Kwitansi (Print)"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 text-[10px] font-medium transition-all active:scale-95 w-full justify-center"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={(e) => exportKwitansiPDF(item, e)}
                          title="Export Kwitansi ke PDF"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-medium transition-all active:scale-95 w-full justify-center"
                        >
                          <FileDown className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
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
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-green-600">{formatRupiah(r.gaji)}</span>
                                {isOwner && (
                                  <button
                                    onClick={() => setConfirmDelete({ id: r.id, nama: item.pengajar_nama, tanggal: new Date(r.tanggal).toLocaleDateString('id-ID'), keterangan: r.keterangan })}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 transition-all active:scale-95"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
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
                              {isOwner && <th className="px-3 py-2 text-center text-xs">Hapus</th>}
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
                                {isOwner && (
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      onClick={() => setConfirmDelete({ id: r.id, nama: item.pengajar_nama, tanggal: new Date(r.tanggal).toLocaleDateString('id-ID'), keterangan: r.keterangan })}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 transition-all active:scale-95"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
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
      {/* Dialog Konfirmasi Hapus — Owner Only */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Hapus Data Kinerja?</p>
                <p className="text-xs text-gray-500">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <p className="text-gray-700"><span className="font-semibold">Pengajar:</span> {confirmDelete.nama}</p>
              <p className="text-gray-700"><span className="font-semibold">Tanggal:</span> {confirmDelete.tanggal}</p>
              {confirmDelete.keterangan && <p className="text-gray-500 italic text-xs">{confirmDelete.keterangan}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
                disabled={!!deletingId}
              >Batal</button>
              <button
                onClick={() => handleDeleteKinerja(confirmDelete.id)}
                disabled={!!deletingId}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all disabled:opacity-60"
              >{deletingId ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
