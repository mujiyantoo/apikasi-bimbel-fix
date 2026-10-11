import { NextResponse } from 'next/server'
import { getMongoConnection } from '@/lib/mongodb'
import { jalankanGenerateTagihan } from '@/lib/tagihanServer'

export const dynamic = 'force-dynamic'

// ===========================================================================
// /api/cron/tagihan  — dipanggil OTOMATIS oleh Vercel Cron
//
// Tujuan: tagihan SPP terbit sendiri tiap bulan (efektif mulai tanggal 2 WIB)
// tanpa perlu ada yang membuka halaman Keuangan.
//
// KEAMANAN
//   Wajib menyertakan secret, salah satu dari:
//     - header  Authorization: Bearer <CRON_SECRET>   (Vercel Cron otomatis)
//     - query   ?key=<CRON_SECRET>                    (untuk scheduler lain)
//   Setel CRON_SECRET di Vercel → Settings → Environment Variables.
//
// SIFAT: idempoten — boleh dipanggil berkali-kali, hasilnya sama.
// Opsi:  ?dryRun=1 untuk pratinjau tanpa mengubah data.
// ===========================================================================

function aman(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return { ok: false, alasan: 'CRON_SECRET belum disetel' }

  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const key = new URL(request.url).searchParams.get('key') || ''

  if (bearer === secret || key === secret) return { ok: true, alasan: '' }
  return { ok: false, alasan: 'secret salah / tidak ada' }
}

async function jalankan(request) {
  const cek = aman(request)
  if (!cek.ok) {
    // 503 kalau belum dikonfigurasi, 401 kalau secret memang salah
    const status = cek.alasan === 'CRON_SECRET belum disetel' ? 503 : 401
    return NextResponse.json(
      { ok: false, error: cek.alasan },
      { status }
    )
  }

  const connection = await getMongoConnection()
  if (!connection) {
    return NextResponse.json({ ok: false, error: 'Database tidak tersedia' }, { status: 503 })
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'

  const hasil = await jalankanGenerateTagihan(connection.db, { dryRun })
  console.log('[cron/tagihan]', JSON.stringify({
    periode: hasil.periode,
    dibuat: hasil.dibuat,
    dihapus: hasil.dihapus,
    total: hasil.totalTagihanPendingPeriodeIni
  }))

  return NextResponse.json({ ...hasil, sumber: 'cron' })
}

export async function GET(request) {
  try {
    return await jalankan(request)
  } catch (error) {
    console.error('[cron/tagihan] Error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    return await jalankan(request)
  } catch (error) {
    console.error('[cron/tagihan] Error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
