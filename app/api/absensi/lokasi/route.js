import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.DB_NAME)
    const lokasi = await db.collection('settings').findOne({ key: 'lokasi_kantor' })
    return NextResponse.json(lokasi?.value || { lat: -6.9175, lng: 107.6191, radius: 20 })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat lokasi' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const client = await clientPromise
    const db = client.db(process.env.DB_NAME)
    await db.collection('settings').updateOne(
      { key: 'lokasi_kantor' },
      { $set: { key: 'lokasi_kantor', value: data, updatedAt: new Date() } },
      { upsert: true }
    )
    return NextResponse.json({ message: 'Lokasi berhasil disimpan' })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menyimpan lokasi' }, { status: 500 })
  }
}
