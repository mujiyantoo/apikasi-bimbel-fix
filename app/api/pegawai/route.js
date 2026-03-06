/**
 * COPY FILE INI KE: app/api/pegawai/route.js
 * 
 * GANTI SELURUH ISI FILE dengan kode di bawah ini
 */
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

import { NextResponse } from 'next/server';
import { getMongoConnection } from '@/lib/mongodb';
export const dynamic = 'force-dynamic'

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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    let query = {}
    if (search) {
      query.$or = [
        { nama: { $regex: search, $options: 'i' } },
        { nip: { $regex: search, $options: 'i' } }
      ]
    }

    const { db } = connection;

    const pegawai = await db.collection('pegawai')
      .find({})
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
      .toArray()

    const formatted = pegawai.map(p => ({
      ...p,
      id: p._id.toString()
    }))

    return NextResponse.json({ 
      success: true, 
      data: pegawai 
    });
    return NextResponse.json(formatted)
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
    console.error('Error fetching pegawai:', error)
    return NextResponse.json({ error: 'Gagal memuat data pegawai' }, { status: 500 })
  }
}

// POST /api/pegawai - Create new pegawai
export async function POST(request) {
  try {
    const body = await request.json();
    const connection = await getMongoConnection();
    const body = await request.json()

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
    const client = await clientPromise
    const db = client.db(process.env.DB_NAME || 'bimbel_db')

    const pegawaiData = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    }

    const result = await db.collection('pegawai').insertOne(pegawaiData);
    const newPegawai = await db.collection('pegawai').findOne({ _id: result.insertedId });
    const result = await db.collection('pegawai').insertOne(pegawaiData)
    const newPegawai = await db.collection('pegawai').findOne({ _id: result.insertedId })

    return NextResponse.json({ 
      success: true, 
      data: newPegawai,
      message: 'Pegawai created successfully'
    }, { status: 201 });
    return NextResponse.json({
      ...newPegawai,
      id: newPegawai._id.toString()
    }, { status: 201 })
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
    console.error('Error creating pegawai:', error)
    return NextResponse.json({ error: 'Gagal menambahkan pegawai' }, { status: 500 })
  }
}
