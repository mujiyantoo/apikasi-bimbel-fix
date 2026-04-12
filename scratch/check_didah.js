const { MongoClient } = require('mongodb')

const uri = 'mongodb+srv://muj582_db_user:fgsnNqUbe6pBPHFX@cluster0.6ei0xqq.mongodb.net/?appName=Cluster0'
const DB_NAME = 'bimbel_db'

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(DB_NAME)

  // 1. Cari pegawai dengan nama Didah
  const pegawai = await db.collection('pegawai').find({
    nama: { $regex: /didah/i }
  }).toArray()
  console.log('=== PEGAWAI DIDAH ===')
  pegawai.forEach(p => console.log({ _id: p._id.toString(), id: p.id, nama: p.nama }))

  if (pegawai.length === 0) {
    console.log('TIDAK ADA pegawai bernama Didah!')
    await client.close()
    return
  }

  const ids = pegawai.map(p => p._id.toString())
  console.log('\nID yang akan dipakai query:', ids)

  // 2. Cari semua kinerja yang pengajar_id-nya cocok ATAU nama mengajarnya cocok
  const kinerja = await db.collection('kinerja').find({
    $or: [
      { pengajar_id: { $in: ids } },
      { pengajar_nama: { $regex: /didah/i } }
    ]
  }).sort({ tanggal: -1 }).toArray()

  console.log(`\n=== KINERJA DIDAH (${kinerja.length} record) ===`)
  kinerja.forEach(k => console.log({
    tanggal: k.tanggal,
    pengajar_id: k.pengajar_id,
    pengajar_nama: k.pengajar_nama,
    kategori: k.kategori,
    gaji: k.gaji
  }))

  // 3. Cari kinerja yang sama sekali tidak cocok (UUID lama)
  if (kinerja.length === 0) {
    console.log('\n=== SAMPLE KINERJA DI DATABASE ===')
    const sample = await db.collection('kinerja').find({}).limit(5).toArray()
    sample.forEach(k => console.log({
      tanggal: k.tanggal,
      pengajar_id: k.pengajar_id,
      pengajar_nama: k.pengajar_nama
    }))
  }

  await client.close()
}

main().catch(console.error)
