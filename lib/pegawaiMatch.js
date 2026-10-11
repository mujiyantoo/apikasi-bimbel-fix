// lib/pegawaiMatch.js
//
// Utilitas untuk mencocokkan akun user (koleksi `users`) dengan data pegawai
// (koleksi `pegawai`).
//
// Masalah lama: pencocokan HANYA memakai nama persis (`^nama$`, case-insensitive).
// Akibatnya banyak guru/pegawai gagal membuka halaman Kinerja karena nama akun
// berbeda sedikit dari data pegawai, misalnya:
//   akun: "Sanny"   data pegawai: "Sanny, S.Pd"
//   akun: "Didah"   data pegawai: "Hj. Didah"
//
// Urutan pencocokan sekarang:
//   1) tautan eksplisit  -> pegawai.user_id / pegawai.userId / pegawai.akun_id / pegawai.id
//   2) email             -> cocok tanpa peduli huruf besar/kecil
//   3) nama ternormalisasi (gelar & tanda baca dibuang)

// Gelar/awalan yang dibuang saat membandingkan nama.
// Ditulis SETELAH titik dihilangkan, contoh "S.Pd" -> "spd", "Hj." -> "hj".
const GELAR = new Set([
  'spd', 'ssi', 'ssos', 'sag', 'se', 'skom', 'st', 'sh', 'spsi', 'sip', 'sfa',
  'sked', 'skep', 'sos', 'spwk', 'shum', 'sfil', 'spi',
  'mpd', 'msi', 'mm', 'mag', 'mkom', 'mt', 'mh', 'med', 'mpi', 'mkes', 'msos',
  'amd', 'ama', 'ap', 'apl',
  'dr', 'drs', 'dra', 'hj', 'h', 'kh', 'ny', 'nj', 'ust', 'ustadz', 'ustadzah',
  'prof', 'ir', 'ns', 'bd'
])

/**
 * Normalisasi nama untuk perbandingan:
 *  - huruf kecil, tanpa diakritik
 *  - titik antar huruf dihapus ("S.Pd" -> "spd")
 *  - tanda baca lain dianggap pemisah ("Sanny, S.Pd" -> "sanny spd")
 *  - gelar/awalan dibuang
 *  - spasi dirapikan
 */
export function normalizeName(input) {
  let s = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')

  // "s.pd" -> "spd" (hapus titik yang diapit huruf)
  s = s.replace(/\.(?=[a-z])/g, '')
  // sisanya (koma, titik sisa, tanda baca) jadi pemisah
  s = s.replace(/[^a-z0-9\s]/g, ' ')

  const tokens = s.split(/\s+/).filter(Boolean).filter((t) => !GELAR.has(t))
  return tokens.join(' ')
}

/**
 * Cari dokumen `pegawai` milik user yang sedang login.
 * Mengembalikan dokumen pegawai, atau null kalau tidak ada / ambigu.
 */
export async function resolvePegawaiForSession(db, session) {
  const user = session?.user || {}
  const userId = user.id
  const email = String(user.email || '').trim()
  const name = String(user.name || user.nama || '').trim()

  // 1) Tautan eksplisit — paling akurat kalau admin sudah menautkan akun.
  if (userId) {
    const byLink = await db.collection('pegawai').findOne({
      $or: [{ user_id: userId }, { userId: userId }, { akun_id: userId }, { id: userId }]
    })
    if (byLink) return byLink
  }

  // 2) Email (tanpa peduli huruf besar/kecil)
  if (email) {
    const esc = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const byEmail = await db.collection('pegawai').findOne({
      email: { $regex: '^' + esc + '$', $options: 'i' }
    })
    if (byEmail) return byEmail
  }

  // 3) Nama ternormalisasi
  const target = normalizeName(name)
  if (!target) return null

  const semua = await db.collection('pegawai').find({}).toArray()

  const scored = []
  for (const p of semua) {
    const pn = normalizeName(p.nama || p.name || '')
    if (!pn) continue
    let score = 0
    if (pn === target) {
      score = 3 // sama persis setelah dinormalisasi
    } else if ((' ' + pn + ' ').includes(' ' + target + ' ')) {
      score = 2 // semua kata pada nama akun ada di nama pegawai (mis. "sanny" vs "sanny marlina")
    }
    if (score > 0) scored.push({ p, pn, score })
  }

  if (scored.length === 0) return null

  const best = Math.max(...scored.map((x) => x.score))
  const top = scored.filter((x) => x.score === best)

  if (top.length === 1) return top[0].p

  // Ambigu: jangan menebak, karena ini berkaitan dengan gaji/kinerja.
  console.warn(
    `[pegawaiMatch] Nama akun "${name}" cocok ambigu dengan ${top.length} data pegawai: ` +
    top.map((t) => `"${t.pn}"`).join(', ') +
    '. Tautkan akun lewat field pegawai.user_id atau pegawai.email agar pasti.'
  )
  return null
}
