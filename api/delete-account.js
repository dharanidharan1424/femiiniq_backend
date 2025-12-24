const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/authToken");

router.delete("/", authenticateToken, async (req, res) => {
  console.log("Request Called");
  const userId = req.user.userId; // From JWT middleware
  const { fullname, mobile, address, reason, extrareason, unique_id } =
    req.body; // Sent from frontend

  try {
    // 1. Check for 'upcoming' bookings
    const [bookings] = await pool.query(
      "SELECT id FROM demobookings WHERE user_id=? AND status='upcoming'",
      [userId]
    );
    if (bookings.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Cannot delete account. You have upcoming bookings.",
      });
    }

    // 2. Log deletion using values sent in body
    await pool.query(
      `INSERT INTO accountdeletions (fullname, mobile, address, reason, extrareason, unique_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullname, mobile, address, reason, extrareason, unique_id]
    );

    // 3. Delete user auth and user row
    await pool.query("DELETE FROM mobile_user_auth WHERE user_id = ?", [
      userId,
    ]);
    await pool.query("DELETE FROM users WHERE id = ?", [userId]);

    return res.json({
      status: "success",
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to delete account. Please try again.",
    });
  }
});

module.exports = router;
