import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('bimbel_db')

    const newPassword = 'admin123baru' // ← ganti password baru di sini
    const hashed = await bcrypt.hash(newPassword, 10)

    await db.collection('users').updateOne(
      { email: 'admin@bimbel.com' }, // ← ganti dengan email admin kamu
      { $set: { password: hashed } }
    )

    return NextResponse.json({ message: 'Password berhasil diupdate' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```
