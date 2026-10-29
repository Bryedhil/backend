const express = require("express");
const mongoose = require("mongoose");
const Contribution = require("../models/Contribution");
const Student = require("../models/Student");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const filter = {};
    if (search) {
      const q = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const students = await Student.find({ $or: [
        { name: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } }
      ] }).select("_id");
      filter.$or = [
        { description: { $regex: q, $options: "i" } },
        { studentId: { $in: students.map(s => s._id) } }
      ];
    }
    const data = await Contribution.find(filter).populate("studentId", "studentId name section").sort({ date: -1 });
    res.json({ count: data.length, data });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { studentId, amount, description, date } = req.body;
    if (!studentId || amount === undefined) return res.status(400).json({ message: "studentId and amount are required" });
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ message: "studentId must be a valid MongoDB student _id" });
    if (!(await Student.exists({ _id: studentId }))) return res.status(404).json({ message: "Student not found" });
    const created = await Contribution.create({ studentId, amount, description, date });
    const data = await created.populate("studentId", "studentId name section");
    res.status(201).json({ message: "Contribution created", data });
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid contribution ID format" });
    if (req.body.studentId && (!mongoose.isValidObjectId(req.body.studentId) || !(await Student.exists({ _id: req.body.studentId })))) return res.status(400).json({ message: "studentId must reference an existing student" });
    const data = await Contribution.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("studentId", "studentId name section");
    if (!data) return res.status(404).json({ message: "Contribution not found" });
    res.json({ message: "Contribution updated", data });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid contribution ID format" });
    const data = await Contribution.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ message: "Contribution not found" });
    res.json({ message: "Contribution deleted", data });
  } catch (e) { next(e); }
});
module.exports = router;
