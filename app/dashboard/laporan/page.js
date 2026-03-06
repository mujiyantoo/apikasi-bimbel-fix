'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { FileText, Download, FileSpreadsheet, Users, UserCog, Wallet, Loader2 } from 'lucide-react'

export default function LaporanPage() {
  const [exporting, setExporting] = useState('')

  const handleExportPDF = async (type) => {
    setExporting(type + '-pdf')
    try {
      // Dynamic import for client-side only
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF()

      // Fetch data based on type
      let data = []
      let title = ''
      let columns = []

      if (type === 'siswa') {
        const res = await fetch('/api/siswa')
        data = await res.json()
        title = 'Laporan Data Siswa'
        columns = ['No', 'Nama', 'NIS', 'Kelas', 'Jenis Kelamin', 'Telepon']
      } else if (type === 'pegawai') {
        const res = await fetch('/api/pegawai')
        const rawData = await res.json()
        data = rawData.success && rawData.data ? rawData.data : rawData
        title = 'Laporan Data Pegawai'
        columns = ['No', 'Nama', 'NIP', 'Jabatan', 'Jenis Kelamin', 'Telepon']
      }

      // Title
      doc.setFontSize(18)
      doc.text(title, 14, 20)
      doc.setFontSize(10)
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 28)

      // Table
      const tableData = data.map((item, index) => {
        if (type === 'siswa') {
          return [index + 1, item.nama, item.nis, item.kelas, item.jenisKelamin || '-', item.telepon || '-']
        } else {
          return [index + 1, item.nama, item.nip, item.jabatan, item.jenisKelamin || '-', item.telepon || '-']
        }
      })

      autoTable(doc, {
        head: [columns],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] }
      })

      doc.save(`${type}-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF berhasil diexport!')
    } catch (error) {
      console.error('Export PDF error:', error)
      toast.error('Gagal mengexport PDF')
    } finally {
      setExporting('')
    }
  }

  const handleExportExcel = async (type) => {
    setExporting(type + '-excel')
    try {
      const XLSX = await import('xlsx')

      let data = []
      let filename = ''

      if (type === 'siswa') {
        const res = await fetch('/api/siswa')
        data = await res.json()
        filename = 'data-siswa'
        data = data.map((item, index) => ({
          'No': index + 1,
          'Nama': item.nama,
          'NIS': item.nis,
          'Kelas': item.kelas,
          'Jenis Kelamin': item.jenisKelamin || '-',
          'Telepon': item.telepon || '-',
          'Alamat': item.alamat || '-'
        }))
      } else if (type === 'pegawai') {
        const res = await fetch('/api/pegawai')
        const rawData = await res.json()
        data = rawData.success && rawData.data ? rawData.data : rawData
        filename = 'data-pegawai'
        data = data.map((item, index) => ({
          'No': index + 1,
          'Nama': item.nama,
          'NIP': item.nip,
          'Jabatan': item.jabatan,
          'Jenis Kelamin': item.jenisKelamin || '-',
          'Telepon': item.telepon || '-',
          'Alamat': item.alamat || '-'
        }))
      }

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel berhasil diexport!')
    } catch (error) {
      console.error('Export Excel error:', error)
      toast.error('Gagal mengexport Excel')
    } finally {
      setExporting('')
    }
  }

  const reportTypes = [
    {
      id: 'siswa',
      title: 'Laporan Siswa',
      description: 'Export data seluruh siswa',
      icon: Users,
      color: 'blue'
    },
    {
      id: 'pegawai',
      title: 'Laporan Pegawai',
      description: 'Export data seluruh pegawai',
      icon: UserCog,
      color: 'emerald'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-500 mt-1">Export data ke PDF atau Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <Card key={report.id} className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className={`p-3 bg-${report.color}-50 rounded-xl w-fit mb-3`}>
                    <report.icon className={`w-6 h-6 text-${report.color}-600`} />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleExportPDF(report.id)}
                  disabled={exporting === report.id + '-pdf'}
                >
                  {exporting === report.id + '-pdf' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                  )}
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleExportExcel(report.id)}
                  disabled={exporting === report.id + '-excel'}
                >
                  {exporting === report.id + '-excel' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                  )}
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Export Data Mudah</h3>
              <p className="text-blue-100 text-sm">Pilih jenis laporan dan format yang diinginkan. Data akan otomatis terdownload.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
