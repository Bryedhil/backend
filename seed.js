require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");
const Contribution = require("./models/Contribution");
const Expense = require("./models/Expense");

async function seedDatabase() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Create a .env file first.");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    let students = await Student.find();
    if (students.length === 0) {
      students = await Student.insertMany([
        { studentId: "2026-001", name: "Juan Dela Cruz", section: "BSIT 3-C", status: "active" },
        { studentId: "2026-002", name: "Maria Santos", section: "BSIT 3-C", status: "active" },
        { studentId: "2026-003", name: "Pedro Reyes", section: "BSIT 3-C", status: "active" },
        { studentId: "2026-004", name: "Ana Garcia", section: "BSIT 3-C", status: "active" },
        { studentId: "2026-005", name: "Jose Ramos", section: "BSIT 3-C", status: "active" }
      ]);
      console.log("Class Of BSIT-C");
    } else {
      console.log(`Students collection already has ${students.length} records; leaving it unchanged.`);
    }

    if ((await Contribution.countDocuments()) === 0) {
      const byStudentCode = new Map(students.map(s => [s.studentId, s._id]));
      const sampleContributions = [
        ["2026-001", 500, "Class contribution"],
        ["2026-002", 500, "Class contribution"],
        ["2026-003", 500, "Class contribution"],
        ["2026-004", 250, "Class contribution"],
        ["2026-005", 250, "Class contribution"]
      ].filter(([code]) => byStudentCode.has(code)).map(([code, amount, description], index) => ({
        studentId: byStudentCode.get(code), amount, description,
        date: new Date(Date.now() - (index + 1) * 86400000)
      }));
      if (sampleContributions.length) {
        await Contribution.insertMany(sampleContributions);
        console.log(`Inserted ${sampleContributions.length} sample contributions.`);
      } else {
        console.log("No matching sample students found; skipped sample contributions.");
      }
    } else {
      console.log("Contributions collection already has records; leaving it unchanged.");
    }

    if ((await Expense.countDocuments()) === 0) {
      await Expense.insertMany([
        { description: "Printing expenses", category: "School Supplies", amount: 200, recordedBy: "Treasurer", date: new Date(Date.now() - 2 * 86400000) },
        { description: "Classroom materials", category: "Materials", amount: 150, recordedBy: "Treasurer", date: new Date(Date.now() - 86400000) },
        { description: "Event supplies", category: "Events", amount: 150, recordedBy: "Treasurer", date: new Date() }
      ]);
      console.log("Inserted 3 sample expenses.");
    } else {
      console.log("Expenses collection already has records; leaving it unchanged.");
    }

    const [contributionTotal, expenseTotal] = await Promise.all([
      Contribution.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);
    console.log("Seed setup complete. Current totals:");
    console.log(`Contributions: ₱${(contributionTotal[0]?.total || 0).toFixed(2)}`);
    console.log(`Expenses: ₱${(expenseTotal[0]?.total || 0).toFixed(2)}`);
    console.log(`Balance: ₱${((contributionTotal[0]?.total || 0) - (expenseTotal[0]?.total || 0)).toFixed(2)}`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
}
seedDatabase();
