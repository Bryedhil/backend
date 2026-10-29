const express = require("express");
const Contribution = require("../models/Contribution");
const Expense = require("../models/Expense");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const type = String(req.query.type || "").toLowerCase();
    if (type && !["contribution", "expense"].includes(type)) return res.status(400).json({ message: 'type must be "contribution" or "expense"' });
    const [contributions, expenses] = await Promise.all([
      type === "expense" ? [] : Contribution.find().populate("studentId", "studentId name section").lean(),
      type === "contribution" ? [] : Expense.find().lean()
    ]);
    const data = [
      ...contributions.map(x => ({ ...x, type: "contribution", amount: Number(x.amount) })),
      ...expenses.map(x => ({ ...x, type: "expense", amount: Number(x.amount) }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ count: data.length, data });
  } catch (e) { next(e); }
});
module.exports = router;
