let mongoClient = null;
let mongoDb = null;

export async function getMongoConnection() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    return null;
  }

  const uri = process.env.MONGODB_URI.trim();

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MongoDB URI format');
    return null;
  }

  if (mongoClient && mongoDb) {
    return { client: mongoClient, db: mongoDb };
  }

  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db();

    mongoClient = client;
    mongoDb = db;

    console.log('✅ MongoDB connected');
    return { client, db };

  } catch (error) {
    console.error('❌ MongoDB error:', error);
    return null;
  }
}
