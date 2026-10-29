const express = require("express");
const Student = require("../models/Student");
const Contribution = require("../models/Contribution");
const Expense = require("../models/Expense");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [studentCount, contributionResult, expenseResult] = await Promise.all([
      Student.countDocuments({ status: "active" }),
      Contribution.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);
    const totalContributions = contributionResult[0]?.total || 0;
    const totalExpenses = expenseResult[0]?.total || 0;
    res.json({ studentCount, totalContributions, totalExpenses, remainingBalance: totalContributions - totalExpenses });
  } catch (e) { next(e); }
});
module.exports = router;
