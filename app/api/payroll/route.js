import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const bulan = parseInt(searchParams.get('bulan'))
    const tahun = parseInt(searchParams.get('tahun'))

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    const kinerjaData = await db.collection('kinerja')
      .find({ bulan, tahun })
      .sort({ tanggal: 1 })
      .toArray()

    const { ObjectId } = await import('mongodb')
    const payrollMap = {}

    for (const item of kinerjaData) {
      const pid = item.pengajar_id

      if (!payrollMap[pid]) {
        // Prioritas 1: ambil dari field pengajar_nama yang tersimpan di dokumen kinerja
        let pengajar_nama = item.pengajar_nama || ''

        // Prioritas 2: kalau kosong, baru lookup ke collection pegawai
       // Prioritas 2: lookup ke collection pegawai pakai field id
if (!pengajar_nama) {
  try {
    const pegawai = await db.collection('pegawai').findOne({ id: pid })
    pengajar_nama = pegawai?.nama || ''
  } catch (e) {}
}

// Prioritas 3: cari di users
if (!pengajar_nama) {
  try {
    const user = await db.collection('users').findOne({ id: pid })
    pengajar_nama = user?.nama || user?.name || 'Tidak diketahui'
  } catch (e) {}
}

        payrollMap[pid] = {
          pengajar_id: pid,
          pengajar_nama,
          total_gaji: 0,
          total_jam: 0,
          jumlah_sesi: 0,
          rincian: []
        }
      }

      payrollMap[pid].total_gaji += item.gaji || 0
      payrollMap[pid].total_jam += item.menit_mengajar || 0
      payrollMap[pid].jumlah_sesi += 1
      payrollMap[pid].rincian.push({
        id: item._id.toString(),
        tanggal: item.tanggal,
        jam_mulai: item.jam_mulai,
        jam_selesai: item.jam_selesai,
        jenjang: item.jenjang,
        kategori: item.kategori,
        menit_mengajar: item.menit_mengajar,
        gaji: item.gaji,
        keterangan: item.keterangan
      })
    }

    const payrollArray = Object.values(payrollMap)
      .sort((a, b) => b.total_gaji - a.total_gaji)

    return NextResponse.json(payrollArray)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json({ error: 'Gagal memuat payroll' }, { status: 500 })
  }
}
