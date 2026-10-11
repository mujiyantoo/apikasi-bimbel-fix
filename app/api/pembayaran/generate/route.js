import { NextResponse } from 'next/server'
import { getMongoConnection } from '@/lib/mongodb'
import { getApiSession, isAdmin } from '@/lib/apiAuth'
import { jalankanGenerateTagihan } from '@/lib/tagihanServer'

export const dynamic = 'force-dynamic'

// ===========================================================================
// POST /api/pembayaran/generate   (khusus admin)
//
// Membuat / merapikan tagihan SPP secara AMAN dan IDEMPOTEN.
// Aman dipanggil berkali-kali: hasilnya sama, tidak menghasilkan duplikat.
//
// Logikanya ada di lib/tagihanServer.js (dipakai bersama cron).
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

    let dryRun = false
    try {
      const body = await request.json()
      dryRun = body?.dryRun === true
    } catch { /* body kosong = bukan dry run */ }

    const hasil = await jalankanGenerateTagihan(connection.db, { dryRun })
    return NextResponse.json(hasil)
  } catch (error) {
    console.error('POST /api/pembayaran/generate Error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat tagihan', detail: error.message },
      { status: 500 }
    )
  }
}
