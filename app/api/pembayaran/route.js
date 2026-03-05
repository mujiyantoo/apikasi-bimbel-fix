import { NextResponse } from 'next/server'
import { getMongoConnection } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

const bulanOptions = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// ✅ Helper: cari query by _id (ObjectId) atau id (UUID string)
function buildQuery(id) {
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
        try {
            return { _id: new ObjectId(id) }
        } catch { }
    }
    return { id: id }
}

// ============================================
// GET /api/pembayaran — return array langsung
// ============================================
export async function GET(request) {
    try {
        const connection = await getMongoConnection()
        if (!connection) {
            return NextResponse.json([], { status: 503 })
        }

        const { db } = connection
        const pembayaran = await db.collection('pembayaran')
            .find({})
            .sort({ createdAt: -1 })
            .toArray()

        // ✅ Migrasi: pastikan SEMUA data punya field 'id'
        await Promise.all(
            pembayaran
                .filter(p => !p.id)
                .map(p =>
                    db.collection('pembayaran').updateOne(
                        { _id: p._id },
                        { $set: { id: p._id.toString() } }
                    )
                )
        )

        // Ambil ulang data yang sudah di-migrate
        const updatedPembayaran = await db.collection('pembayaran')
            .find({})
            .sort({ createdAt: -1 })
            .toArray()

        const result = updatedPembayaran.map(p => ({
            ...p,
            id: p._id.toString()
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error('GET /api/pembayaran Error:', error)
        return NextResponse.json([], { status: 500 })
    }
}

// ============================================
// POST /api/pembayaran — buat pembayaran baru
// ============================================
export async function POST(request) {
    try {
        const body = await request.json()
        const connection = await getMongoConnection()
        if (!connection) {
            return NextResponse.json(
                { error: 'Database tidak tersedia' },
                { status: 503 }
            )
        }

        const { db } = connection

        const pembayaranData = {
            ...body,
            jumlah: parseInt(body.jumlah) || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        const result = await db.collection('pembayaran').insertOne(pembayaranData)

        await db.collection('pembayaran').updateOne(
            { _id: result.insertedId },
            { $set: { id: result.insertedId.toString() } }
        )

        return NextResponse.json(
            { message: 'Pembayaran berhasil ditambahkan', id: result.insertedId },
            { status: 201 }
        )
    } catch (error) {
        console.error('POST /api/pembayaran Error:', error)
        return NextResponse.json({ error: 'Gagal menambahkan pembayaran' }, { status: 500 })
    }
}

// ============================================
// PUT /api/pembayaran?id=xxx — update status
// ✅ Support ObjectId dan UUID
// ============================================
export async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })
        }

        const body = await request.json()
        const connection = await getMongoConnection()
        if (!connection) {
            return NextResponse.json(
                { error: 'Database tidak tersedia' },
                { status: 503 }
            )
        }

        const { db } = connection

        const { _id, id: bodyId, ...updateFields } = body

        const query = buildQuery(id)
        const result = await db.collection('pembayaran').updateOne(
            query,
            { $set: { ...updateFields, updatedAt: new Date() } }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
        }

        return NextResponse.json({ message: 'Status pembayaran berhasil diupdate' })
    } catch (error) {
        console.error('PUT /api/pembayaran Error:', error)
        return NextResponse.json({ error: 'Gagal mengupdate pembayaran' }, { status: 500 })
    }
}

// ============================================
// DELETE /api/pembayaran
//  - ?id=xxx          → hapus satu record
//  - ?action=cleanup  → hapus semua SPP pending BULAN BERJALAN (n)
// ✅ Support ObjectId dan UUID
// ============================================
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')
        const id = searchParams.get('id')

        const connection = await getMongoConnection()
        if (!connection) {
            return NextResponse.json({ error: 'Database tidak tersedia' }, { status: 503 })
        }

        const { db } = connection

        if (action === 'cleanup') {
            const now = new Date()
            const bulanBerjalan = bulanOptions[now.getMonth()]
            const tahunBerjalan = now.getFullYear().toString()

            const result = await db.collection('pembayaran').deleteMany({
                jenis: 'SPP',
                status: 'pending',
                bulan: { $regex: new RegExp(`^${bulanBerjalan}$`, 'i') },
                tahun: tahunBerjalan
            })

            return NextResponse.json({
                message: `Berhasil menghapus ${result.deletedCount} tagihan SPP pending bulan ${bulanBerjalan} ${tahunBerjalan}`,
                deletedCount: result.deletedCount,
                bulan: bulanBerjalan,
                tahun: tahunBerjalan
            })
        }

        if (!id) {
            return NextResponse.json({ error: 'ID atau action tidak ditemukan' }, { status: 400 })
        }

        const query = buildQuery(id)
        const result = await db.collection('pembayaran').deleteOne(query)

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
        }

        return NextResponse.json({ message: 'Pembayaran berhasil dihapus' })
    } catch (error) {
        console.error('DELETE /api/pembayaran Error:', error)
        return NextResponse.json({ error: 'Gagal menghapus pembayaran' }, { status: 500 })
    }
}
