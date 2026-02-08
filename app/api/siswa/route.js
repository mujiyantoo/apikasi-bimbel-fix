
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        const kelas = searchParams.get('kelas')

        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        let query = {}

        if (search) {
            query.$or = [
                { nama: { $regex: search, $options: 'i' } },
                { nis: { $regex: search, $options: 'i' } }
            ]
        }

        if (kelas && kelas !== 'all') {
            query.kelas = kelas
        }

        const siswa = await db.collection('siswa').find(query).toArray()

        // Convert _id to string or remove it if not needed, as it can cause serialization issues in some cases
        // but usually fine in API responses. Adding 'id' field for consistency if needed.
        const formattedSiswa = siswa.map(s => ({
            ...s,
            id: s._id.toString()
        }))

        return NextResponse.json(formattedSiswa)
    } catch (error) {
        console.error('Error fetching/filtering siswa:', error)
        return NextResponse.json(
            { error: 'Gagal memuat data siswa' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const data = await request.json()
        const { nama, nis, kelas, mataPelajaran, jenisKelamin, telepon, alamat, tanggalMasuk } = data

        // Basic validation
        if (!nama || !nis || !kelas || !mataPelajaran) {
            return NextResponse.json(
                { error: 'Nama, NIS, Kelas, dan Mata Pelajaran wajib diisi' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        console.log('Received POST data request:', { nama, nis, kelas })

        // Check for existing NIS
        const existingSiswa = await db.collection('siswa').findOne({ nis })
        if (existingSiswa) {
            return NextResponse.json(
                { error: 'NIS sudah terdaftar' },
                { status: 400 }
            )
        }

        const validTanggalMasuk = tanggalMasuk && !isNaN(new Date(tanggalMasuk).getTime())
            ? new Date(tanggalMasuk)
            : new Date();

        const newSiswa = {
            nama,
            nis,
            kelas,
            mataPelajaran,
            jenisKelamin,
            telepon,
            alamat,
            tanggalMasuk: validTanggalMasuk,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        const result = await db.collection('siswa').insertOne(newSiswa)

        // Log activity for dashboard
        await db.collection('activities').insertOne({
            type: 'siswa',
            description: `Siswa baru ditambahkan: ${nama} (${kelas})`,
            createdAt: new Date()
        })

        return NextResponse.json(
            { message: 'Siswa berhasil ditambahkan', id: result.insertedId },
            { status: 201 }
        )

    } catch (error) {
        console.error('Error creating siswa:', error)
        return NextResponse.json(
            { error: 'Gagal menambahkan siswa' },
            { status: 500 }
        )
    }
}
