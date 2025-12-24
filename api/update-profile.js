const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const authenticateToken = require("../middleware/authToken");

router.post("/", authenticateToken, async (req, res) => {
  const data = req.body;
  const userId = req.user.userId; // from JWT payload

  if (!userId || userId <= 0) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid user_id" });
  }

  const allowedFields = [
    "image",
    "fullname",
    "name",
    "dob",
    "email",
    "mobile",
    "gender",
    "address",
    "altaddress",
    "country",
  ];

  const fields = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined && data[field] !== null) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ status: "error", message: "No valid fields provided to update" });
  }

  values.push(userId);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update users table
    const updateSql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    const [updateResult] = await connection.query(updateSql, values);

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    // If email updated, also update mobile_user_auth table
    if (data.email) {
      const updateAuthSql = `UPDATE mobile_user_auth SET email = ? WHERE user_id = ?`;
      await connection.query(updateAuthSql, [data.email, userId]);
    }

    await connection.commit();

    // Fetch updated profile from DB
    const [rows] = await connection.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    connection.release();

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found after update" });
    }

    res.json({
      status: "success",
      message: "Profile updated",
      profile: rows[0],
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Profile update error:", error);
    res.status(500).json({ status: "error", message: "Profile update failed" });
  }
});

module.exports = router;
