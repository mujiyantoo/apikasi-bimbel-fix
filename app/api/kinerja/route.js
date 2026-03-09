import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

const TARIF = {
  SD: 24000,
  SMP: 25000,
  SMA: 25000
}

const TARIF_PR_SMA = 25000
const TARIF_PIKET = 7000

function hitungGaji(jenjang, kategori, menitMengajar) {
  // Piket: flat Rp 7.000 per sesi, tidak tergantung jenjang & durasi
  if (kategori === 'Piket') return TARIF_PIKET

  const tarif = TARIF[jenjang]
  if (!tarif) return 0

  if (kategori === 'Reguler') {
    // Flat per sesi
    return tarif
  } else {
    // PR: (menit / 90) × 0.75 × tarif
    const tarifPR = jenjang === 'SMA' ? TARIF_PR_SMA : tarif
    return Math.round((menitMengajar / 90) * 0.75 * tarifPR)
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const pengajar_id = searchParams.get('pengajar_id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    let query = {}
    if (pengajar_id) query.pengajar_id = pengajar_id
    if (startDate && endDate) {
      query.tanggal = { $gte: startDate, $lte: endDate }
    }

    const kinerja = await db.collection('kinerja')
      .find(query)
      .sort({ tanggal: -1 })
      .toArray()

    const { ObjectId } = await import('mongodb')

    const kinerjaWithPengajar = await Promise.all(
      kinerja.map(async (item) => {
        let pengajar_nama = 'Tidak diketahui'
        try {
          if (item.pengajar_id && ObjectId.isValid(item.pengajar_id)) {
            const pengajar = await db.collection('pegawai').findOne({
              _id: new ObjectId(item.pengajar_id)
            })
            pengajar_nama = pengajar?.nama || 'Tidak diketahui'
          }
        } catch (e) { }
        return {
          ...item,
          id: item._id.toString(),
          pengajar_nama
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

    const [jamM, menitM] = jam_mulai.split(':').map(Number)
    const [jamS, menitS] = jam_selesai.split(':').map(Number)
    const menitMengajar = (jamS * 60 + menitS) - (jamM * 60 + menitM)

    if (menitMengajar <= 0) {
      return NextResponse.json(
        { error: 'Jam selesai harus lebih besar dari jam mulai' },
        { status: 400 }
      )
    }

    const gaji = hitungGaji(jenjang, kategori, menitMengajar)

    const tgl = new Date(tanggal)
    const bulan = tgl.getMonth() + 1
    const tahun = tgl.getFullYear()

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    const newKinerja = {
      pengajar_id,
      tanggal,
      jam_mulai,
      jam_selesai,
      jenjang: jenjang || '-',
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

    if (!id) {
      return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })
    }

    const { ObjectId } = await import('mongodb')
    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    const result = await db.collection('kinerja').deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Kinerja berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting kinerja:', error)
    return NextResponse.json({ error: 'Gagal menghapus kinerja' }, { status: 500 })
  }
}
