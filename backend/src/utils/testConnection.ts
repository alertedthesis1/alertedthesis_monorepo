import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';

dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in .env');
    console.error('   Make sure .env contains: MONGODB_URI=mongodb+srv://...');
    process.exit(1);
  }

  console.log('📋 Connection Details:');
  console.log('   URI:', MONGODB_URI.replace(/:[^:]+@/, ':***@')); // Hide password
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('');

  try {
    console.log('⏳ Attempting to connect...');

    const connection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000,
    });

    console.log('✅ SUCCESS! Connected to MongoDB Atlas!\n');

    // Test ping
    console.log('🔍 Verifying connection...');
    const db = connection.connection.db;
    const ping = await db?.admin().ping();
    console.log('✅ Ping successful!');
    console.log('   Database:', connection.connection.name);
    console.log('   Host:', connection.connection.host);
    console.log('   Port:', connection.connection.port);

    // List collections
    console.log('\n📚 Collections in database:');
    const collections = await connection.connection.db?.listCollections().toArray();
    if (collections && collections.length > 0) {
      collections.forEach((col: any) => {
        console.log('   ✓', col.name);
      });
    } else {
      console.log('   (No collections yet - database is empty)');
    }

    await mongoose.disconnect();
    console.log('\n✅ Connection test passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ CONNECTION FAILED!\n');
    console.error('Error Type:', error.name);
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 DIAGNOSIS: Network/DNS issue');
      console.error('   Possible causes:');
      console.error('   1. IP not whitelisted in MongoDB Atlas');
      console.error('   2. Wrong database name in connection string');
      console.error('   3. MongoDB cluster is paused');
      console.error('   4. Firewall/Network blocking connection');
      console.error('   5. Invalid hostname in connection string');
    }

    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DIAGNOSIS: Hostname not found');
      console.error('   Check your connection string hostname');
    }

    if (error.message?.includes('authentication failed')) {
      console.error('\n💡 DIAGNOSIS: Authentication failed');
      console.error('   Check username and password in connection string');
      console.error('   Make sure special characters are URL-encoded');
    }

    process.exit(1);
  }
}

testConnection();
