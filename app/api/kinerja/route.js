import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getApiSession, isAdmin, isStaff } from '@/lib/apiAuth'
import { resolvePegawaiForSession } from '@/lib/pegawaiMatch'

export const dynamic = 'force-dynamic'

const TARIF = {
  SD: 24000,
  SMP: 25000,
  SMA: 25000
}

const TARIF_PR_SMA = 25000
const TARIF_PIKET = 7000

function hitungGaji(jenjang, kategori, menitMengajar, namaPengajar = '') {
  // Piket: flat Rp 7.000 per sesi, tidak tergantung jenjang & durasi
  if (kategori === 'Piket') return TARIF_PIKET

  let tarif = TARIF[jenjang]
  
  // Penyesuaian tarif SD khusus untuk pengajar tertentu
  // 'fadila' & 'fadilla' adalah guru yg sama (salah tulis), keduanya perlu tarif spesial
  const specialNames = ['sanny', 'maya', 'agung', 'didah', 'nissa', 'fadila', 'fadilla', 'euis']
  const isSpecial = namaPengajar && specialNames.some(name => 
    namaPengajar.toLowerCase().includes(name.toLowerCase())
  )

  if (jenjang === 'SD' && isSpecial) {
    tarif = 26000
  }

  if (!tarif) return 0

  if (kategori === 'Reguler') {
    // Flat per sesi
    return tarif
  } else {
    // PR: (menit / 90) × 0.75 × tarif
    const tarifPR = jenjang === 'SMA' ? TARIF_PR_SMA : tarif
    return Math.round((menitMengajar / 90) * 0.75 * tarifPR)
  }
}

export async function GET(request) {
  try {
    const session = await getApiSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const pengajar_id = searchParams.get('pengajar_id')
    const pengajar_nama = searchParams.get('pengajar_nama')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const bulan = searchParams.get('bulan')
    const tahun = searchParams.get('tahun')

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    let query = {}
    if (pengajar_id || pengajar_nama) {
      // Kumpulkan semua kemungkinan ID pengajar (termasuk UUID lama)
      const idSet = new Set()
      if (pengajar_id) idSet.add(pengajar_id)

      // Cari semua pegawai yang namanya cocok (mungkin ada duplikat dengan ID berbeda)
      if (pengajar_nama) {
        const { ObjectId } = await import('mongodb')
        const matchingPegawai = await db.collection('pegawai').find({
          nama: { $regex: new RegExp('^' + pengajar_nama.trim() + '$', 'i') }
        }).toArray()
        matchingPegawai.forEach(p => {
          idSet.add(p._id.toString())
          if (p.id) idSet.add(p.id)
          // Jika _id itu sendiri adalah string (UUID), tambahkan juga
          if (typeof p._id === 'string') idSet.add(p._id)
        })
      }

      const allIds = Array.from(idSet)
      query.$or = [
        { pengajar_id: { $in: allIds } },
        ...(pengajar_nama ? [{ pengajar_nama: { $regex: new RegExp('^' + pengajar_nama.trim() + '$', 'i') } }] : [])
      ]
    }
    if (startDate && endDate) {
      query.tanggal = { $gte: startDate, $lte: endDate }
    }
    if (bulan) query.bulan = parseInt(bulan)
    if (tahun) query.tahun = parseInt(tahun)

    if (isStaff(session) && !isAdmin(session)) {
      // Pegawai/Guru hanya boleh melihat kinerja miliknya sendiri.
      // Pakai helper terpusat agar nama dengan gelar/tanda baca tetap cocok.
      const myPegawai = await resolvePegawaiForSession(db, session)

      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const myIds = new Set()
      const myNames = new Set()

      if (session.user.id) myIds.add(session.user.id)
      if (myPegawai) {
        myIds.add(String(myPegawai._id))
        if (myPegawai.id) myIds.add(myPegawai.id)
        const namaPegawai = (myPegawai.nama || myPegawai.name || '').trim()
        if (namaPegawai) myNames.add(namaPegawai)
      }
      // Data lama bisa tersimpan memakai nama akun, jadi ikut dicocokkan.
      const akunNama = (session.user.name || '').trim()
      if (akunNama) myNames.add(akunNama)

      if (myIds.size === 0 && myNames.size === 0) {
        return NextResponse.json([])
      }

      query.$or = [
        { pengajar_id: { $in: Array.from(myIds) } },
        ...Array.from(myNames).map((n) => ({
          pengajar_nama: { $regex: '^' + esc(n) + '$', $options: 'i' }
        }))
      ]
    }

    const kinerja = await db.collection('kinerja')
      .find(query)
      .sort({ tanggal: -1 })
      .toArray()

    const { ObjectId } = await import('mongodb')

    const kinerjaWithPengajar = await Promise.all(
      kinerja.map(async (item) => {
        let pengajar_nama = item.pengajar_nama || 'Tidak diketahui'
        try {
          if (item.pengajar_id && ObjectId.isValid(item.pengajar_id)) {
            const pengajar = await db.collection('pegawai').findOne({
              _id: new ObjectId(item.pengajar_id)
            })
            pengajar_nama = pengajar?.nama || pengajar_nama
          }
        } catch (e) { }
        return {
          ...item,
          id: item._id.toString(),
          pengajar_nama
        }
      })
    )

    return NextResponse.json(kinerjaWithPengajar)
  } catch (error) {
    console.error('Error fetching kinerja:', error)
    return NextResponse.json({ error: 'Gagal memuat kinerja' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getApiSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session) && !isStaff(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const data = await request.json()
    const { pengajar_id, tanggal, jam_mulai, jam_selesai, jenjang, kategori, keterangan } = data

    // Validasi field wajib
    if (!tanggal || !jam_mulai || !jam_selesai || !kategori) {
      return NextResponse.json(
        { error: 'Field tanggal, jam_mulai, jam_selesai, dan kategori wajib diisi' },
        { status: 400 }
      )
    }

    const [jamM, menitM] = jam_mulai.split(':').map(Number)
    const [jamS, menitS] = jam_selesai.split(':').map(Number)
    const menitMengajar = (jamS * 60 + menitS) - (jamM * 60 + menitM)

    if (menitMengajar <= 0) {
      return NextResponse.json(
        { error: 'Jam selesai harus lebih besar dari jam mulai' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    // Pegawai/Guru hanya boleh menginput kinerja miliknya sendiri
    let pengajarIdFinal = pengajar_id
    if (isStaff(session) && !isAdmin(session)) {
      const myPegawai = await resolvePegawaiForSession(db, session)
      if (!myPegawai) {
        console.warn(
          `[kinerja POST] Akun "${session.user?.name || '-'}" (${session.user?.email || '-'}) ` +
          'tidak cocok dengan data pegawai mana pun.'
        )
        return NextResponse.json(
          {
            error:
              'Data pegawai untuk akun ini tidak ditemukan. Minta admin menyamakan nama ' +
              'akun dengan data pegawai, atau menautkan akun (field pegawai.user_id / pegawai.email).'
          },
          { status: 404 }
        )
      }
      pengajarIdFinal = String(myPegawai._id)
    }

    // Ambil nama pengajar untuk perhitungan tarif khusus
    let namaPengajar = ''
    try {
      if (pengajarIdFinal) {
        // Coba cari pegawai berdasarkan _id (bisa ObjectId atau string/UUID)
        const { ObjectId } = await import('mongodb')
        let pengajar = null
        
        if (ObjectId.isValid(pengajarIdFinal) && pengajarIdFinal.length === 24) {
          // Hanya gunakan ObjectId jika format benar (24 char hex)
          pengajar = await db.collection('pegawai').findOne({
            _id: new ObjectId(pengajarIdFinal)
          })
        }
        
        // Jika tidak ketemu dengan ObjectId, coba cari sebagai string
        if (!pengajar) {
          pengajar = await db.collection('pegawai').findOne({
            $or: [
              { _id: pengajarIdFinal },
              { id: pengajarIdFinal }
            ]
          })
        }
        
        namaPengajar = pengajar?.nama || ''
      }
    } catch (e) {
      console.error('Error fetching pengajar name for gaji calculation:', e)
    }

    const gaji = hitungGaji(jenjang, kategori, menitMengajar, namaPengajar)

    const [tahunStr, bulanStr] = tanggal.split('-')
    const bulan = parseInt(bulanStr)
    const tahun = parseInt(tahunStr)

    const newKinerja = {
      pengajar_id: pengajarIdFinal,
      pengajar_nama: namaPengajar || session.user?.name || '',
      tanggal,
      jam_mulai,
      jam_selesai,
      jenjang: jenjang || '-',
      kategori,
      menit_mengajar: menitMengajar,
      gaji,
      bulan,
      tahun,
      keterangan: keterangan || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('kinerja').insertOne(newKinerja)

    return NextResponse.json(
      { message: 'Kinerja berhasil ditambahkan', id: result.insertedId, gaji },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating kinerja:', error)
    return NextResponse.json(
      { error: 'Gagal menambahkan kinerja', detail: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}


export async function DELETE(request) {
  try {
    const session = await getApiSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })
    }

    const { ObjectId } = await import('mongodb')
    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    const result = await db.collection('kinerja').deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Kinerja berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting kinerja:', error)
    return NextResponse.json({ error: 'Gagal menghapus kinerja' }, { status: 500 })
  }
}
