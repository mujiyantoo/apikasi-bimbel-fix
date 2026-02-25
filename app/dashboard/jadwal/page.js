'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, FileDown, Trash2, Edit, RefreshCw, Calendar, Clock, MapPin, User, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function JadwalPage() {
  const { data: session } = useSession()
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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchPegawai = async () => {
    try {
      const res = await fetch('/api/pegawai')
      const data = await res.json()
      setPegawai(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchJadwal(); fetchPegawai() }, [filterHari, filterTanggal])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { ...formData, id: editingId } : formData
      await fetch('/api/jadwal', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setIsDialogOpen(false)
      setEditingId(null)
      resetForm()
      fetchJadwal()
    } catch (e) { console.error(e) }
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
    } catch (e) { console.error(e) }
  }

  const resetForm = () => setFormData({ hari: '', tanggal: '', kelas: '', waktu_mulai: '', waktu_selesai: '', mata_pelajaran: '', pengajar_id: '', ruangan: '' })

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(jadwal.map(item => ({
      'Hari': item.hari, 'Tanggal': new Date(item.tanggal).toLocaleDateString('id-ID'),
      'Kelas': item.kelas, 'Waktu': `${item.waktu_mulai} - ${item.waktu_selesai}`,
      'Mata Pelajaran': item.mata_pelajaran, 'Pengajar': item.pengajar_nama, 'Ruangan': item.ruangan
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal')
    XLSX.writeFile(wb, `Jadwal_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('JADWAL KBM BINA INSAN NUSANTARA', 14, 15)
    doc.autoTable({
      startY: 25,
      head: [['Hari', 'Tanggal', 'Kelas', 'Waktu', 'Mata Pelajaran', 'Pengajar', 'Ruangan']],
      body: jadwal.map(item => [item.hari, new Date(item.tanggal).toLocaleDateString('id-ID'), item.kelas, `${item.waktu_mulai}-${item.waktu_selesai}`, item.mata_pelajaran, item.pengajar_nama, item.ruangan]),
      headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 7 }
    })
    doc.save(`Jadwal_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const inp = {
    padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10,
    fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1e1b4b',
    background: '#fafafa', outline: 'none', width: '100%', boxSizing: 'border-box'
  }

  const Field = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .jr * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        .jr { background: #f5f3ff; min-height: 100vh; padding: 1rem; }

        .jh { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.625rem; }
        .jh h1 { font-size:1.375rem; font-weight:800; color:#1e1b4b; margin:0 0 2px; letter-spacing:-0.02em; }
        .jh p { color:#9ca3af; font-size:12px; margin:0; }
        .ha { display:flex; gap:6px; align-items:center; }

        .btn-r { display:flex; align-items:center; gap:5px; padding:8px 12px; border:1.5px solid #e0e7ff; background:white; border-radius:10px; font-size:12px; font-weight:600; color:#6366f1; cursor:pointer; transition:all 0.2s; }
        .btn-r:hover { background:#eef2ff; }
        .btn-p { display:flex; align-items:center; gap:5px; padding:8px 14px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; border-radius:10px; font-size:12px; font-weight:700; color:white; cursor:pointer; box-shadow:0 4px 10px rgba(99,102,241,0.3); transition:all 0.2s; }
        .btn-p:hover { transform:translateY(-1px); }

        .stats { display:grid; grid-template-columns:repeat(2,1fr); gap:0.625rem; margin-bottom:1rem; }
        @media(min-width:480px){ .stats{grid-template-columns:repeat(4,1fr)} }
        .sc { background:white; border-radius:12px; padding:12px 14px; border:1px solid #ede9fe; }
        .sc-l { font-size:10px; font-weight:700; color:#a5b4fc; text-transform:uppercase; letter-spacing:.06em; margin-bottom:2px; }
        .sc-v { font-size:1.5rem; font-weight:800; color:#1e1b4b; }

        .fc { background:white; border-radius:12px; padding:12px; margin-bottom:1rem; border:1px solid #ede9fe; display:flex; gap:0.625rem; flex-wrap:wrap; align-items:flex-end; }
        .fg { display:flex; flex-direction:column; gap:3px; flex:1; min-width:110px; }
        .fg label { font-size:10px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:.06em; }
        .fs,.fi { padding:8px 10px; border:1.5px solid #e0e7ff; border-radius:9px; font-size:13px; color:#1e1b4b; background:#fafafa; outline:none; width:100%; }
        .eb { display:flex; gap:6px; }
        .be { display:flex; align-items:center; gap:4px; padding:8px 10px; border:1.5px solid #e0e7ff; background:white; border-radius:9px; font-size:12px; font-weight:600; color:#6b7280; cursor:pointer; transition:all 0.2s; }
        .be:hover { border-color:#6366f1; color:#6366f1; }

        .tc { background:white; border-radius:14px; border:1px solid #ede9fe; overflow:hidden; }
        .tw { overflow-x:auto; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        thead tr { background:linear-gradient(135deg,#6366f1,#8b5cf6); }
        thead th { padding:10px 11px; text-align:left; font-size:10px; font-weight:700; color:rgba(255,255,255,.9); text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
        tbody tr { border-bottom:1px solid #f3f4f6; transition:background .15s; }
        tbody tr:hover { background:#fafaff; }
        tbody tr:last-child { border-bottom:none; }
        tbody td { padding:10px 11px; color:#374151; vertical-align:middle; }
        .hb { display:inline-flex; padding:3px 9px; border-radius:99px; font-size:10px; font-weight:700; color:white; }
        .ci { display:flex; align-items:center; gap:3px; color:#6b7280; white-space:nowrap; }
        .ci svg { color:#a5b4fc; flex-shrink:0; }
        .mp { font-weight:600; color:#1e1b4b; }
        .kb { display:inline-flex; padding:2px 7px; background:#eef2ff; color:#6366f1; border-radius:6px; font-size:11px; font-weight:700; }
        .ab { display:flex; gap:3px; }
        .bi { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:7px; border:1.5px solid #e5e7eb; background:white; cursor:pointer; color:#6b7280; transition:all 0.2s; }
        .bi.ed:hover { border-color:#6366f1; color:#6366f1; background:#eef2ff; }
        .bi.dl:hover { border-color:#ef4444; color:#ef4444; background:#fef2f2; }
        .es { padding:2.5rem 1rem; text-align:center; color:#9ca3af; }
        .es svg { margin:0 auto .625rem; opacity:.25; display:block; }
        .ls { padding:2rem; text-align:center; }
        .ld { display:flex; justify-content:center; gap:6px; }
        .ld span { width:7px; height:7px; border-radius:50%; background:#6366f1; animation:bou 1.2s infinite; }
        .ld span:nth-child(2){animation-delay:.2s}.ld span:nth-child(3){animation-delay:.4s}
        @keyframes bou{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}

        /* MODAL */
        .mo { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9999; display:flex; align-items:flex-end; justify-content:center; animation:fI .2s; }
        @media(min-width:520px){ .mo{align-items:center;padding:1rem} }
        @keyframes fI{from{opacity:0}to{opacity:1}}
        .mb { background:white; width:100%; max-width:460px; border-radius:20px 20px 0 0; max-height:90vh; display:flex; flex-direction:column; animation:sU .25s ease; overflow:hidden; }
        @media(min-width:520px){ .mb{border-radius:18px;max-height:85vh} }
        @keyframes sU{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        .mh { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #f0edff; flex-shrink:0; }
        .mhl { display:flex; align-items:center; gap:9px; }
        .mi { width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; }
        .mt { font-size:14px; font-weight:800; color:#1e1b4b; margin:0; }
        .mx { width:28px; height:28px; border-radius:7px; border:1.5px solid #e5e7eb; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#9ca3af; transition:all .2s; }
        .mx:hover { background:#fef2f2; border-color:#ef4444; color:#ef4444; }
        .mbody { overflow-y:auto; padding:14px 16px; flex:1; -webkit-overflow-scrolling:touch; }
        .st { font-size:10px; font-weight:700; color:#a5b4fc; text-transform:uppercase; letter-spacing:.08em; margin:0 0 8px; padding-bottom:5px; border-bottom:1px dashed #ede9fe; }
        .fsec { margin-bottom:12px; }
        .f2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .f1 { display:grid; grid-template-columns:1fr; gap:8px; }
        .mf { padding:12px 16px; border-top:1px solid #f0edff; display:flex; gap:8px; justify-content:flex-end; flex-shrink:0; background:white; }
        .bc { padding:9px 16px; border:1.5px solid #e5e7eb; background:white; border-radius:10px; font-size:13px; font-weight:600; color:#6b7280; cursor:pointer; transition:all .2s; }
        .bc:hover { background:#f9fafb; }
        .bs { padding:9px 20px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; border-radius:10px; font-size:13px; font-weight:700; color:white; cursor:pointer; box-shadow:0 4px 10px rgba(99,102,241,.3); transition:all .2s; }
        .bs:hover { transform:translateY(-1px); }
        input:focus, select:focus { border-color:#6366f1 !important; box-shadow:0 0 0 3px rgba(99,102,241,.1) !important; outline:none; background:white !important; }
      `}</style>

      <div className="jr">
        {/* Header */}
        <div className="jh">
          <div>
            <h1>Jadwal Mengajar</h1>
            <p>Kelola jadwal mengajar Bina Insan Nusantara</p>
          </div>
          <div className="ha">
            <button className="btn-r" onClick={fetchJadwal}><RefreshCw size={12}/> Refresh</button>
            <button className="btn-p" onClick={() => { resetForm(); setEditingId(null); setIsDialogOpen(true) }}>
              <Plus size={13}/> Tambah Jadwal
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="sc"><div className="sc-l">Total Jadwal</div><div className="sc-v">{jadwal.length}</div></div>
          <div className="sc"><div className="sc-l">Pengajar</div><div className="sc-v">{[...new Set(jadwal.map(j=>j.pengajar_id))].length}</div></div>
          <div className="sc"><div className="sc-l">Kelas</div><div className="sc-v">{[...new Set(jadwal.map(j=>j.kelas))].length}</div></div>
          <div className="sc"><div className="sc-l">Mapel</div><div className="sc-v">{[...new Set(jadwal.map(j=>j.mata_pelajaran))].length}</div></div>
        </div>

        {/* Filter */}
        <div className="fc">
          <div className="fg">
            <label>Filter Hari</label>
            <select className="fs" value={filterHari} onChange={(e)=>setFilterHari(e.target.value)}>
              <option value="all">Semua Hari</option>
              {hariOptions.map(h=><option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Filter Tanggal</label>
            <input className="fi" type="date" value={filterTanggal} onChange={(e)=>setFilterTanggal(e.target.value)}/>
          </div>
          <div className="eb">
            <button className="be" onClick={exportToExcel}><FileDown size={12}/> Excel</button>
            <button className="be" onClick={exportToPDF}><FileDown size={12}/> PDF</button>
          </div>
        </div>

        {/* Table */}
        <div className="tc">
          <div className="tw">
            {loading ? (
              <div className="ls"><div className="ld"><span/><span/><span/></div></div>
            ) : jadwal.length === 0 ? (
              <div className="es"><Calendar size={40}/><p>Belum ada jadwal tersedia</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Hari</th><th>Tanggal</th><th>Kelas</th><th>Waktu</th>
                    <th>Mata Pelajaran</th><th>Pengajar</th><th>Ruangan</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwal.map((item)=>(
                    <tr key={item.id}>
                      <td><span className="hb" style={{background:hariColors[item.hari]||'#6b7280'}}>{item.hari}</span></td>
                      <td><div className="ci"><Calendar size={11}/>{new Date(item.tanggal).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</div></td>
                      <td><span className="kb">{item.kelas}</span></td>
                      <td><div className="ci"><Clock size={11}/>{item.waktu_mulai}–{item.waktu_selesai}</div></td>
                      <td><span className="mp">{item.mata_pelajaran}</span></td>
                      <td><div className="ci"><User size={11}/>{item.pengajar_nama}</div></td>
                      <td><div className="ci"><MapPin size={11}/>{item.ruangan}</div></td>
                      <td>
                        <div className="ab">
                          <button className="bi ed" onClick={()=>handleEdit(item)}><Edit size={11}/></button>
                          <button className="bi dl" onClick={()=>handleDelete(item.id)}><Trash2 size={11}/></button>
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

      {/* MODAL CUSTOM — selalu bisa scroll, tombol selalu kelihatan */}
      {isDialogOpen && (
        <div className="mo" onClick={(e)=>{if(e.target===e.currentTarget)setIsDialogOpen(false)}}>
          <div className="mb">
            {/* Header modal */}
            <div className="mh">
              <div className="mhl">
                <div className="mi"><Calendar size={14} color="white"/></div>
                <p className="mt">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</p>
              </div>
              <button className="mx" onClick={()=>setIsDialogOpen(false)}><X size={13}/></button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
              {/* Body — bisa scroll */}
              <div className="mbody">

                <div className="fsec">
                  <p className="st">📅 Waktu & Hari</p>
                  <div className="f2">
                    <Field label="Hari *">
                      <select style={inp} value={formData.hari} onChange={(e)=>setFormData({...formData,hari:e.target.value})} required>
                        <option value="">Pilih Hari</option>
                        {hariOptions.map(h=><option key={h} value={h}>{h}</option>)}
                      </select>
                    </Field>
                    <Field label="Tanggal *">
                      <input style={inp} type="date" value={formData.tanggal} onChange={(e)=>setFormData({...formData,tanggal:e.target.value})} required/>
                    </Field>
                    <Field label="Waktu Mulai *">
                      <input style={inp} type="time" value={formData.waktu_mulai} onChange={(e)=>setFormData({...formData,waktu_mulai:e.target.value})} required/>
                    </Field>
                    <Field label="Waktu Selesai *">
                      <input style={inp} type="time" value={formData.waktu_selesai} onChange={(e)=>setFormData({...formData,waktu_selesai:e.target.value})} required/>
                    </Field>
                  </div>
                </div>

                <div className="fsec">
                  <p className="st">📚 Info Kelas</p>
                  <div className="f2">
                    <Field label="Kelas *">
                      <input style={inp} value={formData.kelas} onChange={(e)=>setFormData({...formData,kelas:e.target.value})} required placeholder="Contoh: 7A"/>
                    </Field>
                    <Field label="Mata Pelajaran *">
                      <input style={inp} value={formData.mata_pelajaran} onChange={(e)=>setFormData({...formData,mata_pelajaran:e.target.value})} required placeholder="Matematika"/>
                    </Field>
                  </div>
                </div>

                <div className="fsec">
                  <p className="st">👨‍🏫 Pengajar & Lokasi</p>
                  <div className="f1">
                    <Field label="Pengajar *">
                      <select style={inp} value={formData.pengajar_id} onChange={(e)=>setFormData({...formData,pengajar_id:e.target.value})} required>
                        <option value="">Pilih Pengajar</option>
                        {pegawai.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}
                      </select>
                    </Field>
                    <Field label="Ruangan *">
                      <input style={inp} value={formData.ruangan} onChange={(e)=>setFormData({...formData,ruangan:e.target.value})} required placeholder="Contoh: Ruang A1"/>
                    </Field>
                  </div>
                </div>

              </div>

              {/* Footer — SELALU kelihatan di bagian bawah */}
              <div className="mf">
                <button type="button" className="bc" onClick={()=>setIsDialogOpen(false)}>Batal</button>
                <button type="submit" className="bs">{editingId ? '✓ Update' : '+ Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
