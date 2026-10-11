import { NextResponse } from 'next/server';
import { getMongoConnection } from '@/lib/mongodb';
import { getApiSession } from '@/lib/apiAuth';
import { resolvePegawaiForSession } from '@/lib/pegawaiMatch';

// GET /api/pegawai/me - Ambil data pegawai milik user yang sedang login
// Boleh diakses semua role yang sudah login (tidak hanya admin).
// Dipakai halaman Kinerja agar pegawai/guru bisa menemukan data dirinya sendiri.
export async function GET(request) {
  try {
    const session = await getApiSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const connection = await getMongoConnection();

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Database not configured', data: null },
        { status: 503 }
      );
    }

    const { db } = connection;

    const myName = (session.user?.name || '').trim()

    // Pencocokan memakai helper terpusat: tautan user_id/email lebih dulu,
    // lalu nama ternormalisasi (gelar & tanda baca diabaikan).
    const pegawai = await resolvePegawaiForSession(db, session)

    if (!pegawai) {
      console.warn(
        `[pegawai/me] Tidak menemukan data pegawai untuk akun "${myName}" ` +
        `(email: ${session.user?.email || '-'}, id: ${session.user?.id || '-'}).`
      )
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: { ...pegawai, id: pegawai._id.toString() }
    });
  } catch (error) {
    console.error('❌ GET /api/pegawai/me Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
