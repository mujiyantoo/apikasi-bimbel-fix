'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Search, Banknote, Loader2, ArrowLeft, Download, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function PayrollPage() {
    const [pegawai, setPegawai] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [processingId, setProcessingId] = useState(null)
    const [selectedPegawai, setSelectedPegawai] = useState(null)

    // Mock payroll data structure extension
    // In a real app, this would come from a separate table or calculation
    const [payrollData, setPayrollData] = useState({})

    const fetchPegawai = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/pegawai')
            if (!res.ok) throw new Error('Gagal memuat data pegawai')
            const data = await res.json()

            // Filter for active employees only, if status exists
            // For now, filter by relevant roles for payroll
            const eligibleRoles = ['Guru', 'Tutor', 'Admin', 'Keuangan', 'Pimpinan']
            const eligiblePegawai = Array.isArray(data)
                ? data.filter(p => eligibleRoles.includes(p.jabatan))
                : []

            setPegawai(eligiblePegawai)

            // Initialize mock payroll data if empty
            const initialPayroll = {}
            eligiblePegawai.forEach(p => {
                initialPayroll[p.id] = {
                    gajiPokok: p.jabatan === 'Pimpinan' ? 5000000 : p.jabatan === 'Guru' ? 3000000 : 2500000,
                    tunjangan: p.jabatan === 'Guru' ? 500000 : 200000,
                    potongan: 0,
                    status: 'Belum Dibayar',
                    bulan: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })
                }
            })
            setPayrollData(prev => ({ ...initialPayroll, ...prev }))

        } catch (error) {
            console.error('Error:', error)
            toast.error('Gagal memuat data pegawai')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPegawai()
    }, [])

    const handleProcessPayment = async (id) => {
        setProcessingId(id)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))

        setPayrollData(prev => ({
            ...prev,
            [id]: { ...prev[id], status: 'Sudah Dibayar', tanggalBayar: new Date().toLocaleDateString('id-ID') }
        }))

        toast.success('Gaji berhasil diproses')
        setProcessingId(null)
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
    }

    const filteredPegawai = pegawai.filter(p =>
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.nip.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="pl-0 hover:pl-2 transition-all">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Kembali ke Dashboard
                            </Button>
                        </Link>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Penggajian (Payroll)</h1>
                    <p className="text-gray-500 mt-1">Kelola gaji guru dan staf</p>
                </div>
            </div>

            <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Cari nama atau NIP..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Daftar Gaji Pegawai</CardTitle>
                            <CardDescription>Periode: {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</CardDescription>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Banknote className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                        </div>
                    ) : filteredPegawai.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Tidak ada data pegawai yang sesuai</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama / NIP</TableHead>
                                        <TableHead>Jabatan</TableHead>
                                        <TableHead>Gaji Pokok</TableHead>
                                        <TableHead>Tunjangan</TableHead>
                                        <TableHead>Total Penerimaan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPegawai.map((p) => {
                                        const payroll = payrollData[p.id] || { gajiPokok: 0, tunjangan: 0, status: '-' }
                                        const total = (payroll.gajiPokok || 0) + (payroll.tunjangan || 0) - (payroll.potongan || 0)

                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <div className="font-medium">{p.nama}</div>
                                                    <div className="text-xs text-gray-500">{p.nip}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{p.jabatan}</Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {formatCurrency(payroll.gajiPokok)}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {formatCurrency(payroll.tunjangan)}
                                                </TableCell>
                                                <TableCell className="font-mono font-bold text-green-700">
                                                    {formatCurrency(total)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={payroll.status === 'Sudah Dibayar' ? 'default' : 'destructive'}
                                                        className={payroll.status === 'Sudah Dibayar' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                                                        {payroll.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {payroll.status === 'Sudah Dibayar' ? (
                                                        <Button variant="ghost" size="sm" className="text-green-600 cursor-default hover:bg-transparent">
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Selesai
                                                        </Button>
                                                    ) : (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                                    Proses
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Konfirmasi Pembayaran Gaji</DialogTitle>
                                                                    <DialogDescription>
                                                                        Anda akan memproses pembayaran gaji untuk <strong>{p.nama}</strong> senilai <strong>{formatCurrency(total)}</strong>.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-4 py-4">
                                                                    <div className="bg-gray-50 p-4 rounded-md space-y-2 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span>Gaji Pokok:</span>
                                                                            <span>{formatCurrency(payroll.gajiPokok)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Tunjangan:</span>
                                                                            <span>{formatCurrency(payroll.tunjangan)}</span>
                                                                        </div>
                                                                        <div className="border-t pt-2 mt-2 font-bold flex justify-between">
                                                                            <span>Total Transfer:</span>
                                                                            <span>{formatCurrency(total)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        className="w-full bg-green-600 hover:bg-green-700"
                                                                        onClick={() => handleProcessPayment(p.id)}
                                                                        disabled={processingId === p.id}
                                                                    >
                                                                        {processingId === p.id ? (
                                                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
                                                                        ) : (
                                                                            <>Konfirmasi Transfer</>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
