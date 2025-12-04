import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/userModel.js';
async function main() {
  await connectDB();
  const empCode = 'TEST100';
  const name = 'Test Admin';
  const role = 'Admin';
  const password = process.env.DEFAULT_USER_PASSWORD || '123456';
  const hash = await bcrypt.hash(password, 10);
  const doc = await User.findOneAndUpdate(
    { empCode },
    { $set: { name, role, passwordHash: hash, isActive: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  console.log('Upserted:', { empCode: doc.empCode, role: doc.role });
  console.log('Login with:', { empCode, password });
  process.exit(0);
}
main().catch((e)=>{ console.error(e); process.exit(1); });
