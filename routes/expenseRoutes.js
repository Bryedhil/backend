const express = require("express");
const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const filter = {};
    if (search) {
      const q = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { description: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { recordedBy: { $regex: q, $options: "i" } }
      ];
    }
    const data = await Expense.find(filter).sort({ date: -1 });
    res.json({ count: data.length, data });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { description, category, amount, date, recordedBy, paymentStatus } = req.body;
    if (!description || !category || amount === undefined) return res.status(400).json({ message: "description, category, and amount are required" });
    const data = await Expense.create({ description, category, amount, date, recordedBy, ...(paymentStatus ? { paymentStatus } : {}) });
    res.status(201).json({ message: "Expense created", data });
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid expense ID format" });
    const allowed = {};
    for (const key of ["description", "category", "amount", "date", "recordedBy", "paymentStatus"]) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) allowed[key] = req.body[key];
    }
    const data = await Expense.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense updated", data });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid expense ID format" });
    const data = await Expense.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted", data });
  } catch (e) { next(e); }
});
module.exports = router;
