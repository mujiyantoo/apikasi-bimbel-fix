import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    const query = {}
    if (startDate && endDate) {
      query.tanggal = { $gte: startDate, $lte: endDate }
    } else {
      // Jika tidak ada parameter tanggal, kita asumsikan kosong dulu
      return NextResponse.json([])
    }

    const kinerjaData = await db.collection('kinerja')
      .find(query)
      .sort({ tanggal: 1 })
      .toArray()

    const { ObjectId } = await import('mongodb')
    const payrollMap = {}

    for (const item of kinerjaData) {
      const pid = item.pengajar_id

      if (!payrollMap[pid]) {
        // Prioritas 1: ambil dari field pengajar_nama yang tersimpan di dokumen kinerja
        let pengajar_nama = item.pengajar_nama || ''

        // Prioritas 2: lookup ke collection pegawai via _id (ObjectId) atau string id
        if (!pengajar_nama) {
          try {
            let pegawai = null
            // Coba cari sebagai ObjectId
            try {
              const { ObjectId: ObjId } = await import('mongodb')
              pegawai = await db.collection('pegawai').findOne({ _id: new ObjId(pid) })
            } catch (e) { }
            // Fallback: cari sebagai string field
            if (!pegawai) {
              pegawai = await db.collection('pegawai').findOne({ id: pid })
            }
            pengajar_nama = pegawai?.nama || ''
          } catch (e) { }
        }

        // Prioritas 3: cari di users
        if (!pengajar_nama) {
          try {
            let user = null
            try {
              const { ObjectId: ObjId } = await import('mongodb')
              user = await db.collection('users').findOne({ _id: new ObjId(pid) })
            } catch (e) { }
            if (!user) {
              user = await db.collection('users').findOne({ id: pid })
            }
            pengajar_nama = user?.nama || user?.name || 'Tidak diketahui'
          } catch (e) { }
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

    // Gabungkan entri yang punya pengajar_nama sama (deduplikasi by nama)
    const mergedMap = {}
    for (const entry of Object.values(payrollMap)) {
      const key = (entry.pengajar_nama || 'Tidak diketahui').trim().toLowerCase()
      if (!mergedMap[key]) {
        mergedMap[key] = { ...entry, rincian: [...entry.rincian] }
      } else {
        mergedMap[key].total_gaji += entry.total_gaji
        mergedMap[key].total_jam += entry.total_jam
        mergedMap[key].jumlah_sesi += entry.jumlah_sesi
        mergedMap[key].rincian = [...mergedMap[key].rincian, ...entry.rincian]
      }
    }

    // Urutkan rincian per pengajar berdasarkan tanggal
    for (const entry of Object.values(mergedMap)) {
      entry.rincian.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
    }

    const payrollArray = Object.values(mergedMap)
      .sort((a, b) => b.total_gaji - a.total_gaji)

    return NextResponse.json(payrollArray)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json({ error: 'Gagal memuat payroll' }, { status: 500 })
  }
}
