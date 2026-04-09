import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!uri) {
  console.error('❌ MONGODB_URI / MONGO_URL not set');
}

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR.
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri || '', options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri || '', options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getMongoConnection() {
  if (!uri) return null;

  const uriTrimmed = uri.trim();

  if (!uriTrimmed.startsWith('mongodb://') && !uriTrimmed.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MongoDB URI format');
    return null;
  }

  try {
    const connectedClient = await clientPromise;
    const db = connectedClient.db(process.env.DB_NAME || 'bimbel_db');
    console.log('✅ MongoDB connected to bimbel_db');
    return { client: connectedClient, db };
  } catch (error) {
    console.error('❌ MongoDB error:', error);
    return null;
  }
}
