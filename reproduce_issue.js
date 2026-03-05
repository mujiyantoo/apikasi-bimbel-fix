
const { MongoClient } = require('mongodb');


const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;


async function run() {
    console.log("Attempting to connect to MongoDB...");
    console.log(`URI: ${uri.replace(/:([^:@]+)@/, ':****@')}`); // Hide password in logs

    // Add connection timeout options
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
    });


    try {
        await client.connect();
        console.log("Connected correctly to server");

        const db = client.db(dbName);
        const col = db.collection('siswa');

        // Clean up previous test data
        await col.deleteMany({ nis: "TEST001" });

        // Insert a document
        const newSiswa = {
            nama: "Test Student",
            nis: "TEST001",
            kelas: "10 SMA",
            mataPelajaran: "Matematika",
            jenisKelamin: "Laki-laki",
            telepon: "08123456789",
            alamat: "Jl. Test No. 1",
            tanggalMasuk: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await col.insertOne(newSiswa);
        console.log(`Document inserted with _id: ${result.insertedId}`);

        // Find the document
        const myDoc = await col.findOne({ nis: "TEST001" });
        console.log("Found document:");
        console.log(myDoc);

        // List all docs
        const allDocs = await col.find({}).limit(5).toArray();
        console.log("First 5 docs in collection:");
        console.log(allDocs);

    } catch (err) {
        console.error(err.stack);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
