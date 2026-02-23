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
        if (!pengajar_nama) {
  try {
    if (pid && ObjectId.isValid(pid)) {
      console.log('DEBUG pid:', pid, 'isValid:', ObjectId.isValid(pid))
      const pegawai = await db.collection('pegawai').findOne({ _id: new ObjectId(pid) })
      console.log('DEBUG pegawai result:', pegawai)
      pengajar_nama = pegawai?.nama || ''
    } else {
      console.log('DEBUG pid tidak valid atau kosong:', pid)
    }
  } catch (e) {
    console.log('DEBUG error:', e.message)
  }
}

        // Prioritas 3: kalau masih kosong, coba cari di users
        if (!pengajar_nama) {
          try {
            if (pid && ObjectId.isValid(pid)) {
              const user = await db.collection('users').findOne({ _id: new ObjectId(pid) })
              pengajar_nama = user?.nama || user?.name || 'Tidak diketahui'
            }
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
