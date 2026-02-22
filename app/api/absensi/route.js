import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// Koordinat lokasi kantor (ganti dengan koordinat asli)
const LOKASI_KANTOR = {
  lat: -6.9175,  // ← GANTI dengan latitude kantor
  lng: 107.6191  // ← GANTI dengan longitude kantor
}
const RADIUS_METER = 20

function hitungJarak(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const pegawaiId = searchParams.get('pegawai_id')
    const tanggal = searchParams.get('tanggal')
    const bulan = searchParams.get('bulan')
    const tahun = searchParams.get('tahun')

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME)

    let query = {}
    if (pegawaiId) query.pegawai_id = pegawaiId
    if (tanggal) {
      const start = new Date(tanggal)
      start.setHours(0, 0, 0, 0)
      const end = new Date(tanggal)
      end.setHours(23, 59, 59, 999)
      query.waktu_masuk = { $gte: start, $lte: end }
    } else if (bulan && tahun) {
      const start = new Date(parseInt(tahun), parseInt(bulan) - 1, 1)
      const end = new Date(parseInt(tahun), parseInt(bulan), 0, 23, 59, 59)
      query.waktu_masuk = { $gte: start, $lte: end }
    }

    const absensi = await db.collection('absensi').find(query).sort({ waktu_masuk: -1 }).toArray()
    const formatted = absensi.map(a => ({ ...a, id: a._id.toString() }))
    return NextResponse.json(formatted)
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat absensi' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { pegawai_id, pegawai_nama, lat, lng, tipe } = data

    // Validasi jarak
    const jarak = hitungJarak(lat, lng, LOKASI_KANTOR.lat, LOKASI_KANTOR.lng)
    if (jarak > RADIUS_METER) {
      return NextResponse.json({
        error: `Anda berada ${Math.round(jarak)} meter dari kantor. Harus dalam radius ${RADIUS_METER} meter.`
      }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME)
    const sekarang = new Date()
    const hariIni = new Date()
    hariIni.setHours(0, 0, 0, 0)
    const besok = new Date(hariIni)
    besok.setDate(besok.getDate() + 1)

    // Cek absensi hari ini
    const absensiHariIni = await db.collection('absensi').findOne({
      pegawai_id,
      waktu_masuk: { $gte: hariIni, $lt: besok }
    })

    if (tipe === 'masuk') {
      if (absensiHariIni) {
        return NextResponse.json({ error: 'Anda sudah absen masuk hari ini' }, { status: 400 })
      }
      const result = await db.collection('absensi').insertOne({
        pegawai_id,
        pegawai_nama,
        waktu_masuk: sekarang,
        waktu_keluar: null,
        lat_masuk: lat,
        lng_masuk: lng,
        jarak_masuk: Math.round(jarak),
        status: 'Hadir',
        createdAt: sekarang
      })
      return NextResponse.json({ message: 'Absen masuk berhasil', id: result.insertedId })
    }

    if (tipe === 'keluar') {
      if (!absensiHariIni) {
        return NextResponse.json({ error: 'Anda belum absen masuk hari ini' }, { status: 400 })
      }
      if (absensiHariIni.waktu_keluar) {
        return NextResponse.json({ error: 'Anda sudah absen keluar hari ini' }, { status: 400 })
      }
      const { ObjectId } = await import('mongodb')
      await db.collection('absensi').updateOne(
        { _id: absensiHariIni._id },
        { $set: { waktu_keluar: sekarang, lat_keluar: lat, lng_keluar: lng, jarak_keluar: Math.round(jarak) } }
      )
      return NextResponse.json({ message: 'Absen keluar berhasil' })
    }

    return NextResponse.json({ error: 'Tipe tidak valid' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menyimpan absensi' }, { status: 500 })
  }
}
