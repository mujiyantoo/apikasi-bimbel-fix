import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders })
}

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

    return NextResponse.json(formatted, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal memuat data pendaftaran' }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

    const client = await clientPromise
    const db = client.db('bimbel_db')

    const countFromIP = await db.collection('pendaftaran').countDocuments({ ip_address: ip })

    if (countFromIP >= 2) {
      return NextResponse.json(
        { error: 'Batas pendaftaran tercapai. Anda hanya dapat mendaftar maksimal 2 kali dari perangkat yang sama.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const newPendaftaran = {
      ...data,
      ip_address: ip,
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
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error saving pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal menyimpan pendaftaran' }, { status: 500, headers: corsHeaders })
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

    return NextResponse.json({ message: 'Status berhasil diupdate' }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error updating pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal update status' }, { status: 500, headers: corsHeaders })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400, headers: corsHeaders })
    }

    const { ObjectId } = await import('mongodb')
    const client = await clientPromise
    const db = client.db('bimbel_db')

    const result = await db.collection('pendaftaran').deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404, headers: corsHeaders })
    }

    return NextResponse.json({ message: 'Data pendaftaran berhasil dihapus' }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error deleting pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal menghapus pendaftaran' }, { status: 500, headers: corsHeaders })
  }
}
