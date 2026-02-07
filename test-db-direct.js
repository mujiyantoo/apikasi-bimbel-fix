
const { MongoClient } = require('mongodb');

async function testConnection() {
    const uri = "mongodb+srv://muj582_db_user:fgsnNqUbe6pBPHFX@cluster0.6ei0xqq.mongodb.net/?appName=Cluster0";
    const dbName = "bimbel_db";

    console.log('Attempting to connect to MongoDB directly...');
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Successfully connected to MongoDB!');
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await client.close();
    }
}

testConnection();
