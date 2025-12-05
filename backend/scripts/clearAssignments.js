/**
 * 🗑️ Clear All Assignments Script
 * Run: node scripts/clearAssignments.js
 */

import mongoose from 'mongoose';
import Assignment from '../src/models/assignmentModel.js';

const MONGODB_URI = "mongodb+srv://ashishmayank28:Ashish-2010@sales-cluster.cik3b7j.mongodb.net/sales-tracker?retryWrites=true&w=majority&appName=Sales-Cluster";

async function clearAssignments() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // List all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📦 Available collections:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   - ${col.name}: ${count} docs`);
    }
    console.log('');

    // Clear using Mongoose model
    const count = await Assignment.countDocuments();
    console.log(`📊 Found ${count} assignments in model`);
    
    const result = await Assignment.deleteMany({});
    console.log(`🧹 Deleted ${result.deletedCount} assignments via model`);

    // Also try direct collection
    const directResult = await db.collection('assignments').deleteMany({});
    console.log(`🧹 Deleted ${directResult.deletedCount} from 'assignments' collection directly`);

    console.log('\n✅ All assignments cleared successfully!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
    process.exit(0);
  }
}

clearAssignments();

