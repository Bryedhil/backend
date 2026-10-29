const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const StudentCharge = require("../models/StudentCharge");
const { authenticate, allowRoles } = require("../middleware/auth");
const router = express.Router();

router.use(authenticate, allowRoles("treasurer", "admin"));

router.get("/", async (req, res, next) => {
  try {
    const data = await StudentCharge.find().populate("student", "studentId name section").sort({ createdAt: -1 });
    res.json({ count: data.length, data });
  } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { studentId, description, amount, dueDate } = req.body;
    if (!studentId || !description || amount === undefined) return res.status(400).json({ message: "studentId, description, and amount are required." });
    if (!mongoose.isValidObjectId(studentId) || !(await Student.exists({ _id: studentId }))) return res.status(400).json({ message: "Select an existing student." });
    const charge = await StudentCharge.create({ student: studentId, description, amount, dueDate: dueDate || null, recordedBy: req.user.username });
    res.status(201).json({ message: "Charge assigned.", data: await charge.populate("student", "studentId name section") });
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid charge ID." });
    const updates = {};
    if (req.body.studentId !== undefined) {
      if (!mongoose.isValidObjectId(req.body.studentId) || !(await Student.exists({ _id: req.body.studentId }))) return res.status(400).json({ message: "Select an existing student." });
      updates.student = req.body.studentId;
    }
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.amount !== undefined) updates.amount = req.body.amount;
    if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate || null;
    const data = await StudentCharge.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate("student", "studentId name section");
    if (!data) return res.status(404).json({ message: "Charge not found." });
    res.json({ message: "Charge updated.", data });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid charge ID." });
    const charge = await StudentCharge.findByIdAndDelete(req.params.id);
    if (!charge) return res.status(404).json({ message: "Charge not found." });
    res.json({ message: "Charge deleted." });
  } catch (e) { next(e); }
});
module.exports = router;
