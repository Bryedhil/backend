const mongoose = require("mongoose");

const studentChargeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  dueDate: { type: Date, default: null },
  recordedBy: { type: String, default: "Treasurer", trim: true }
}, { timestamps: true });

module.exports = mongoose.model("StudentCharge", studentChargeSchema);
