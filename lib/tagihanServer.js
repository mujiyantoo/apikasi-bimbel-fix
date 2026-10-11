// lib/tagihanServer.js
//
// Logika pembuatan/penrapian tagihan SPP (server-only).
// Dipakai oleh:
//   - POST /api/pembayaran/generate  (dipicu admin saat membuka halaman)
//   - GET  /api/cron/tagihan         (dipicu Vercel Cron tiap hari)
//
// Sifatnya IDEMPOTEN: dijalankan berkali-kali hasilnya sama, tidak
// menghasilkan duplikat. Aman dipanggil dari cron maupun dari halaman.

import { ObjectId } from 'mongodb'
import { getPeriode, cekKelayakan, getSPPTarif } from '@/lib/billing'

export async function jalankanGenerateTagihan(db, { dryRun = false } = {}) {
  const col = db.collection('pembayaran')

  const periode = getPeriode(new Date(), -1) // n-1 (contoh: September 2026)
  const bulanIni = getPeriode(new Date(), 0) // n   (contoh: Oktober 2026)

  const tahunQuery = (p) => ({
    $in: [p.tahun, Number(p.tahun)].filter((v) => !Number.isNaN(v))
  })
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
  // 2. Peta siswa
  // ---------------------------------------------------------------------
  const semuaSiswa = await db.collection('siswa').find({}).toArray()
  const siswaById = new Map()
  for (const s of semuaSiswa) {
    siswaById.set(s._id.toString(), s)
    if (s.id) siswaById.set(String(s.id), s)
  }

  // ---------------------------------------------------------------------
  // 3. Semua tagihan SPP periode n-1 — PENDING MAUPUN LUNAS.
  //
  // PENTING: tagihan yang sudah LUNAS harus dianggap "sudah ada".
  // Kalau hanya melihat status pending, siswa yang SUDAH MEMBAYAR akan
  // ditagih ulang (bug: muncul tagihan baru untuk periode yang sama).
  // ---------------------------------------------------------------------
  const tagihanPeriode = await col
    .find({ jenis: 'SPP', bulan: bulanRegex(periode.bulan), tahun: tahunQuery(periode) })
    .sort({ createdAt: 1 })
    .toArray()

  const adaLunas = new Set(
    tagihanPeriode.filter((p) => p.status === 'lunas').map((p) => String(p.siswaId))
  )

  // ---------------------------------------------------------------------
  // 4. Rapikan: buang yang tidak layak, duplikat, & pending setelah lunas
  // ---------------------------------------------------------------------
  const hapusIds = []
  const siswaPunyaPending = new Set()
  const siswaSudahPunya = new Set(adaLunas) // lunas = sudah punya tagihan
  const dilewati = []
  let duplikatSetelahLunas = 0

  for (const p of tagihanPeriode) {
    if (p.status !== 'pending') continue

    const kunci = String(p.siswaId)
    const siswa = siswaById.get(kunci)

    if (!siswa) {
      hapusIds.push(p._id)
      continue
    }

    const kel = cekKelayakan(siswa, periode.index)
    if (!kel.layak) {
      hapusIds.push(p._id)
      continue
    }

    // Sudah lunas untuk periode ini → pending-nya jelas duplikat
    if (adaLunas.has(kunci)) {
      hapusIds.push(p._id)
      duplikatSetelahLunas++
      continue
    }

    // Duplikat pending → simpan yang paling lama
    if (siswaPunyaPending.has(kunci)) {
      hapusIds.push(p._id)
      continue
    }

    siswaPunyaPending.add(kunci)
    siswaSudahPunya.add(kunci)
  }

  if (!dryRun && hapusIds.length > 0) {
    await col.deleteMany({ _id: { $in: hapusIds } })
  }

  // ---------------------------------------------------------------------
  // 5. Buat tagihan yang belum ada (hanya jika sudah lewat tanggal 1)
  // ---------------------------------------------------------------------
  const dokumenBaru = []
  if (periode.hariIni > 1) {
    for (const s of semuaSiswa) {
      const sid = s._id.toString()
      if (siswaSudahPunya.has(sid)) continue
      if (siswaSudahPunya.has(String(s.id))) continue

      const kel = cekKelayakan(s, periode.index)
      if (!kel.layak) {
        if (dilewati.length < 50) dilewati.push({ nama: s.nama, alasan: kel.alasan })
        continue
      }

      const now = new Date()
      dokumenBaru.push({
        id: new ObjectId().toString(),
        siswaId: sid,
        namaSiswa: s.nama,
        jenis: 'SPP',
        bulan: periode.bulan,
        tahun: periode.tahun,
        jumlah: getSPPTarif(s.kelas),
        status: 'pending',
        keterangan: `SPP ${periode.bulan} ${periode.tahun} - ${s.kelas || '-'}`,
        createdAt: now,
        updatedAt: now
      })
    }
  }

  if (!dryRun && dokumenBaru.length > 0) {
    await col.insertMany(dokumenBaru, { ordered: false })
  }

  // ---------------------------------------------------------------------
  // 6. Pengaman: indeks unik agar duplikat tidak mungkin terbuat lagi.
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
  // 7. Verifikasi hasil (baca ulang dari database)
  // ---------------------------------------------------------------------
  const totalPendingPeriode = await col.countDocuments({
    jenis: 'SPP',
    status: 'pending',
    bulan: bulanRegex(periode.bulan),
    tahun: tahunQuery(periode)
  })

  return {
    ok: true,
    dryRun,
    periode: `${periode.bulan} ${periode.tahun}`,
    tanggalHariIni: periode.hariIni,
    dihapus: {
      bulanBerjalan: jumlahBulanIni,
      tidakLayakAtauDuplikat: hapusIds.length,
      duplikatSetelahLunas
    },
    dibuat: dokumenBaru.length,
    totalTagihanPendingPeriodeIni: totalPendingPeriode,
    siswaDilewati: dilewati,
    indeksUnik: indeks
  }
}
