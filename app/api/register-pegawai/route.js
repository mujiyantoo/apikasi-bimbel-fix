import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { nama, email, password, jabatan, secret } = await request.json()

    // Kunci keamanan - ganti 'RAHASIA123' dengan kata rahasia kamu sendiri
    if (secret !== 'RAHASIA123') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('bimbel_db')

    // Cek email sudah ada
    const existing = await db.collection('users').findOne({ email })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await db.collection('users').insertOne({
      name: nama,
      email,
      password: hashedPassword,
      role: 'Pegawai',
      jabatan: jabatan || 'Pengajar',
      createdAt: new Date()
    })

    return NextResponse.json({
      message: `Akun berhasil dibuat untuk ${nama}`,
      id: result.insertedId
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 })
  }
}
