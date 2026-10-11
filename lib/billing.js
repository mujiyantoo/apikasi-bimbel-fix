// lib/billing.js
//
// Aturan tagihan SPP terpusat — dipakai server (API) DAN browser (halaman).
//
// Aturan bisnis: "n-1"
//   Tagihan terbit otomatis SETELAH tanggal 1, untuk BULAN SEBELUMNYA.
//   Contoh: pada 7 Oktober 2026 → tagihan periode September 2026.
//
// Latar belakang perbaikan (temuan bug):
//   1. Pengecualian status siswa peka huruf besar/kecil → 'cuti'/'CUTI' lolos.
//   2. Siswa tanpa tanggalMasuk selalu ikut ditagih.
//   3. new Date('07/10/2026') dibaca JavaScript sebagai 10 Juli (format US).
//   4. Perbandingan tahun memakai === antara teks "2026" dan angka 2026.
//   5. Tagihan dibuat di sisi browser → bisa jalan tiap halaman dibuka,
//      berisiko duplikat.

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export const SPP_TARIF = { SD: 200000, SMP: 250000, SMA: 250000 }

export function getSPPTarif(kelas = '') {
  const k = String(kelas).toUpperCase()
  if (k.includes('SMA') || /^(10|11|12|X|XI|XII)\b/.test(k)) return SPP_TARIF.SMA
  if (k.includes('SMP') || /^(7|8|9|VII|VIII|IX)\b/.test(k)) return SPP_TARIF.SMP
  if (k.includes('SD') || /^[1-6]\b/.test(k)) return SPP_TARIF.SD
  return SPP_TARIF.SD
}

// ---------------------------------------------------------------------------
// Zona waktu: perhitungan bulan HARUS memakai waktu Indonesia (WIB),
// bukan jam server. Vercel berjalan di UTC, sehingga pada 1 Oktober 00:00-07:00
// WIB server masih menganggap "September".
// ---------------------------------------------------------------------------
function ymdJakarta(date = new Date()) {
  // 'en-CA' menghasilkan format YYYY-MM-DD
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date)
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

/**
 * Periode tagihan (n-1) dalam waktu WIB.
 * @param {Date} [now]
 * @param {number} [offsetBulan] 0 = bulan berjalan, -1 = bulan lalu
 */
export function getPeriode(now = new Date(), offsetBulan = -1) {
  const { y, m, d } = ymdJakarta(now)
  const total = y * 12 + (m - 1) + offsetBulan
  const tahun = Math.floor(total / 12)
  const bulanIdx = ((total % 12) + 12) % 12
  return {
    bulan: BULAN[bulanIdx],
    tahun: String(tahun),
    index: tahun * 12 + bulanIdx,
    hariIni: d,          // tanggal ke berapa (WIB)
    bulanIni: BULAN[m - 1],
    tahunIni: String(y)
  }
}

// ---------------------------------------------------------------------------
// Normalisasi status siswa (tidak peka huruf besar/kecil, spasi, tanda hubung)
// ---------------------------------------------------------------------------
export function normalizeStatus(v) {
  const s = String(v ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ')
  if (!s) return 'aktif' // field kosong = dianggap aktif (perilaku lama)
  if (s === 'aktif' || s === 'active') return 'aktif'
  if (
    s === 'cuti' || s === 'nonaktif' || s === 'non aktif' || s === 'tidak aktif' ||
    s === 'berhenti' || s === 'keluar' || s === 'lulus' || s === 'pindah'
  ) return 'tidak aktif'
  return s
}

export function isAktif(v) {
  return normalizeStatus(v) === 'aktif'
}

// ---------------------------------------------------------------------------
// Normalisasi tanggal — mendukung ISO, format Indonesia (DD/MM/YYYY),
// objek Date, dan timestamp.
// ---------------------------------------------------------------------------
export function parseTanggal(val) {
  if (!val && val !== 0) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val

  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }

  const s = String(val).trim()
  if (!s) return null

  // ISO: 2026-10-07 (dengan/tanpa waktu)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3])
    return isNaN(d.getTime()) ? null : d
  }

  // Indonesia: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    const dd = +m[1]
    const mm = +m[2]
    let yy = +m[3]
    if (yy < 100) yy += 2000
    const d = new Date(yy, mm - 1, dd)
    // validasi balik (menolak 31/02 dsb.)
    if (!isNaN(d.getTime()) && d.getDate() === dd && d.getMonth() === mm - 1 && d.getFullYear() === yy) {
      return d
    }
    return null
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function monthIndexOf(date) {
  return date.getFullYear() * 12 + date.getMonth()
}

export function normalizeTahun(v) {
  return String(v ?? '').trim()
}

export function isSamePeriode(pembayaran, periode) {
  if (!pembayaran) return false
  const b = String(pembayaran.bulan || '').trim().toLowerCase()
  if (b !== periode.bulan.toLowerCase()) return false
  if (normalizeTahun(pembayaran.tahun) !== periode.tahun) return false
  return true
}

/** Tanggal efektif siswa: tanggalMasuk, kalau tidak ada pakai createdAt. */
export function getTanggalEfektif(siswa) {
  const t = parseTanggal(siswa?.tanggalMasuk ?? siswa?.tanggal_masuk)
  if (t) return { date: t, sumber: 'tanggalMasuk' }
  const c = parseTanggal(siswa?.createdAt)
  if (c) return { date: c, sumber: 'createdAt' }
  return { date: null, sumber: null }
}

/**
 * Apakah siswa layak ditagih untuk periode tertentu.
 * Syarat: statusnya aktif DAN tanggal masuk <= bulan periode.
 */
export function cekKelayakan(siswa, periodeIndex) {
  const status = normalizeStatus(siswa?.status)
  if (status !== 'aktif') {
    return { layak: false, alasan: `status "${status}"` }
  }

  const { date, sumber } = getTanggalEfektif(siswa)
  if (!date) {
    return { layak: false, alasan: 'tanggal masuk belum diisi' }
  }

  if (monthIndexOf(date) > periodeIndex) {
    return { layak: false, alasan: `masuk setelah periode tagihan (${sumber})` }
  }

  return { layak: true, alasan: '' }
}
