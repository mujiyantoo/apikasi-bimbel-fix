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
        let pengajar_nama = 'Tidak diketahui'
        try {
          if (pid && ObjectId.isValid(pid)) {
            const pengajar = await db.collection('pegawai').findOne({
              _id: new ObjectId(pid)
            })
            pengajar_nama = pengajar?.nama || 'Tidak diketahui'
          }
        } catch (e) {}

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
