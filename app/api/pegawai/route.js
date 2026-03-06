import { NextResponse } from 'next/server';
import { getMongoConnection } from '@/lib/mongodb';

// GET /api/pegawai - Get all pegawai
export async function GET(request) {
  try {
    const connection = await getMongoConnection();

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not configured',
          message: 'MongoDB connection is not available',
          data: []
        },
        { status: 503 }
      );
    }

    const { db } = connection;

    const pegawai = await db.collection('pegawai')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: pegawai
    });
  } catch (error) {
    console.error('❌ GET /api/pegawai Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        data: []
      },
      { status: 500 }
    );
  }
}

// POST /api/pegawai - Create new pegawai
export async function POST(request) {
  try {
    const body = await request.json();
    const connection = await getMongoConnection();

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not configured',
          message: 'MongoDB connection is not available'
        },
        { status: 503 }
      );
    }

    const { db } = connection;

    const pegawaiData = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('pegawai').insertOne(pegawaiData);
    const newPegawai = await db.collection('pegawai').findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      data: newPegawai,
      message: 'Pegawai created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('❌ POST /api/pegawai Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      },
      { status: 500 }
    );
  }
}
