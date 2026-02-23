'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, DollarSign, Loader2, Plus, X } from 'lucide-react'

const bulanOptions = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
]

const jenjangOptions = ['SD', 'SMP', 'SMA']
const kategoriOptions = ['Reguler', 'Private']

const defaultForm = {
  tanggal: new Date().toISOString().split('T')[0],
  jam_mulai: '',
  jam_selesai: '',
  jenjang: '',
  kategori: '',
  keterangan: ''
}

export default function KinerjaSayaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kinerja, setKinerja] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [pesan, setPesan] = useState(null)
  const [pegawaiSaya, setPegawaiSaya] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/absensi')
  }, [status])

  useEffect(() => {
    if (session) fetchKinerja()
  }, [session, filterBulan, filterTahun])

  const fetchKinerja = async () => {
    setLoading(true)
    try {
      const resPegawai = await fetch('/api/pegawai')
      const dataPegawai = await resPegawai.json()
      const list = Array.isArray(dataPegawai) ? dataPegawai : []

      const found = list.find(p =>
        p.nama?.toLowerCase() === session.user.name?.toLowerCase()
      )
      setPegawaiSaya(found || null)

      if (!found) {
        setKinerja([])
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      params.set('pengajar_id', found.id)
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

  const hitungGaji = (jenjang, kategori, jamMulai, jamSelesai) => {
    if (!jamMulai || !jamSelesai) return 0
    const [h1, m1
