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
    // 1. Check for ANY active bookings (not completed/cancelled)
    const [activeBookings] = await pool.query(
      `SELECT id, status, booking_date, remaining_amount, order_id
       FROM bookings 
       WHERE user_id = ? 
       AND status NOT IN ('Completed', 'completed', 'Cancelled', 'cancelled', 'Rejected', 'rejected')
       ORDER BY booking_date DESC`,
      [userId]
    );

    if (activeBookings.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Cannot delete account. You have active bookings. Please complete or cancel them first.",
        active_bookings_count: activeBookings.length,
        booking_ids: activeBookings.map(b => b.order_id || b.id)
      });
    }

    // 2. Check for pending payments on ANY booking
    const [pendingPayments] = await pool.query(
      `SELECT id, order_id, remaining_amount 
       FROM bookings 
       WHERE user_id = ? 
       AND remaining_amount > 0
       AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')`,
      [userId]
    );

    if (pendingPayments.length > 0) {
      const totalPending = pendingPayments.reduce((sum, b) => sum + parseFloat(b.remaining_amount || 0), 0);
      return res.status(409).json({
        status: "error",
        message: "Cannot delete account. You have pending payments. Please clear all dues first.",
        pending_bookings_count: pendingPayments.length,
        total_pending_amount: totalPending.toFixed(2)
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
