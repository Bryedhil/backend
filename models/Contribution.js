const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, trim: true, default: "Section contribution" }
}, { timestamps: true });

module.exports = mongoose.model("Contribution", contributionSchema);
