require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/", (req, res) => res.json({
  message: "Student Expense List System API is running",
  endpoints: [
    "GET /api/students", "POST /api/students", "PUT /api/students/:id", "DELETE /api/students/:id",
    "GET /api/contributions", "POST /api/contributions", "PUT /api/contributions/:id", "DELETE /api/contributions/:id",
    "GET /api/expenses", "POST /api/expenses", "PUT /api/expenses/:id", "DELETE /api/expenses/:id",
    "GET /api/transactions", "GET /api/dashboard", "POST /api/auth/login", "GET /api/auth/me", "GET /api/student-portal/me", "GET /api/charges", "POST /api/charges", "PUT /api/charges/:id", "DELETE /api/charges/:id", "POST /api/ai/chat", "POST /api/ai/admin-summary"
  ]
}));
app.get("/api/health", (req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/student-portal", require("./routes/studentPortalRoutes"));
const { authenticate, allowRoles } = require("./middleware/auth");
app.use("/api/students", authenticate, allowRoles("treasurer", "admin"), require("./routes/studentRoutes"));
app.use("/api/contributions", authenticate, allowRoles("treasurer", "admin"), require("./routes/contributionRoutes"));
app.use("/api/expenses", authenticate, allowRoles("treasurer", "admin"), require("./routes/expenseRoutes"));
app.use("/api/transactions", authenticate, allowRoles("treasurer", "admin"), require("./routes/transactionRoutes"));
app.use("/api/dashboard", authenticate, allowRoles("treasurer", "admin"), require("./routes/dashboardRoutes"));
app.use("/api/charges", require("./routes/chargeRoutes"));
app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: "A student with this studentId already exists." });
  if (err.name === "ValidationError" || err.name === "CastError") return res.status(400).json({ message: err.message });
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Copy .env.example to .env and configure it.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB.");
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
