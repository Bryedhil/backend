const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  course: { type: String, trim: true, default: "BSIT" },
  yearLevel: { type: String, trim: true, default: "1st Year" },
  section: { type: String, required: true, trim: true, default: "BSIT 3-C" },
  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
