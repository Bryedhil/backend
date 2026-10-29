const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, trim: true, lowercase: true, default: undefined, index: { unique: true, sparse: true } },
  passwordResetTokenHash: { type: String, default: null },
  passwordResetExpiresAt: { type: Date, default: null },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["student", "treasurer", "admin"], required: true, default: "student" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
  mustChangePassword: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
