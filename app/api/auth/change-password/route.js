import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { MongoClient, ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'

const uri = process.env.MONGODB_URI
const dbName = 'bimbel_db'

export async function POST(req) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, passwordLama, passwordBaru, byAdmin } = await req.json()

  if (!passwordBaru || passwordBaru.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)

    // Cari user - sesuaikan 'users' dengan nama collection kamu
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    // Kalau bukan byAdmin, verifikasi password lama dulu
    if (!byAdmin) {
      if (!passwordLama) return NextResponse.json({ error: 'Password lama wajib diisi' }, { status: 400 })
      const valid = await bcrypt.compare(passwordLama, user.password)
      if (!valid) return NextResponse.json({ error: 'Password lama salah!' }, { status: 400 })
    } else {
      // Hanya owner/admin yang boleh reset password orang lain
      const role = session.user?.role?.toLowerCase()
      if (!['admin', 'owner'].includes(role)) {
        return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
      }
    }

    const hashedBaru = await bcrypt.hash(passwordBaru, 10)
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedBaru } }
    )

    return NextResponse.json({ message: 'Password berhasil diubah' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  } finally {
    await client.close()
  }
}
