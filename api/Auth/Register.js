const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../../config/db.js");
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
  const { email, password, fullname, name, dob, phone, gender } = req.body;

  if (!email || !password || !fullname) {
    return res.status(400).json({
      status: "error",
      message: "Email, password, and fullname are required",
    });
  }

  try {
    // Check if user exists in users table with a password (registered user)
    const [existingUsers] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND password IS NOT NULL LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "User with this email already exists",
      });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user directly into users table with password
    // Check if guest user exists with this email (no password) to upgrade them?
    // For simplicity, we just insert a new one or update if exists but no password? 
    // Let's keep it simple: strict registration

    // First check if email exists at all (guest or not)
    const [emailCheck] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

    let userId;
    let user;

    if (emailCheck.length > 0) {
      // User exists (likely guest), update password and details
      userId = emailCheck[0].id;
      await pool.query(
        "UPDATE users SET fullname = ?, dob = ?, mobile = ?, gender = ?, name = ?, password = ? WHERE id = ?",
        [fullname, dob || null, phone || null, gender || null, name || null, passwordHash, userId]
      );
    } else {
      // New user
      const [userResult] = await pool.query(
        "INSERT INTO users (fullname, email, dob, mobile, gender, name, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          fullname,
          email,
          dob || null,
          phone || null,
          gender || null,
          name || null,
          passwordHash
        ]
      );
      userId = userResult.insertId;
    }

    // Generate unique ID with 10-digit padding
    const uniqueId = `FC${String(userId).padStart(10, "0")}`;
    await pool.query("UPDATE users SET unique_id = ? WHERE id = ?", [uniqueId, userId]);

    // Cleanup: NO mobile_user_auth insertion

    // Generate JWT token
    const payload = { userId, email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    // Fetch full user details minus password
    const [userRows] = await pool.query(
      "SELECT id, unique_id, fullname, email, dob, mobile, gender, name, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    user = userRows[0]; // Reuse variable

    return res.status(201).json({
      status: "success",
      message: "User created successfully",
      token,
      user, // entire user record here
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});


module.exports = router;
