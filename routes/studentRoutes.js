const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const filter = {};
    if (search) {
      const q = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } },
        { section: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } },
        { yearLevel: { $regex: q, $options: "i" } }
      ];
    }
    const data = await Student.find(filter).sort({ name: 1 });
    res.json({ count: data.length, data });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid student ID format" });
    const data = await Student.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Student not found" });
    res.json(data);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { studentId, name, course, yearLevel, section, status } = req.body;
    if (!studentId || !name || !section) return res.status(400).json({ message: "studentId, name, and section are required" });
    const data = await Student.create({ studentId, name, course, yearLevel, section, status });
    res.status(201).json({ message: "Student created", data });
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid student ID format" });
    const allowed = ["studentId", "name", "course", "yearLevel", "section", "status"];
    const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    const data = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student updated", data });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid student ID format" });
    const data = await Student.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted", data });
  } catch (e) { next(e); }
});
module.exports = router;
