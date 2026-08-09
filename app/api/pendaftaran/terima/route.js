import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Generate NIS unik: NIS-YYYY-XXX (XXX = counter tahun berjalan)
async function generateNIS(db) {
  const year = new Date().getFullYear()
  const prefix = `NIS-${year}-`
  const last = await db.collection('siswa')
    .find({ nis: { $regex: `^${prefix}` } })
    .sort({ nis: -1 })
    .limit(1)
    .toArray()
  let counter = 1
  if (last.length > 0) {
    const match = last[0].nis.match(/(\d+)$/)
    if (match) counter = parseInt(match[1], 10) + 1
  }
  const nis = `${prefix}${String(counter).padStart(3, '0')}`
  // Pastikan benar-benar unik (jaga-jaga kalau ada gap)
  const existing = await db.collection('siswa').findOne({ nis })
  if (existing) {
    return generateNIS(db) // recursive retry dengan counter berikutnya
  }
  return nis
}

export async function POST(request) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID pendaftaran wajib diisi' }, { status: 400, headers: corsHeaders })
    }

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME)

    // 1. Ambil data pendaftaran
    const pendaftaran = await db.collection('pendaftaran').findOne({ _id: new ObjectId(id) })
    if (!pendaftaran) {
      return NextResponse.json({ error: 'Data pendaftaran tidak ditemukan' }, { status: 404, headers: corsHeaders })
    }

    // Jika sudah pernah diterima, jangan duplikat siswa
    if (pendaftaran.status === 'Diterima') {
      return NextResponse.json(
        { error: 'Pendaftaran ini sudah diterima sebelumnya', nis: pendaftaran.nis_siswa || null },
        { status: 400, headers: corsHeaders }
      )
    }

    // 2. Generate NIS
    const nis = await generateNIS(db)

    // 3. Mapping pendaftaran -> siswa
    const newSiswa = {
      nama: pendaftaran.nama_lengkap || '',
      nis,
      kelas: pendaftaran.kelas || '',
      mataPelajaran: pendaftaran.program || '',
      jenisKelamin: pendaftaran.jenisKelamin || '',
      telepon: pendaftaran.telepon || '',
      alamat: pendaftaran.alamat || '',
      tanggalMasuk: pendaftaran.tanggal ? new Date(pendaftaran.tanggal) : new Date(),
      status: 'Aktif',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const siswaResult = await db.collection('siswa').insertOne(newSiswa)

    // 4. Update status pendaftaran -> Diterima
    await db.collection('pendaftaran').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'Diterima', nis_siswa: nis, updatedAt: new Date() } }
    )

    // 5. Log aktivitas
    await db.collection('activities').insertOne({
      type: 'siswa',
      description: `Siswa baru dari pendaftaran: ${newSiswa.nama} (${newSiswa.kelas}) - NIS ${nis}`,
      createdAt: new Date()
    })

    return NextResponse.json(
      { message: 'Pendaftaran diterima & dipindahkan ke Data Siswa', nis, siswaId: siswaResult.insertedId },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error terima pendaftaran:', error)
    return NextResponse.json({ error: 'Gagal memproses pendaftaran: ' + error.message }, { status: 500, headers: corsHeaders })
  }
}
