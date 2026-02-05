import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Initialize default admin user
async function initializeAdmin(db) {
  const existingAdmin = await db.collection('users').findOne({ email: 'admin@bimbel.com' })
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await db.collection('users').insertOne({
      id: uuidv4(),
      email: 'admin@bimbel.com',
      password: hashedPassword,
      name: 'Administrator',
      role: 'Admin',
      createdAt: new Date()
    })
    console.log('Default admin user created')
  }
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()
    
    // Initialize admin on first request
    await initializeAdmin(db)

    // Root endpoint
    if ((route === '/root' || route === '/') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Bimbel Management API' }))
    }

    // ============ DASHBOARD STATS ============
    if (route === '/dashboard/stats' && method === 'GET') {
      const [siswaCount, pegawaiCount, pembayaranPending, totalPendapatan] = await Promise.all([
        db.collection('siswa').countDocuments(),
        db.collection('pegawai').countDocuments(),
        db.collection('pembayaran').countDocuments({ status: 'pending' }),
        db.collection('pembayaran').aggregate([
          { $match: { status: 'lunas' } },
          { $group: { _id: null, total: { $sum: '$jumlah' } } }
        ]).toArray()
      ])

      // Recent activities
      const recentActivities = await db.collection('activities')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()

      return handleCORS(NextResponse.json({
        totalSiswa: siswaCount,
        totalPegawai: pegawaiCount,
        pembayaranPending: pembayaranPending,
        totalPendapatan: totalPendapatan[0]?.total || 0,
        recentActivities: recentActivities.map(({ _id, ...rest }) => rest)
      }))
    }

    // ============ SISWA CRUD ============
    if (route === '/siswa' && method === 'GET') {
      const url = new URL(request.url)
      const search = url.searchParams.get('search') || ''
      const kelas = url.searchParams.get('kelas') || ''
      
      let query = {}
      if (search) {
        query.$or = [
          { nama: { $regex: search, $options: 'i' } },
          { nis: { $regex: search, $options: 'i' } }
        ]
      }
      if (kelas) {
        query.kelas = kelas
      }

      const siswa = await db.collection('siswa')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()

      return handleCORS(NextResponse.json(siswa.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/siswa' && method === 'POST') {
      const body = await request.json()
      
      if (!body.nama || !body.nis || !body.kelas) {
        return handleCORS(NextResponse.json(
          { error: 'Nama, NIS, dan Kelas wajib diisi' },
          { status: 400 }
        ))
      }

      const existingNis = await db.collection('siswa').findOne({ nis: body.nis })
      if (existingNis) {
        return handleCORS(NextResponse.json(
          { error: 'NIS sudah terdaftar' },
          { status: 400 }
        ))
      }

      const siswa = {
        id: uuidv4(),
        nama: body.nama,
        nis: body.nis,
        kelas: body.kelas,
        jenisKelamin: body.jenisKelamin || '',
        alamat: body.alamat || '',
        telepon: body.telepon || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('siswa').insertOne(siswa)
      
      // Log activity
      await db.collection('activities').insertOne({
        id: uuidv4(),
        type: 'siswa',
        action: 'create',
        description: `Siswa baru ditambahkan: ${siswa.nama}`,
        createdAt: new Date()
      })

      const { _id, ...cleanSiswa } = siswa
      return handleCORS(NextResponse.json(cleanSiswa, { status: 201 }))
    }

    // Update Siswa
    if (route.startsWith('/siswa/') && method === 'PUT') {
      const id = path[1]
      const body = await request.json()

      const result = await db.collection('siswa').findOneAndUpdate(
        { id },
        { $set: { ...body, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )

      if (!result) {
        return handleCORS(NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 }))
      }

      const { _id, ...cleanSiswa } = result
      return handleCORS(NextResponse.json(cleanSiswa))
    }

    // Delete Siswa
    if (route.startsWith('/siswa/') && method === 'DELETE') {
      const id = path[1]
      const result = await db.collection('siswa').findOneAndDelete({ id })

      if (!result) {
        return handleCORS(NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 }))
      }

      return handleCORS(NextResponse.json({ message: 'Siswa berhasil dihapus' }))
    }

    // ============ PEGAWAI CRUD ============
    if (route === '/pegawai' && method === 'GET') {
      const url = new URL(request.url)
      const search = url.searchParams.get('search') || ''
      
      let query = {}
      if (search) {
        query.$or = [
          { nama: { $regex: search, $options: 'i' } },
          { nip: { $regex: search, $options: 'i' } }
        ]
      }

      const pegawai = await db.collection('pegawai')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()

      return handleCORS(NextResponse.json(pegawai.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/pegawai' && method === 'POST') {
      const body = await request.json()
      
      if (!body.nama || !body.nip || !body.jabatan) {
        return handleCORS(NextResponse.json(
          { error: 'Nama, NIP, dan Jabatan wajib diisi' },
          { status: 400 }
        ))
      }

      const existingNip = await db.collection('pegawai').findOne({ nip: body.nip })
      if (existingNip) {
        return handleCORS(NextResponse.json(
          { error: 'NIP sudah terdaftar' },
          { status: 400 }
        ))
      }

      const pegawai = {
        id: uuidv4(),
        nama: body.nama,
        nip: body.nip,
        jabatan: body.jabatan,
        jenisKelamin: body.jenisKelamin || '',
        alamat: body.alamat || '',
        telepon: body.telepon || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('pegawai').insertOne(pegawai)
      
      await db.collection('activities').insertOne({
        id: uuidv4(),
        type: 'pegawai',
        action: 'create',
        description: `Pegawai baru ditambahkan: ${pegawai.nama}`,
        createdAt: new Date()
      })

      const { _id, ...cleanPegawai } = pegawai
      return handleCORS(NextResponse.json(cleanPegawai, { status: 201 }))
    }

    // Update Pegawai
    if (route.startsWith('/pegawai/') && method === 'PUT') {
      const id = path[1]
      const body = await request.json()

      const result = await db.collection('pegawai').findOneAndUpdate(
        { id },
        { $set: { ...body, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )

      if (!result) {
        return handleCORS(NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 }))
      }

      const { _id, ...cleanPegawai } = result
      return handleCORS(NextResponse.json(cleanPegawai))
    }

    // Delete Pegawai
    if (route.startsWith('/pegawai/') && method === 'DELETE') {
      const id = path[1]
      const result = await db.collection('pegawai').findOneAndDelete({ id })

      if (!result) {
        return handleCORS(NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 }))
      }

      return handleCORS(NextResponse.json({ message: 'Pegawai berhasil dihapus' }))
    }

    // ============ PEMBAYARAN ============
    if (route === '/pembayaran' && method === 'GET') {
      const pembayaran = await db.collection('pembayaran')
        .find({})
        .sort({ createdAt: -1 })
        .toArray()

      return handleCORS(NextResponse.json(pembayaran.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/pembayaran' && method === 'POST') {
      const body = await request.json()
      
      const pembayaran = {
        id: uuidv4(),
        siswaId: body.siswaId,
        namaSiswa: body.namaSiswa,
        jenis: body.jenis || 'SPP',
        bulan: body.bulan,
        tahun: body.tahun,
        jumlah: body.jumlah,
        status: body.status || 'pending',
        tanggalBayar: body.status === 'lunas' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('pembayaran').insertOne(pembayaran)
      
      const { _id, ...cleanPembayaran } = pembayaran
      return handleCORS(NextResponse.json(cleanPembayaran, { status: 201 }))
    }

    // ============ USERS ============
    if (route === '/users' && method === 'GET') {
      const users = await db.collection('users')
        .find({})
        .project({ password: 0 })
        .toArray()

      return handleCORS(NextResponse.json(users.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/users' && method === 'POST') {
      const body = await request.json()
      
      if (!body.email || !body.password || !body.name || !body.role) {
        return handleCORS(NextResponse.json(
          { error: 'Email, password, name, dan role wajib diisi' },
          { status: 400 }
        ))
      }

      const existingUser = await db.collection('users').findOne({ email: body.email })
      if (existingUser) {
        return handleCORS(NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 400 }
        ))
      }

      const hashedPassword = await bcrypt.hash(body.password, 10)
      const user = {
        id: uuidv4(),
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: body.role,
        createdAt: new Date()
      }

      await db.collection('users').insertOne(user)
      
      const { password, _id, ...cleanUser } = user
      return handleCORS(NextResponse.json(cleanUser, { status: 201 }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` },
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
