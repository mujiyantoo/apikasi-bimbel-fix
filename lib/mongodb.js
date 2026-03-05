import { MongoClient } from 'mongodb';

let mongoClient = null;
let mongoDb = null;

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not set');
}

const client = new MongoClient(uri || '');
const clientPromise = client.connect();

export default clientPromise;

export async function getMongoConnection() {
  if (!uri) return null;

  const uriTrimmed = uri.trim();

  if (!uriTrimmed.startsWith('mongodb://') && !uriTrimmed.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MongoDB URI format');
    return null;
  }

  if (mongoClient && mongoDb) {
    return { client: mongoClient, db: mongoDb };
  }

  try {
    const connectedClient = await clientPromise;
    const db = connectedClient.db('bimbel_db');
    mongoClient = connectedClient;
    mongoDb = db;
    console.log('✅ MongoDB connected to bimbel_db');
    return { client: mongoClient, db };
  } catch (error) {
    console.error('❌ MongoDB error:', error);
    return null;
  }
}
