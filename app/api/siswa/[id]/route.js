import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'

const buildSiswaFilter = (id) => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ id }, { _id: new ObjectId(id) }] }
  }
  return { id }
}

const normalizeTanggalMasuk = (value) => {
  if (!value) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME)

    const { id: ignoredId, _id, tanggalMasuk, ...rest } = data
    const updateData = {
      ...rest,
      tanggalMasuk: normalizeTanggalMasuk(tanggalMasuk),
      updatedAt: new Date()
    }

    const result = await db.collection('siswa').findOneAndUpdate(
      buildSiswaFilter(id),
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result?.value) {
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan' },
        { status: 404 }
      )
    }

    const { _id: resultId, id: siswaId, ...cleanSiswa } = result.value

    return NextResponse.json({
      ...cleanSiswa,
      id: siswaId || resultId.toString()
    })
  } catch (error) {
    console.error('Error updating siswa:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui siswa' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    const client = await clientPromise
    const db = client.db(process.env.DB_NAME)

    const result = await db.collection('siswa').findOneAndDelete(buildSiswaFilter(id))

    if (!result?.value) {
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Siswa berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting siswa:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus siswa' },
      { status: 500 }
    )
  }
}
