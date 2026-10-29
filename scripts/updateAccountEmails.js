require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { parse } = require("csv-parse/sync");
const User = require("../models/User");

async function run() {
  const csvPath = path.join(process.cwd(), "account-emails.csv");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Configure .env first.");
  if (!fs.existsSync(csvPath)) throw new Error("Create account-emails.csv with username,email columns in this folder first.");
  await mongoose.connect(process.env.MONGODB_URI);
  const rows = parse(fs.readFileSync(csvPath), { columns: true, skip_empty_lines: true, bom: true, trim: true });
  let updated = 0, skipped = 0;
  for (const row of rows) {
    const username = String(row.username || "").trim().toLowerCase();
    const email = String(row.email || "").trim().toLowerCase();
    if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn(`Skipped invalid row for username "${username || '(missing)'}".`);
      skipped++;
      continue;
    }
    const user = await User.findOne({ username });
    if (!user) {
      console.warn(`No account found for username "${username}".`);
      skipped++;
      continue;
    }
    user.email = email;
    await user.save();
    updated++;
  }
  console.log(`Account email update complete. Updated ${updated}; skipped ${skipped}. Passwords were not changed.`);
}
run().catch(e => { console.error("Account email update failed:", e.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });
