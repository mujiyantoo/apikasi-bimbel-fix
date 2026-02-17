import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const client = await clientPromise
    const db = client.db('bimbel_db')

    let query = {}
    if (search) {
      query.$or = [
        { nama_lengkap: { $regex: search, $options: 'i' } },
        { telepon: { $regex: search, $options: 'i' } }
      ]
    }
    if (status && status !== 'all') {
      query.status = status
    }

    const pendaftaran = await db.collection('pendaftaran').find(query).sort({ createdAt: -1 }).toArray()

    const formatted = pendaftaran.map(p => ({
      ...p,
      id: p._id.toString()
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error fetching pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal memuat data pendaftaran' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()

    const client = await clientPromise
    const db = client.db('bimbel_db')

    const newPendaftaran = {
      ...data,
      status: 'Baru',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('pendaftaran').insertOne(newPendaftaran)

    await db.collection('activities').insertOne({
      type: 'pendaftaran',
      description: `Pendaftaran baru: ${data.nama_lengkap} (${data.kelas})`,
      createdAt: new Date()
    })

    return NextResponse.json(
      { message: 'Pendaftaran berhasil disimpan', id: result.insertedId },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error saving pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal menyimpan pendaftaran' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { id, status } = data

    const { ObjectId } = await import('mongodb')
    const client = await clientPromise
    const db = client.db('bimbel_db')

    await db.collection('pendaftaran').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    )

    return NextResponse.json({ message: 'Status berhasil diupdate' })
  } catch (error) {
    console.error('Error updating pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal update status' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { ObjectId } = await import('mongodb')
    const client = await clientPromise
    const db = client.db('bimbel_db')

    await db.collection('pendaftaran').deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({ message: 'Data pendaftaran berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal menghapus pendaftaran' }, { status: 500 })
  }
}
