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
    const [existingUsers] = await pool.query(
      "SELECT * FROM mobile_user_auth WHERE email = ? LIMIT 1",
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

    // Insert user with minimal fields
    const [userResult] = await pool.query(
      "INSERT INTO users (fullname, email, dob, mobile, gender, name) VALUES (?, ?, ?, ?, ?, ?)",
      [
        fullname,
        email,
        dob || null,
        phone || null,
        gender || null,
        name || null,
      ]
    );
    const userId = userResult.insertId;

    // Generate unique ID
    const uniqueId = `FC${String(userId).padStart(4, "0")}`;

    // Update user with unique_id and password hash
    await pool.query(
      "UPDATE users SET unique_id = ?, password = ? WHERE id = ?",
      [uniqueId, passwordHash, userId]
    );

    // Insert into auth table
    await pool.query(
      "INSERT INTO mobile_user_auth (user_id, email, password_hash, status) VALUES (?, ?, ?, ?)",
      [userId, email, passwordHash, "active"]
    );

    // Generate JWT token
    const payload = { userId, email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    // Fetch full user details minus password
    const [users] = await pool.query(
      "SELECT id, unique_id, fullname, email, dob, mobile, gender, name, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const user = users[0];

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
