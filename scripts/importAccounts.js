require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { parse } = require("csv-parse/sync");
const Student = require("../models/Student");
const User = require("../models/User");

async function run() {
  const csvPath = path.join(process.cwd(), "student-expense-login-credentials.csv");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Configure .env first.");
  if (!fs.existsSync(csvPath)) throw new Error("Copy student-expense-login-credentials.csv into the backend root folder first.");
  await mongoose.connect(process.env.MONGODB_URI);
  const rows = parse(fs.readFileSync(csvPath), { columns: true, skip_empty_lines: true, bom: true, trim: true });
  let created = 0, updated = 0;
  for (const row of rows) {
    const username = String(row.username || "").trim().toLowerCase();
    const name = String(row.student_name || "").trim();
    const officialId = String(row.student_id || "").trim();
    const temporaryPassword = String(row.temporary_password || "");
    const email = String(row.email || "").trim().toLowerCase() || null;
    if (!username || !name || !temporaryPassword) {
      console.warn(`Skipped incomplete row for ${name || "(unnamed student)"}`);
      continue;
    }
    let student = await Student.findOne({ $or: [{ studentId: officialId || "__no_match__" }, { name }] });
    if (!student) {
      student = await Student.create({
        studentId: officialId || username,
        name,
        section: process.env.CLASS_SECTION || "BSIT 3-C",
        status: "active"
      });
    } else if (!officialId && student.studentId !== username) {
      // Existing student IDs are not overwritten when an official ID is missing.
    }
    const existing = await User.findOne({ username });
    const userFields = {
      username,
      ...(email ? { email } : {}),
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      role: "student",
      student: student._id,
      mustChangePassword: true,
      active: true
    };
    if (existing) {
      existing.set(userFields);
      await existing.save();
      updated++;
    } else {
      await User.create(userFields);
      created++;
    }
  }
  console.log(`Account import complete. Created ${created}; updated ${updated}.`);
  console.log("Each student must change their temporary password after signing in.");
}
run().catch(e => { console.error("Account import failed:", e.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });
