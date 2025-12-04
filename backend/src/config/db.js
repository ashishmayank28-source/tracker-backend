import mongoose from 'mongoose';
const URI = process.env.MONGODB_URI || process.env.MONGO_URI;
export async function connectDB() {
  if (!URI) throw new Error('Missing MONGODB_URI or MONGO_URI in .env');
  mongoose.set('strictQuery', true);
  await mongoose.connect(URI, { dbName: process.env.MONGO_DB || process.env.DB_NAME || 'tracker' });
  console.log('MongoDB connected:', mongoose.connection.name);
}
export default connectDB;
