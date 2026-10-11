import { NextResponse } from 'next/server'
import { getMongoConnection } from '@/lib/mongodb'
import { getApiSession, isAdmin } from '@/lib/apiAuth'
import { ObjectId } from 'mongodb'
import {
  getPeriode,
  cekKelayakan,
  isSamePeriode,
  getSPPTarif,
  normalizeTahun
} from '@/lib/billing'

export const dynamic = 'force-dynamic'

// ===========================================================================
// POST /api/pembayaran/generate
//
// Membuat / merapikan tagihan SPP secara AMAN dan IDEMPOTEN.
// Aman dipanggil berkali-kali: hasilnya sama, tidak menghasilkan duplikat.
//
// Yang dilakukan:
//   1. Hapus tagihan pending periode BULAN BERJALAN (aturan n-1).
//   2. Hapus tagihan pending periode n-1 milik siswa yang TIDAK layak
//      (status cuti/nonaktif, atau masuk setelah periode tagihan).
//   3. Hapus DUPLIKAT tagihan pending untuk periode n-1 (sisakan satu).
//   4. Buat tagihan untuk siswa aktif yang belum punya (hanya jika tgl > 1).
//
// Body (opsional): { "dryRun": true } untuk pratinjau tanpa menulis.
// ===========================================================================
export async function POST(request) {
  try {
    const session = await getApiSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const connection = await getMongoConnection()
    if (!connection) {
      return NextResponse.json({ error: 'Database tidak tersedia' }, { status: 503 })
    }
    const { db } = connection

    let dryRun = false
    try {
      const body = await request.json()
      dryRun = body?.dryRun === true
    } catch { /* body kosong = bukan dry run */ }

    const col = db.collection('pembayaran')

    const periode = getPeriode(new Date(), -1)   // n-1 (contoh: September 2026)
    const bulanIni = getPeriode(new Date(), 0)   // n   (contoh: Oktober 2026)

    const tahunQuery = (p) =>
      ({ $in: [p.tahun, Number(p.tahun)].filter((v) => !Number.isNaN(v)) })

    const bulanRegex = (b) => new RegExp(`^${b}$`, 'i')

    // ---------------------------------------------------------------------
    // 1. Hapus tagihan pending periode BULAN BERJALAN (aturan n-1)
    // ---------------------------------------------------------------------
    const filterBulanIni = {
      jenis: 'SPP',
      status: 'pending',
      bulan: bulanRegex(bulanIni.bulan),
      tahun: tahunQuery(bulanIni)
    }
    const jumlahBulanIni = await col.countDocuments(filterBulanIni)
    if (!dryRun && jumlahBulanIni > 0) {
      await col.deleteMany(filterBulanIni)
    }

    // ---------------------------------------------------------------------
    // 2. Siapkan peta siswa
    // ---------------------------------------------------------------------
    const semuaSiswa = await db.collection('siswa').find({}).toArray()
    const siswaById = new Map()
    for (const s of semuaSiswa) {
      siswaById.set(s._id.toString(), s)
      if (s.id) siswaById.set(String(s.id), s)
    }

    const periodeNum = { bulan: periode.bulan, tahun: periode.tahun }

    const pendingPeriode = await col
      .find({ jenis: 'SPP', status: 'pending', bulan: bulanRegex(periode.bulan), tahun: tahunQuery(periode) })
      .sort({ createdAt: 1 })
      .toArray()

    // ---------------------------------------------------------------------
    // 3. Tandai yang tidak layak + duplikat
    // ---------------------------------------------------------------------
    const hapusIds = []
    const siswaSudahPunya = new Set()
    const dilewati = []

    for (const p of pendingPeriode) {
      const siswa = siswaById.get(String(p.siswaId))

      if (!siswa) {
        hapusIds.push(p._id)
        continue
      }

      const kel = cekKelayakan(siswa, periode.index)
      if (!kel.layak) {
        hapusIds.push(p._id)
        continue
      }

      const kunci = String(p.siswaId)
      if (siswaSudahPunya.has(kunci)) {
        hapusIds.push(p._id) // duplikat → simpan yang paling lama
        continue
      }
      siswaSudahPunya.add(kunci)
    }

    if (!dryRun && hapusIds.length > 0) {
      await col.deleteMany({ _id: { $in: hapusIds } })
    }

    // ---------------------------------------------------------------------
    // 4. Buat tagihan yang belum ada
    // ---------------------------------------------------------------------
    const dokumenBaru = []
    if (periode.hariIni > 1) {
      const no = String(periode.tahun) + String(BULAN_INDEX(periode.bulan) + 1).padStart(2, '0')
      let urut = 0

      for (const s of semuaSiswa) {
        const sid = s._id.toString()
        if (siswaSudahPunya.has(sid)) continue
        if (siswaSudahPunya.has(String(s.id))) continue

        const kel = cekKelayakan(s, periode.index)
        if (!kel.layak) {
          if (dilewati.length < 50) {
            dilewati.push({ nama: s.nama, alasan: kel.alasan })
          }
          continue
        }

        const jumlah = getSPPTarif(s.kelas)
        const now = new Date()
        dokumenBaru.push({
          id: new ObjectId().toString(),
          siswaId: sid,
          namaSiswa: s.nama,
          jenis: 'SPP',
          bulan: periode.bulan,
          tahun: periode.tahun,
          jumlah,
          status: 'pending',
          keterangan: `SPP ${periode.bulan} ${periode.tahun} - ${s.kelas || '-'}`,
          createdAt: now,
          updatedAt: now
        })
        urut++
      }
    }

    if (!dryRun && dokumenBaru.length > 0) {
      await col.insertMany(dokumenBaru, { ordered: false })
    }

    // ---------------------------------------------------------------------
    // 5. Pengaman: indeks unik agar duplikat tidak mungkin terbuat lagi.
    //    (best-effort — kalau data lama masih ada duplikat, dibiarkan gagal
    //     dan hanya dicatat, tidak sampai menggagalkan permintaan)
    // ---------------------------------------------------------------------
    let indeks = 'dilewati'
    if (!dryRun) {
      try {
        await col.createIndex(
          { siswaId: 1, jenis: 1, bulan: 1, tahun: 1 },
          {
            unique: true,
            name: 'uniq_tagihan_pending',
            partialFilterExpression: { jenis: 'SPP', status: 'pending' }
          }
        )
        indeks = 'aktif'
      } catch (e) {
        indeks = `gagal: ${e.message}`
      }
    }

    // ---------------------------------------------------------------------
    // 6. Verifikasi hasil (baca ulang dari database)
    // ---------------------------------------------------------------------
    const totalPendingPeriode = await col.countDocuments({
      jenis: 'SPP',
      status: 'pending',
      bulan: bulanRegex(periode.bulan),
      tahun: tahunQuery(periode)
    })

    return NextResponse.json({
      ok: true,
      dryRun,
      periode: `${periode.bulan} ${periode.tahun}`,
      tanggalHariIni: periode.hariIni,
      dihapus: {
        bulanBerjalan: jumlahBulanIni,
        tidakLayakAtauDuplikat: hapusIds.length
      },
      dibuat: dokumenBaru.length,
      totalTagihanPendingPeriodeIni: totalPendingPeriode,
      siswaDilewati: dilewati,
      indeksUnik: indeks
    })
  } catch (error) {
    console.error('POST /api/pembayaran/generate Error:', error)
    return NextResponse.json({ error: 'Gagal membuat tagihan', detail: error.message }, { status: 500 })
  }
}

function BULAN_INDEX(bulan) {
  return [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ].indexOf(bulan)
}
