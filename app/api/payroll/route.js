import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const bulan = parseInt(searchParams.get('bulan'))
    const tahun = parseInt(searchParams.get('tahun'))

    const client = await clientPromise
    const db = client.db('bimbel_db')

    // Ambil semua kinerja di bulan/tahun tersebut
    const kinerjaData = await db.collection('kinerja')
      .find({ bulan, tahun })
      .sort({ tanggal: 1 })
      .toArray()

    // Group by pengajar_id
    const payrollMap = {}

    for (const item of kinerjaData) {
      const { ObjectId } = await import('mongodb')
      
      if (!payrollMap[item.pengajar_id]) {
        // Fetch data pengajar
        const pengajar = await db.collection('pegawai').findOne({ 
          _id: new ObjectId(item.pengajar_id) 
        })

        payrollMap[item.pengajar_id] = {
          pengajar_id: item.pengajar_id,
          pengajar_nama: pengajar?.nama || 'Tidak diketahui',
          pengajar_email: pengajar?.email || '',
          total_gaji: 0,
          total_jam: 0,
          jumlah_sesi: 0,
          rincian: []
        }
      }

      payrollMap[item.pengajar_id].total_gaji += item.gaji
      payrollMap[item.pengajar_id].total_jam += item.menit_mengajar
      payrollMap[item.pengajar_id].jumlah_sesi += 1
      payrollMap[item.pengajar_id].rincian.push({
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

    return NextResponse.json(payrollArray)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json({ error: 'Gagal memuat payroll' }, { status: 500 })
  }
}
