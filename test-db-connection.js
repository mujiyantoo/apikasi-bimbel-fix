
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
    const uri = process.env.MONGO_URL;
    if (!uri) {
        console.error('MONGO_URL not found in .env');
        process.exit(1);
    }

    console.log('Attempting to connect to MongoDB...');
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Successfully connected to MongoDB!');
        const db = client.db(process.env.DB_NAME);
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await client.close();
    }
}

testConnection();
