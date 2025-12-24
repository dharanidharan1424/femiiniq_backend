const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const pool = require("../config/db.js");

router.post("/change-password", async (req, res) => {
  const { current_password, new_password, userId } = req.body;

  console.log("Change password request for userId:", req.body);

  if (!current_password || !new_password) {
    return res.status(400).json({
      status: "error",
      message: "Both current and new password required",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch password hash only from mobile_user_auth table
    const [authRows] = await connection.query(
      "SELECT password_hash FROM mobile_user_auth WHERE user_id = ?",
      [userId]
    );

    if (authRows.length === 0) {
      console.error(
        "No user auth found in mobile_user_auth for user_id:",
        userId
      );
      await connection.rollback();
      connection.release();
      return res
        .status(404)
        .json({ status: "error", message: "User auth not found" });
    }

    const authPasswordHash = authRows[0].password_hash;

    console.log("authPasswordHash:", authPasswordHash);

    if (!authPasswordHash) {
      console.error("Missing password hash detected for userId:", userId);
      await connection.rollback();
      connection.release();
      return res.status(500).json({
        status: "error",
        message: "Password hash not set for user",
      });
    }

    // Validate current password
    const isAuthPassValid = await bcrypt.compare(
      current_password,
      authPasswordHash
    );

    if (!isAuthPassValid) {
      await connection.rollback();
      connection.release();
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    // Hash the new password
    const newHash = await bcrypt.hash(new_password, 10);

    // Update password in both tables
    await connection.query("UPDATE users SET password = ? WHERE id = ?", [
      newHash,
      userId,
    ]);
    await connection.query(
      "UPDATE mobile_user_auth SET password_hash = ? WHERE user_id = ?",
      [newHash, userId]
    );

    await connection.commit();
    connection.release();

    res.json({ status: "success", message: "Password changed successfully" });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Change password error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Password change failed" });
  }
});

module.exports = router;
