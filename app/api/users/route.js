import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = 'bimbel_db'

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user?.role?.toLowerCase()
  if (!['admin', 'owner'].includes(role)) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)

    // Ambil semua user, tanpa field password
    const users = await db.collection('users').find({}, {
      projection: { password: 0 }
    }).toArray()

    const result = users.map(u => ({
      id: u._id.toString(),
      nama: u.nama || u.name || '',
      email: u.email || '',
      role: u.role || ''
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  } finally {
    await client.close()
  }
}
