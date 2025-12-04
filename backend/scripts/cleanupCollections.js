/**
 * 🗑️ MongoDB Cleanup Script
 * Run: node scripts/cleanupCollections.js
 * 
 * This script:
 * 1. Lists all collections in the database
 * 2. Shows which ones are being used by models
 * 3. Drops unused collections
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ✅ Collections that ARE being used by the app
const USED_COLLECTIONS = [
  'users',           // userModel.js
  'customers',       // customerModel.js
  'assignments',     // assignmentModel.js
  'revenues',        // revenueModel.js
  'assets',          // assetModel.js
  'assetledgers',    // assetLedgerModel.js
];

async function cleanup() {
  try {
    // Connect to MongoDB (same logic as config/db.js)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB || process.env.DB_NAME || 'tracker';
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI or MONGO_URI not found in .env');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log(`✅ Connected to database: ${dbName}\n`);

    // Get all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('📦 All Collections in Database:');
    console.log('─'.repeat(50));
    
    const unusedCollections = [];
    
    for (const name of collectionNames) {
      const isUsed = USED_COLLECTIONS.includes(name);
      const status = isUsed ? '✅ USED' : '❌ UNUSED';
      
      // Get document count
      const count = await db.collection(name).countDocuments();
      
      console.log(`  ${status} | ${name.padEnd(25)} | ${count} docs`);
      
      if (!isUsed) {
        unusedCollections.push({ name, count });
      }
    }

    console.log('─'.repeat(50));
    console.log(`\n📊 Summary: ${collectionNames.length} total, ${unusedCollections.length} unused\n`);

    if (unusedCollections.length === 0) {
      console.log('🎉 No unused collections found!');
    } else {
      console.log('🗑️ Dropping unused collections...\n');
      
      for (const { name, count } of unusedCollections) {
        try {
          await db.collection(name).drop();
          console.log(`  ✅ Dropped: ${name} (${count} docs)`);
        } catch (err) {
          console.log(`  ⚠️ Could not drop ${name}: ${err.message}`);
        }
      }
      
      console.log('\n✅ Cleanup complete!');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanup();


