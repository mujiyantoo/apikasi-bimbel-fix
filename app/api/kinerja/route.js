import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// Tarif per jenjang
const TARIF = {
  SD: { reguler: 24000, durasi: 90 },
  SMP: { reguler: 26000, durasi: 90 },
  SMA: { reguler: 22000, durasi: 60 }
}

function hitungGaji(jenjang, kategori, menitMengajar) {
  const tarif = TARIF[jenjang]
  if (!tarif) return 0

  if (kategori === 'Reguler') {
    // Reguler: (menit / durasi standar) × tarif
    return (menitMengajar / tarif.durasi) * tarif.reguler
  } else {
    // PR: (menit / durasi standar) × 75% × tarif
    return (menitMengajar / tarif.durasi) * 0.75 * tarif.reguler
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const pengajar_id = searchParams.get('pengajar_id')
    const bulan = searchParams.get('bulan')
    const tahun = searchParams.get('tahun')

    const client = await clientPromise
    const db = client.db('bimbel_db')

    let query = {}
    if (pengajar_id) query.pengajar_id = pengajar_id
    if (bulan) query.bulan = parseInt(bulan)
    if (tahun) query.tahun = parseInt(tahun)

    const kinerja = await db.collection('kinerja')
      .find(query)
      .sort({ tanggal: -1 })
      .toArray()

    // Populate pengajar
    const kinerjaWithPengajar = await Promise.all(
      kinerja.map(async (item) => {
        const { ObjectId } = await import('mongodb')
        const pengajar = await db.collection('pegawai').findOne({ 
          _id: new ObjectId(item.pengajar_id) 
        })
        return {
          ...item,
          id: item._id.toString(),
          pengajar_nama: pengajar?.nama || 'Tidak diketahui'
        }
      })
    )

    return NextResponse.json(kinerjaWithPengajar)
  } catch (error) {
    console.error('Error fetching kinerja:', error)
    return NextResponse.json({ error: 'Gagal memuat kinerja' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { pengajar_id, tanggal, jam_mulai, jam_selesai, jenjang, kategori, keterangan } = data

    // Hitung durasi dalam menit
    const [jamM, menitM] = jam_mulai.split(':').map(Number)
    const [jamS, menitS] = jam_selesai.split(':').map(Number)
    const totalMenitMulai = jamM * 60 + menitM
    const totalMenitSelesai = jamS * 60 + menitS
    const menitMengajar = totalMenitSelesai - totalMenitMulai

    if (menitMengajar <= 0) {
      return NextResponse.json({ error: 'Jam selesai harus lebih besar dari jam mulai' }, { status: 400 })
    }

    // Hitung gaji
    const gaji = hitungGaji(jenjang, kategori, menitMengajar)

    // Ambil bulan dan tahun dari tanggal
    const tgl = new Date(tanggal)
    const bulan = tgl.getMonth() + 1
    const tahun = tgl.getFullYear()

    const client = await clientPromise
    const db = client.db('bimbel_db')

    const newKinerja = {
      pengajar_id,
      tanggal,
      jam_mulai,
      jam_selesai,
      jenjang,
      kategori,
      menit_mengajar: menitMengajar,
      gaji,
      bulan,
      tahun,
      keterangan: keterangan || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('kinerja').insertOne(newKinerja)

    return NextResponse.json(
      { message: 'Kinerja berhasil ditambahkan', id: result.insertedId, gaji },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating kinerja:', error)
    return NextResponse.json({ error: 'Gagal menambahkan kinerja' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { ObjectId } = await import('mongodb')
    const client = await clientPromise
    const db = client.db('bimbel_db')

    await db.collection('kinerja').deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({ message: 'Kinerja berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting kinerja:', error)
    return NextResponse.json({ error: 'Gagal menghapus kinerja' }, { status: 500 })
  }
}
