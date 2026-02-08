import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const client = await clientPromise
        const db = client.db(process.env.DB_NAME)

        // Get total students count
        const totalSiswa = await db.collection('siswa').countDocuments()

        // Get total employees count
        const totalPegawai = await db.collection('pegawai').countDocuments()

        // Get pending payments count
        const pembayaranPending = await db.collection('pembayaran').countDocuments({ status: 'pending' })

        // Get total revenue (sum of paid payments)
        const revenueResult = await db.collection('pembayaran').aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).toArray()
        const totalPendapatan = revenueResult.length > 0 ? revenueResult[0].total : 0

        // Get recent activities (last 5)
        const recentActivities = await db.collection('activities')
            .find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray()

        return NextResponse.json({
            totalSiswa,
            totalPegawai,
            pembayaranPending,
            totalPendapatan,
            recentActivities: recentActivities.map(a => ({
                ...a,
                _id: a._id.toString()
            }))
        })
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json(
            { error: 'Gagal memuat statistik dashboard' },
            { status: 500 }
        )
    }
}
