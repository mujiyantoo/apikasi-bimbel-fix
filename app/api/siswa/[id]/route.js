import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

const buildFilter = (id) => {
    const filters = [{ id }]
    if (ObjectId.isValid(id)) {
        filters.unshift({ _id: new ObjectId(id) })
    }
    return filters.length === 1 ? filters[0] : { $or: filters }
}

const formatSiswa = (siswa) => {
    const { _id, ...rest } = siswa
    return {
        ...rest,
        id: siswa.id || (_id ? _id.toString() : undefined)
    }
}

export async function PUT(request, { params }) {
    try {
        const data = await request.json()
        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        const update = { ...data, updatedAt: new Date() }
        if (data?.tanggalMasuk) {
            const parsedTanggal = new Date(data.tanggalMasuk)
            if (!isNaN(parsedTanggal.getTime())) {
                update.tanggalMasuk = parsedTanggal
            }
        }

        const result = await db.collection('siswa').findOneAndUpdate(
            buildFilter(params.id),
            { $set: update },
            { returnDocument: 'after' }
        )

        if (!result.value) {
            return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
        }

        return NextResponse.json(formatSiswa(result.value))
    } catch (error) {
        console.error('Error updating siswa:', error)
        return NextResponse.json(
            { error: 'Gagal memperbarui siswa' },
            { status: 500 }
        )
    }
}

export async function DELETE(request, { params }) {
    try {
        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        const result = await db.collection('siswa').findOneAndDelete(
            buildFilter(params.id)
        )

        if (!result.value) {
            return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
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
