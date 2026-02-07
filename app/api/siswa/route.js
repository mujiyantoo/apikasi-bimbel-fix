
import { NextResponse } from 'next/server';

// ✅ LAZY CONNECTION - hanya connect saat runtime, BUKAN build time
let mongoClient = null;
let mongoDb = null;

async function getMongoConnection() {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  const uri = process.env.MONGODB_URI.trim();
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.warn('Invalid MongoDB URI format');
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

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null;
  }
}

// GET /api/siswa - Get all siswa
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const connection = await getMongoConnection();

    if (!connection) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          message: 'MongoDB connection is not available'
        },
        { status: 503 }
      );
    }

    const { db } = connection;

    const siswa = await db.collection('siswa')
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('siswa').countDocuments();

    return NextResponse.json({ 
      success: true, 
      data: siswa,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      },
      { status: 500 }
    );
  }
}

// POST /api/siswa - Create new siswa
export async function POST(request) {
  try {
    const body = await request.json();

    const connection = await getMongoConnection();

    if (!connection) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { db } = connection;

    const result = await db.collection('siswa').insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const newSiswa = await db.collection('siswa').findOne({ _id: result.insertedId });

    return NextResponse.json({ 
      success: true, 
      data: newSiswa,
      message: 'Siswa created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      },
      { status: 500 }
    );
  }
}
