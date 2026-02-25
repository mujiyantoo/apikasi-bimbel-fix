'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, FileDown, Trash2, Edit, RefreshCw, Calendar, Clock, BookOpen, MapPin, User, ChevronDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function JadwalPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'Admin'

  const [jadwal, setJadwal] = useState([])
  const [pegawai, setPegawai] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterHari, setFilterHari] = useState('all')
  const [filterTanggal, setFilterTanggal] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    hari: '', tanggal: '', kelas: '', waktu_mulai: '',
    waktu_selesai: '', mata_pelajaran: '', pengajar_id: '', ruangan: ''
  })

  const hariOptions = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

  const hariColors = {
    'Senin': '#6366f1', 'Selasa': '#f59e0b', 'Rabu': '#10b981',
    'Kamis': '#3b82f6', 'Jumat': '#ef4444', 'Sabtu': '#8b5cf6', 'Minggu': '#ec4899'
  }

  const fetchJadwal = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterHari !== 'all') params.set('hari', filterHari)
      if (filterTanggal) params.set('tanggal', filterTanggal)
      const res = await fetch(`/api/jadwal?${params}`)
      const data = await res.json()
      setJadwal(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPegawai = async () => {
    try {
      const res = await fetch('/api/pegawai')
      const data = await res.json()
      setPegawai(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchJadwal()
    fetchPegawai()
  }, [filterHari, filterTanggal])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { ...formData, id: editingId } : formData
      await fetch('/api/jadwal', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      setIsDialogOpen(false)
      setEditingId(null)
      resetForm()
      fetchJadwal()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      hari: item.hari, tanggal: item.tanggal, kelas: item.kelas,
      waktu_mulai: item.waktu_mulai, waktu_selesai: item.waktu_selesai,
      mata_pelajaran: item.mata_pelajaran, pengajar_id: item.pengajar_id, ruangan: item.ruangan
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus jadwal ini?')) return
    try {
      await fetch(`/api/jadwal?id=${id}`, { method: 'DELETE' })
      fetchJadwal()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const resetForm = () => {
    setFormData({ hari: '', tanggal: '', kelas: '', waktu_mulai: '', waktu_selesai: '', mata_pelajaran: '', pengajar_id: '', ruangan: '' })
  }

  const exportToExcel = () => {
    const dataToExport = jadwal.map(item => ({
      'Hari': item.hari,
      'Tanggal': new Date(item.tanggal).toLocaleDateString('id-ID'),
      'Kelas': item.kelas,
      'Waktu': `${item.waktu_mulai} - ${item.waktu_selesai}`,
      'Mata Pelajaran': item.mata_pelajaran,
      'Pengajar': item.pengajar_nama,
      'Ruangan': item.ruangan
    }))
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal')
    XLSX.writeFile(wb, `Jadwal_${filterHari !== 'all' ? filterHari : 'Semua'}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('JADWAL KBM BINA INSAN NUSANTARA', 14, 15)
    doc.setFontSize(10)
    doc.text(`${filterHari !== 'all' ? filterHari : 'Semua Hari'} - ${filterTanggal || 'Semua Tanggal'}`, 14, 22)
    doc.autoTable({
      startY: 28,
      head: [['Hari', 'Tanggal', 'Kelas', 'Waktu', 'Mata Pelajaran', 'Pengajar', 'Ruangan']],
      body: jadwal.map(item => [
        item.hari,
        new Date(item.tanggal).toLocaleDateString('id-ID'),
        item.kelas,
        `${item.waktu_mulai} - ${item.waktu_selesai}`,
        item.mata_pelajaran,
        item.pengajar_nama,
        item.ruangan
      ]),
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 }
    })
    doc.save(`Jadwal_${filterHari !== 'all' ? filterHari : 'Semua'}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .jadwal-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #f8f7ff;
          min-height: 100vh;
          padding: 2rem;
        }

        .jadwal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .jadwal-title-block h1 {
          font-size: 1.875rem;
          font-weight: 800;
          color: #1e1b4b;
          letter-spacing: -0.03em;
          margin: 0 0 0.25rem 0;
        }

        .jadwal-title-block p {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 0.625rem;
          align-items: center;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border: 1.5px solid #e0e7ff;
          background: white;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6366f1;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .btn-refresh:hover {
          background: #eef2ff;
          border-color: #6366f1;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1.25rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99,102,241,0.4);
        }

        .filter-card {
          background: white;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #ede9fe;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: flex-end;
          box-shadow: 0 1px 4px rgba(99,102,241,0.06);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          flex: 1;
          min-width: 140px;
        }

        .filter-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6366f1;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .filter-select, .filter-input {
          padding: 0.5rem 0.875rem;
          border: 1.5px solid #e0e7ff;
          border-radius: 10px;
          font-size: 0.875rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #1e1b4b;
          background: #fafafa;
          outline: none;
          transition: border-color 0.2s;
        }

        .filter-select:focus, .filter-input:focus {
          border-color: #6366f1;
          background: white;
        }

        .export-btns {
          display: flex;
          gap: 0.5rem;
        }

        .btn-export {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border: 1.5px solid #e0e7ff;
          background: white;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .btn-export:hover {
          border-color: #6366f1;
          color: #6366f1;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          border: 1px solid #ede9fe;
          box-shadow: 0 1px 4px rgba(99,102,241,0.06);
        }

        .stat-card .stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.25rem;
        }

        .stat-card .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e1b4b;
        }

        .table-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #ede9fe;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(99,102,241,0.06);
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        thead tr {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }

        thead th {
          padding: 0.875rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        tbody tr {
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
        }

        tbody tr:hover {
          background: #fafaff;
        }

        tbody tr:last-child {
          border-bottom: none;
        }

        tbody td {
          padding: 0.875rem 1rem;
          color: #374151;
          vertical-align: middle;
        }

        .hari-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
        }

        .cell-with-icon {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #6b7280;
        }

        .cell-with-icon svg {
          flex-shrink: 0;
          color: #a5b4fc;
        }

        .mata-pelajaran {
          font-weight: 600;
          color: #1e1b4b;
        }

        .kelas-badge {
          display: inline-flex;
          padding: 0.2rem 0.625rem;
          background: #eef2ff;
          color: #6366f1;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 700;
        }

        .action-btns {
          display: flex;
          gap: 0.375rem;
        }

        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1.5px solid #e5e7eb;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }

        .btn-icon:hover.edit {
          border-color: #6366f1;
          color: #6366f1;
          background: #eef2ff;
        }

        .btn-icon:hover.delete {
          border-color: #ef4444;
          color: #ef4444;
          background: #fef2f2;
        }

        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          color: #9ca3af;
        }

        .empty-state svg {
          margin: 0 auto 1rem;
          opacity: 0.3;
        }

        .empty-state p {
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .loading-state {
          padding: 3rem;
          text-align: center;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6366f1;
          animation: bounce 1.2s infinite;
        }

        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Dialog override for mobile */
        [role="dialog"] {
          max-width: min(560px, 95vw) !important;
          width: 95vw !important;
          border-radius: 20px !important;
          padding: 0 !important;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .dialog-inner {
          padding: 1.5rem;
        }

        .dialog-title-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f0edff;
        }

        .dialog-title-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dialog-title-text {
          font-size: 1rem;
          font-weight: 800;
          color: #1e1b4b;
          margin: 0;
        }

        .form-section {
          margin-bottom: 1rem;
        }

        .form-section-title {
          font-size: 0.6875rem;
          font-weight: 700;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.625rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .form-row.single {
          grid-template-columns: 1fr;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .form-field label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
        }

        .form-field input {
          padding: 0.625rem 0.875rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.875rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #1e1b4b;
          outline: none;
          transition: all 0.2s;
          background: #fafafa;
          width: 100%;
          box-sizing: border-box;
        }

        .form-field input:focus {
          border-color: #6366f1;
          background: white;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.625rem;
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid #f0edff;
        }

        .btn-cancel {
          padding: 0.625rem 1.25rem;
          border: 1.5px solid #e5e7eb;
          background: white;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }
      `}</style>

      <div className="jadwal-root">
        {/* Header */}
        <div className="jadwal-header">
          <div className="jadwal-title-block">
            <h1>Jadwal Mengajar</h1>
            <p>Kelola jadwal mengajar pengajar Bina Insan Nusantara</p>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchJadwal}>
              <RefreshCw size={14} /> Refresh
            </button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="btn-primary" onClick={() => { resetForm(); setEditingId(null); }}>
                  <Plus size={15} /> Tambah Jadwal
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <div className="dialog-inner">
                  <div className="dialog-title-bar">
                    <div className="dialog-title-icon">
                      <Calendar size={16} color="white" />
                    </div>
                    <p className="dialog-title-text">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</p>
                  </div>

                  <form onSubmit={handleSubmit}>
                    {/* Waktu & Hari */}
                    <div className="form-section">
                      <div className="form-section-title">📅 Waktu & Hari</div>
                      <div className="form-row">
                        <div className="form-field">
                          <label>Hari *</label>
                          <Select value={formData.hari} onValueChange={(v) => setFormData({...formData, hari: v})} required>
                            <SelectTrigger style={{ borderRadius: 10, fontSize: '0.875rem', height: 42, fontFamily: 'Plus Jakarta Sans' }}>
                              <SelectValue placeholder="Pilih Hari" />
                            </SelectTrigger>
                            <SelectContent>
                              {hariOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="form-field">
                          <label>Tanggal *</label>
                          <input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} required />
                        </div>
                        <div className="form-field">
                          <label>Waktu Mulai *</label>
                          <input type="time" value={formData.waktu_mulai} onChange={(e) => setFormData({...formData, waktu_mulai: e.target.value})} required />
                        </div>
                        <div className="form-field">
                          <label>Waktu Selesai *</label>
                          <input type="time" value={formData.waktu_selesai} onChange={(e) => setFormData({...formData, waktu_selesai: e.target.value})} required />
                        </div>
                      </div>
                    </div>

                    {/* Info Kelas */}
                    <div className="form-section">
                      <div className="form-section-title">📚 Info Kelas</div>
                      <div className="form-row">
                        <div className="form-field">
                          <label>Kelas *</label>
                          <input value={formData.kelas} onChange={(e) => setFormData({...formData, kelas: e.target.value})} required placeholder="Contoh: 7A" />
                        </div>
                        <div className="form-field">
                          <label>Mata Pelajaran *</label>
                          <input value={formData.mata_pelajaran} onChange={(e) => setFormData({...formData, mata_pelajaran: e.target.value})} required placeholder="Contoh: Matematika" />
                        </div>
                      </div>
                    </div>

                    {/* Pengajar & Ruangan */}
                    <div className="form-section">
                      <div className="form-section-title">👨‍🏫 Pengajar & Lokasi</div>
                      <div className="form-row single">
                        <div className="form-field">
                          <label>Pengajar *</label>
                          <Select value={formData.pengajar_id} onValueChange={(v) => setFormData({...formData, pengajar_id: v})} required>
                            <SelectTrigger style={{ borderRadius: 10, fontSize: '0.875rem', height: 42, fontFamily: 'Plus Jakarta Sans' }}>
                              <SelectValue placeholder="Pilih Pengajar" />
                            </SelectTrigger>
                            <SelectContent>
                              {pegawai.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="form-field">
                          <label>Ruangan *</label>
                          <input value={formData.ruangan} onChange={(e) => setFormData({...formData, ruangan: e.target.value})} required placeholder="Contoh: Ruang A1" />
                        </div>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="button" className="btn-cancel" onClick={() => setIsDialogOpen(false)}>Batal</button>
                      <button type="submit" className="btn-primary">{editingId ? '✓ Update' : '+ Simpan'}</button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Jadwal</div>
            <div className="stat-value">{jadwal.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pengajar Aktif</div>
            <div className="stat-value">{[...new Set(jadwal.map(j => j.pengajar_id))].length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Jumlah Kelas</div>
            <div className="stat-value">{[...new Set(jadwal.map(j => j.kelas))].length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Mata Pelajaran</div>
            <div className="stat-value">{[...new Set(jadwal.map(j => j.mata_pelajaran))].length}</div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-card">
          <div className="filter-group">
            <label>Filter Hari</label>
            <select className="filter-select" value={filterHari} onChange={(e) => setFilterHari(e.target.value)}>
              <option value="all">Semua Hari</option>
              {hariOptions.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Filter Tanggal</label>
            <input className="filter-input" type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} />
          </div>
          <div className="export-btns">
            <button className="btn-export" onClick={exportToExcel}>
              <FileDown size={14} /> Excel
            </button>
            <button className="btn-export" onClick={exportToPDF}>
              <FileDown size={14} /> PDF
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-state">
                <div className="loading-dots">
                  <span /><span /><span />
                </div>
              </div>
            ) : jadwal.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <p>Belum ada jadwal tersedia</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Hari</th>
                    <th>Tanggal</th>
                    <th>Kelas</th>
                    <th>Waktu</th>
                    <th>Mata Pelajaran</th>
                    <th>Pengajar</th>
                    <th>Ruangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwal.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="hari-badge" style={{ background: hariColors[item.hari] || '#6b7280' }}>
                          {item.hari}
                        </span>
                      </td>
                      <td>
                        <div className="cell-with-icon">
                          <Calendar size={13} />
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td><span className="kelas-badge">{item.kelas}</span></td>
                      <td>
                        <div className="cell-with-icon">
                          <Clock size={13} />
                          {item.waktu_mulai} – {item.waktu_selesai}
                        </div>
                      </td>
                      <td><span className="mata-pelajaran">{item.mata_pelajaran}</span></td>
                      <td>
                        <div className="cell-with-icon">
                          <User size={13} />
                          {item.pengajar_nama}
                        </div>
                      </td>
                      <td>
                        <div className="cell-with-icon">
                          <MapPin size={13} />
                          {item.ruangan}
                        </div>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon edit" onClick={() => handleEdit(item)}>
                            <Edit size={13} />
                          </button>
                          <button className="btn-icon delete" onClick={() => handleDelete(item.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
