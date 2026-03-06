'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserCheck, CalendarDays, MapPin } from 'lucide-react'

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function KehadiranPage() {
    const { data: session, status } = useSession()
    const [absensi, setAbsensi] = useState([])
    const [loading, setLoading] = useState(true)
    const [bulanInfo, setBulanInfo] = useState({
        bulan: (new Date().getMonth() + 1).toString(),
        tahun: new Date().getFullYear().toString()
    })

    useEffect(() => {
        if (session) {
            if (session.user.role !== 'Owner' && session.user.role !== 'Admin') {
                window.location.href = '/dashboard'
                return
            }
            fetchDataAbsensi()
        }
    }, [session, bulanInfo])

    const fetchDataAbsensi = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/absensi?bulan=${bulanInfo.bulan}&tahun=${bulanInfo.tahun}`)
            const data = await res.json()
            if (Array.isArray(data)) {
                setAbsensi(data)
            } else {
                setAbsensi([])
            }
        } catch (err) {
            console.error(err)
            setAbsensi([])
        } finally {
            setLoading(false)
        }
    }

    const formatJam = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }

    const formatTanggalSingkat = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }

    if (status === 'loading') {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!session || (session.user.role !== 'Owner' && session.user.role !== 'Admin')) {
        return null
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserCheck className="w-8 h-8 text-blue-600" />
                        Kehadiran Pegawai
                    </h1>
                    <p className="text-gray-500 mt-1">Rekap absensi seluruh pegawai Bina Insan Nusantara</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 text-sm rounded-lg shadow-sm border border-gray-100">
                    <Select
                        value={bulanInfo.bulan}
                        onValueChange={(val) => setBulanInfo(prev => ({ ...prev, bulan: val }))}
                    >
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {NAMA_BULAN.map((bulan, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>{bulan}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        type="number"
                        className="w-[100px] h-9"
                        value={bulanInfo.tahun}
                        onChange={(e) => setBulanInfo(prev => ({ ...prev, tahun: e.target.value }))}
                        min="2024"
                        max="2030"
                    />
                </div>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-blue-600" />
                        Data Absensi - {NAMA_BULAN[parseInt(bulanInfo.bulan) - 1]} {bulanInfo.tahun}
                    </CardTitle>
                    <CardDescription>
                        Menampilkan catatan jam masuk dan keluar seluruh pegawai
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-gray-500 text-sm">Memuat data kehadiran...</p>
                        </div>
                    ) : absensi.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <UserCheck className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">Belum ada data absensi</p>
                            <p className="text-gray-400 text-sm">di bulan ini</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="w-[50px] font-semibold">No</TableHead>
                                        <TableHead className="font-semibold">Nama Pegawai</TableHead>
                                        <TableHead className="font-semibold text-center">Tanggal</TableHead>
                                        <TableHead className="font-semibold text-center">Absen Masuk</TableHead>
                                        <TableHead className="font-semibold text-center">Absen Keluar</TableHead>
                                        <TableHead className="font-semibold text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {absensi.map((item, index) => (
                                        <TableRow key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                            <TableCell className="text-center font-medium text-gray-500">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-gray-900">{item.pegawai_nama || 'Tidak diketahui'}</div>
                                                <div className="text-xs text-gray-400 shrink-0w-24 truncate">{item.pegawai_id}</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                                    {formatTanggalSingkat(item.waktu_masuk)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-mono font-bold ${item.waktu_masuk ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {formatJam(item.waktu_masuk)}
                                                    </span>
                                                    {item.jarak_masuk !== null && item.jarak_masuk !== undefined && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3" /> {item.jarak_masuk}m
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-mono font-bold ${item.waktu_keluar ? 'text-blue-600' : 'text-gray-400'}`}>
                                                        {formatJam(item.waktu_keluar)}
                                                    </span>
                                                    {item.jarak_keluar !== null && item.jarak_keluar !== undefined && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3" /> {item.jarak_keluar}m
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`${item.waktu_keluar ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'} border-0`}>
                                                    {item.waktu_keluar ? 'Selesai' : 'Sedang Kerja'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
