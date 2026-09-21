import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User';

dotenv.config();

async function seedUsers() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const usersToSeed = [
      {
        email: 'admin@sjc.edu.ph',
        password: 'admin123',
        name: 'Dr. Ramon Aquino',
        role: 'admin',
        department: 'IT Department',
      },
      {
        email: 'counselor@sjc.edu.ph',
        password: 'counselor123',
        name: 'Ms. Anne Gabrielle Cortezano',
        role: 'counselor',
        department: 'Student Affairs',
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of usersToSeed) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping`);
        skippedCount++;
      } else {
        const user = new User(userData);
        await user.save();
        console.log(`✓ Created user: ${userData.email} (${userData.role})`);
        createdCount++;
      }
    }

    console.log(`\n✅ Seeding complete: ${createdCount} users created, ${skippedCount} skipped`);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedUsers();
