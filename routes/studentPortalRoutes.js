const express = require("express");
const Student = require("../models/Student");
const Contribution = require("../models/Contribution");
const StudentCharge = require("../models/StudentCharge");
const Expense = require("../models/Expense");
const { authenticate, allowRoles } = require("../middleware/auth");
const router = express.Router();

router.use(authenticate, allowRoles("student"));

router.get("/me", async (req, res, next) => {
  try {
    if (!req.user.student) return res.status(404).json({ message: "No student profile is linked to this account. Contact the treasurer." });
    const student = await Student.findById(req.user.student).select("studentId name section status");
    if (!student) return res.status(404).json({ message: "Student profile not found." });
    const [payments, charges, classExpenses] = await Promise.all([
      Contribution.find({ studentId: student._id }).sort({ date: -1 }).lean(),
      StudentCharge.find({ student: student._id }).sort({ dueDate: 1, createdAt: -1 }).lean(),
      Expense.find().sort({ date: -1 }).lean()
    ]);
    const totalPaid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalCharged = charges.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    res.json({
      student,
      summary: { totalPaid, totalCharged, unpaidBalance: Math.max(0, totalCharged - totalPaid) },
      payments,
      charges,
      classExpenses
    });
  } catch (e) { next(e); }
});

module.exports = router;
