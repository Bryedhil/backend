const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Student = require("../models/Student");
const { authenticate } = require("../middleware/auth");
const router = express.Router();


// Public self-registration is restricted to an existing, active school student record.
// New accounts always receive the student role; clients cannot choose a privileged role.
router.post("/register", async (req, res, next) => {
  try {
    const studentId = String(req.body.studentId || "").trim();
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "").trim().toLowerCase();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!studentId || !name || !username || !email || !password) {
      return res.status(400).json({ message: "Student ID, full name, username, school email, and password are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid school email address." });
    if (password.length < 10) return res.status(400).json({ message: "Password must be at least 10 characters long." });
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ message: "Username must be 3–30 characters and use only letters, numbers, dots, underscores, or hyphens." });

    const student = await Student.findOne({ studentId, status: "active" });
    if (!student || student.name.trim().toLowerCase() !== name.toLowerCase()) {
      return res.status(400).json({ message: "We couldn't verify those details. Check your student ID and full name, or contact your school administrator." });
    }
    const existingStudentAccount = await User.findOne({ student: student._id, active: true });
    if (existingStudentAccount) return res.status(409).json({ message: "An account already exists for this student. Use Forgot password or contact the administrator." });
    if (await User.findOne({ $or: [{ username }, { email }] })) {
      return res.status(409).json({ message: "That username or email is already registered." });
    }
    const user = await User.create({
      username, email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "student", student: student._id,
      mustChangePassword: false, active: true
    });
    return res.status(201).json({ message: "Account created. You can now sign in.", user: { id: user._id, username: user.username, role: user.role } });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "That username or email is already registered." });
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!username || !password) return res.status(400).json({ message: "Username and password are required." });
    let user = await User.findOne({ username });
    if (!user && username) {
      const student = await Student.findOne({ studentId: username });
      if (student) user = await User.findOne({ student: student._id });
    }
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Incorrect username or password." });
    }
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Set JWT_SECRET in your .env file." });
    user.lastLoginAt = new Date();
    await user.save();
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        student: user.student,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (e) { next(e); }
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: {
    id: req.user._id,
    username: req.user.username,
    role: req.user.role,
    student: req.user.student,
    mustChangePassword: req.user.mustChangePassword
  }});
});

router.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (newPassword.length < 10) return res.status(400).json({ message: "New password must be at least 10 characters long." });
    const user = await User.findById(req.user._id);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: "Password updated successfully. Please sign in again." });
  } catch (e) { next(e); }
});


// Password recovery requires matching school student identity AND the email already linked to the account.
// Student ID/name alone must never reset a password because those details may be public.
router.post("/forgot-password", async (req, res, next) => {
  try {
    const studentId = String(req.body.studentId || "").trim();
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!studentId || !name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter your student ID, full name, and the email linked to your account." });
    }
    const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
    if (!smtpReady) return res.status(503).json({ message: "Password reset email is not configured. Please contact your system administrator." });

    const student = await Student.findOne({ studentId, status: "active" });
    const nameMatches = student && student.name.trim().toLowerCase() === name.toLowerCase();
    const user = nameMatches ? await User.findOne({ student: student._id, email, active: true }) : null;
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const resetUrl = `${frontendUrl}/?resetToken=${rawToken}`;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: "Reset your ClassFunds password",
          text: `We received a request to reset your ClassFunds password. This link expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#252a40"><h2>Reset your ClassFunds password</h2><p>This one-time link expires in <strong>30 minutes</strong>.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#665ce7;color:white;text-decoration:none;border-radius:8px">Reset password</a></p><p>If you did not request this, ignore this email.</p></div>`
        });
      } catch (mailError) {
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        await user.save();
        console.error("Password reset email failed:", mailError.message);
        return res.status(503).json({ message: "We could not send the reset email right now. Please contact your system administrator." });
      }
    }
    return res.json({ message: "If the student details match an active account and linked email, a reset link has been sent. Check your inbox and spam folder." });
  } catch (e) { next(e); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    if (!token || token.length > 256) return res.status(400).json({ message: "This reset link is invalid or expired. Request a new one." });
    const defaultPassword = String(process.env.DEFAULT_RESET_PASSWORD || "");
    if (defaultPassword.length < 10) {
      return res.status(503).json({ message: "Default password reset is not configured. Please contact your system administrator." });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() }, active: true });
    if (!user) return res.status(400).json({ message: "This reset link is invalid or expired. Request a new one." });
    user.passwordHash = await bcrypt.hash(defaultPassword, 12);
    user.mustChangePassword = true;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    return res.json({
      message: "Your password has been reset to the system default. Sign in with the temporary password below, then change it immediately.",
      defaultPassword
    });
  } catch (e) { next(e); }
});

module.exports = router;
