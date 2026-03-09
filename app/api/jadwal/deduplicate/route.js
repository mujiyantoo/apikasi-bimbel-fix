import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        const client = await clientPromise
        const db = client.db('bimbel_db')
        const collection = db.collection('jadwal')

        const all = await collection.find({}).toArray()
        const seen = new Set()
        let deleted = 0
        const deletedIds = []

        for (const item of all) {
            const key = `${item.tanggal}_${item.waktu_mulai}_${item.waktu_selesai}_${item.kelas}_${item.mata_pelajaran}_${item.pengajar_id}_${item.ruangan}`;
            if (seen.has(key)) {
                await collection.deleteOne({ _id: item._id })
                deleted++
                deletedIds.push(item._id)
            } else {
                seen.add(key)
            }
        }

        return NextResponse.json({ message: `Deduplication complete. Deleted ${deleted} duplicates.`, deletedIds })
    } catch (error) {
        console.error('Error deduplicating jadwal:', error)
        return NextResponse.json({ error: 'Gagal deduplikasi jadwal' }, { status: 500 })
    }
}
