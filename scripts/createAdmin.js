require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function run() {
  const username = String(process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase() || null;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing.");
  if (!username || password.length < 12) throw new Error("Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters in .env before running this script.");
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { username },
    { username, ...(email ? { email } : {}), passwordHash, role: "admin", student: null, mustChangePassword: false, active: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Administrator account ready for username "${username}".`);
}
run().catch(e => { console.error("Admin setup failed:", e.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });
