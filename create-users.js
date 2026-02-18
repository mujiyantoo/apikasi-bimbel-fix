// create-users.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Ganti dengan connection string MongoDB kamu
const uri = 'mongodb+srv://muj582_db_user:PASSWORDKAMU@cluster0.6ei0xqq.mongodb.net/bimbel_db?appName=Cluster0';

async function createUsers() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('bimbel_db');
    const usersCollection = db.collection('users');

    // Hash password
    const hashedPasswordOwner = await bcrypt.hash('owner123', 10);
    const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);

    // Data user Owner
    const owner = {
      name: 'Owner Bimbel',
      email: 'owner@bimbel.com',
      password: hashedPasswordOwner,
      role: 'Owner',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Data user Admin
    const admin = {
      name: 'Admin Bimbel',
      email: 'admin@bimbel.com',
      password: hashedPasswordAdmin,
      role: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Hapus user lama kalau ada (opsional)
    await usersCollection.deleteMany({ email: { $in: ['owner@bimbel.com', 'admin@bimbel.com'] } });

    // Insert user baru
    const result = await usersCollection.insertMany([owner, admin]);

    console.log('✅ Users berhasil dibuat!');
    console.log('');
    console.log('📋 Kredensial Login:');
    console.log('');
    console.log('👑 OWNER:');
    console.log('   Email: owner@bimbel.com');
    console.log('   Password: owner123');
    console.log('');
    console.log('👤 ADMIN:');
    console.log('   Email: admin@bimbel.com');
    console.log('   Password: admin123');
    console.log('');
    console.log(`Total user dibuat: ${result.insertedCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ Connection closed');
  }
}

createUsers();
