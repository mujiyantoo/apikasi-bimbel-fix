import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const hari = searchParams.get('hari')
    const tanggal = searchParams.get('tanggal')
    const client = await clientPromise
    const db = client.db('bimbel_db')

    let query = {}
    if (hari && hari !== 'all') query.hari = hari
    if (tanggal) query.tanggal = tanggal

    const jadwal = await db.collection('jadwal')
      .find(query)
      .sort({ waktu_mulai: 1 })
      .toArray()

    const jadwalWithPengajar = await Promise.all(
      jadwal.map(async (item) => {
        let pengajar = null
        try {
          // Coba cari sebagai ObjectId (_id)
          try {
            if (ObjectId.isValid(item.pengajar_id)) {
              pengajar = await db.collection('pegawai').findOne({ _id: new ObjectId(item.pengajar_id) })
            }
          } catch (e) { }
          // Fallback: cari sebagai string field id
          if (!pengajar) {
            pengajar = await db.collection('pegawai').findOne({ id: item.pengajar_id })
          }
        } catch (e) {
          console.error('Error lookup pengajar:', item.pengajar_id, e)
        }
        return {
          ...item,
          id: item._id.toString(),
          pengajar_id: item.pengajar_id?.toString(),
          pengajar_nama: pengajar?.nama || 'Tidak diketahui'
        }
      })
    )

    return NextResponse.json(jadwalWithPengajar)
  } catch (error) {
    console.error('Error fetching jadwal:', error)
    return NextResponse.json({ error: 'Gagal memuat jadwal' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const client = await clientPromise
    const db = client.db('bimbel_db')

    // DIUBAH: simpan pengajar_id sebagai string UUID, bukan ObjectId
    const newJadwal = {
      ...data,
      pengajar_id: data.pengajar_id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('jadwal').insertOne(newJadwal)
    return NextResponse.json(
      { message: 'Jadwal berhasil ditambahkan', id: result.insertedId },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating jadwal:', error)
    return NextResponse.json({ error: 'Gagal menambahkan jadwal' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data
    const client = await clientPromise
    const db = client.db('bimbel_db')

    // DIUBAH: pengajar_id tetap string UUID, tidak dikonversi
    await db.collection('jadwal').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    )

    return NextResponse.json({ message: 'Jadwal berhasil diupdate' })
  } catch (error) {
    console.error('Error updating jadwal:', error)
    return NextResponse.json({ error: 'Gagal update jadwal' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const client = await clientPromise
    const db = client.db('bimbel_db')

    await db.collection('jadwal').deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ message: 'Jadwal berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting jadwal:', error)
    return NextResponse.json({ error: 'Gagal menghapus jadwal' }, { status: 500 })
  }
}
