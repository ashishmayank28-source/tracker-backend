/**
 * 🗑️ MongoDB Reset Script - Clear All Test Data
 * Run: node scripts/resetDatabase.js
 * 
 * This script:
 * 1. Clears all documents from used collections (keeps structure)
 * 2. Drops unused collections completely
 * 3. Keeps only Users collection (optional - based on KEEP_USERS flag)
 */

import mongoose from 'mongoose';

// ✅ Set to true to keep users, false to delete them too
const KEEP_USERS = true;

// ✅ Direct MongoDB Atlas Connection
const MONGODB_URI = "mongodb+srv://ashishmayank28:Ashish-2010@sales-cluster.cik3b7j.mongodb.net/sales-tracker?retryWrites=true&w=majority&appName=Sales-Cluster";

// ✅ Collections that ARE being used by the app
const USED_COLLECTIONS = [
  'users',           // userModel.js
  'customers',       // customerModel.js
  'assignments',     // assignmentModel.js
  'revenues',        // revenueModel.js
  'assets',          // assetModel.js
  'assetledgers',    // assetLedgerModel.js
];

async function resetDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to database: sales-tracker\n`);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('📦 Current Collections in Database:');
    console.log('─'.repeat(60));

    let clearedCount = 0;
    let droppedCount = 0;
    let totalDocsDeleted = 0;

    for (const name of collectionNames) {
      const isUsed = USED_COLLECTIONS.includes(name);
      const count = await db.collection(name).countDocuments();

      if (isUsed) {
        // For used collections - clear documents (except users if KEEP_USERS is true)
        if (name === 'users' && KEEP_USERS) {
          console.log(`  ⏭️  SKIPPED | ${name.padEnd(20)} | ${count} docs (Users preserved)`);
        } else {
          try {
            const result = await db.collection(name).deleteMany({});
            console.log(`  🧹 CLEARED | ${name.padEnd(20)} | ${result.deletedCount} docs deleted`);
            totalDocsDeleted += result.deletedCount;
            clearedCount++;
          } catch (err) {
            console.log(`  ⚠️  ERROR   | ${name.padEnd(20)} | ${err.message}`);
          }
        }
      } else {
        // For unused collections - drop completely
        try {
          await db.collection(name).drop();
          console.log(`  🗑️  DROPPED | ${name.padEnd(20)} | ${count} docs removed`);
          totalDocsDeleted += count;
          droppedCount++;
        } catch (err) {
          console.log(`  ⚠️  ERROR   | ${name.padEnd(20)} | ${err.message}`);
        }
      }
    }

    console.log('─'.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   • Collections cleared: ${clearedCount}`);
    console.log(`   • Collections dropped: ${droppedCount}`);
    console.log(`   • Total documents deleted: ${totalDocsDeleted}`);
    console.log(`\n✅ Database reset complete! All collections are now fresh.`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This will DELETE all test data!');
console.log(`   Users will be: ${KEEP_USERS ? 'PRESERVED ✅' : 'DELETED ❌'}`);
console.log('\n');

resetDatabase();

