import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request, { params }) {
    try {
        const { id } = params

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid ID format' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        const siswa = await db.collection('siswa').findOne({ _id: new ObjectId(id) })

        if (!siswa) {
            return NextResponse.json(
                { error: 'Siswa tidak ditemukan' },
                { status: 404 }
            )
        }

        const formattedSiswa = {
            ...siswa,
            id: siswa._id.toString()
        }

        return NextResponse.json(formattedSiswa)
    } catch (error) {
        console.error('Error fetching siswa:', error)
        return NextResponse.json(
            { error: 'Gagal memuat data siswa' },
            { status: 500 }
        )
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = params
        const data = await request.json()

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid ID format' },
                { status: 400 }
            )
        }

        // Remove immutable fields if present
        delete data._id
        delete data.createdAt

        const updateData = {
            ...data,
            updatedAt: new Date()
        }

        // Handle date conversion if needed
        if (updateData.tanggalMasuk) {
            updateData.tanggalMasuk = new Date(updateData.tanggalMasuk)
        }

        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        const result = await db.collection('siswa').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'Siswa tidak ditemukan' },
                { status: 404 }
            )
        }

        return NextResponse.json({ message: 'Siswa berhasil diupdate' })
    } catch (error) {
        console.error('Error updating siswa:', error)
        return NextResponse.json(
            { error: 'Gagal mengupdate siswa' },
            { status: 500 }
        )
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid ID format' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        const result = await db.collection('siswa').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: 'Siswa tidak ditemukan' },
                { status: 404 }
            )
        }

        return NextResponse.json({ message: 'Siswa berhasil dihapus' })

    } catch (error) {
        console.error('Error deleting siswa:', error)
        return NextResponse.json(
            { error: 'Gagal menghapus siswa' },
            { status: 500 }
        )
    }
}
