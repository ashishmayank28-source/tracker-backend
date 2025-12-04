import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("❌ MONGO_URI not found. Check your .env file.");
  }

  await mongoose.connect(uri);

  const users = await User.find({ managerEmpCode: { $exists: true, $ne: "" } });

  for (const u of users) {
    const m = await User.findOne({ empCode: u.managerEmpCode });
    if (m && !u.managerName) {
      u.managerName = m.name;
      await u.save();
      console.log(`✅ Updated ${u.empCode} -> ${u.managerEmpCode} - ${m.name}`);
    }
  }

  console.log("🎉 Manager names fixed.");
  process.exit();
}

run();