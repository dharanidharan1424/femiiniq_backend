const express = require("express");
const router = express.Router();
const pool = require("../../config/db.js");
const jwt = require("jsonwebtoken");

// POST /api/auth/auto-register
router.post("/", async (req, res) => {
    try {
        // Generate random guest details
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 10000);
        const email = `guest_${timestamp}_${randomSuffix}@feminiq.com`;
        // const fullname = `Guest User ${randomSuffix}`;
        const fullname = `Guest User`; // Simplified

        // Insert into users table
        // We only need minimal fields: fullname, email
        const [userResult] = await pool.query(
            "INSERT INTO users (fullname, email, created_at) VALUES (?, ?, NOW())",
            [fullname, email]
        );

        const userId = userResult.insertId;

        // Generate unique ID just in case
        const uniqueId = `FG${String(userId).padStart(10, "0")}`;
        await pool.query("UPDATE users SET unique_id = ? WHERE id = ?", [uniqueId, userId]);

        // Also insert into mobile_user_auth to keep consistency (optional but good for tracking)
        // Password hash dummy since they can't login manually anyway
        await pool.query(
            "INSERT INTO mobile_user_auth (user_id, email, password_hash, status) VALUES (?, ?, ?, ?)",
            [userId, email, "GUEST_NO_PASSWORD", "active"]
        );

        // Generate JWT token
        const payload = { userId, email };
        const token = jwt.sign(payload, process.env.JWT_SECRET || "default_secret", {
            expiresIn: "365d", // Long expiry for guest
        });

        // Valid user object to return
        const user = {
            id: userId,
            unique_id: uniqueId,
            fullname,
            email,
            is_guest: true
        };

        return res.status(201).json({
            status: "success",
            message: "Guest session created",
            token,
            user
        });

    } catch (error) {
        console.error("Auto-register error:", error);
        return res.status(500).json({ status: "error", message: "Server error during auto-registration" });
    }
});

module.exports = router;
