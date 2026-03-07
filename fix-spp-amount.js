const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://muj582_db_user:fgsnNqUbe6pBPHFX@cluster0.6ei0xqq.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db("bimbel_db");
        const pembayaran = db.collection("pembayaran");
        const siswa = db.collection("siswa");

        const pendingSpp = await pembayaran.find({ jenis: "SPP", status: "pending" }).toArray();
        let updatedCount = 0;

        for (const p of pendingSpp) {
            const s = await siswa.findOne({ id: p.siswaId });
            if (s) {
                const k = s.kelas ? s.kelas.toUpperCase() : '';
                let tarif = 200000;
                if (k.includes('SMA') || k.match(/^(10|11|12|X|XI|XII)\b/)) tarif = 250000;
                else if (k.includes('SMP') || k.match(/^(7|8|9|VII|VIII|IX)\b/)) tarif = 250000;
                else tarif = 200000;

                if (p.jumlah !== tarif) {
                    await pembayaran.updateOne({ _id: p._id }, { $set: { jumlah: tarif } });
                    updatedCount++;
                    console.log(`Updated ${p.namaSiswa} to ${tarif}`);
                }
            }
        }
        console.log("Finished. Updated " + updatedCount + " records.");
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
