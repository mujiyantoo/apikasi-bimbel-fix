import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        const client = await clientPromise
        const db = client.db('bimbel_db')

        // Get all absensi for today
        const absensi = await db.collection('absensi').find({}).sort({ createdAt: -1 }).limit(10).toArray()

        // Get all jadwal for Senin
        const jadwal = await db.collection('jadwal').find({ hari: 'Senin' }).toArray()

        const absensiData = absensi.map(a => ({
            nama: a.pegawai_nama,
            id: a.pegawai_id,
            id_type: typeof a.pegawai_id
        }))

        const jadwalData = jadwal.map(j => ({
            nama: j.pengajar_nama || '?',
            id: j.pengajar_id,
            id_type: typeof j.pengajar_id
        }))

        return NextResponse.json({ absensiData, jadwalData })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
