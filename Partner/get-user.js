const express = require("express");
const router = express.Router();
const pool = require("../config/dummyDb.js");

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId <= 0) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid or missing user ID" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id ,image, fullname AS fullName, email, mobile,dob ,gender , country FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    return res.json({ status: "success", profile: rows[0] });
  } catch (error) {
    console.error("DB query error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Database query failed" });
  }
});

module.exports = router;
