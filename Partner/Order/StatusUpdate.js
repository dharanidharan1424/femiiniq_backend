const express = require("express");
const router = express.Router();
const db = require("../../config/db.js");

// PATCH /partner/order/status
router.patch("/status", async (req, res) => {
  const { order_id, agent_id, new_status, reject_reason } = req.body;

  console.log(`[StatusUpdate] Received update request for Order ID: ${order_id}, Agent ID: ${agent_id}, New Status: ${new_status}`);

  if (
    !order_id ||
    !new_status ||
    !["confirmed", "rejected"].includes(new_status)
  ) {
    return res.status(400).json({
      error:
        "order_id and valid new_status ('confirmed' or 'rejected') are required.",
    });
  }

  try {
    let query;
    let params;

    // In User App, 'status' column is used for tab filtering (Upcoming, Completed, Cancelled)
    // 'booking_status' is used for internal workflow state (pending, confirmed, rejected, etc.)
    const userStatus = new_status === "rejected" ? "Rejected" : "Upcoming";

    if (new_status === "rejected" && reject_reason) {
      const fullRejectReason = reject_reason?.trim()
        ? reject_reason.trim() + " by agent"
        : "Rejected by agent";

      query = `UPDATE bookings SET booking_status = ?, status = ?, cancel_reason = ? WHERE order_id = ?${agent_id ? " AND agent_id = ?" : ""} AND (booking_status = 'pending' OR booking_status = 'confirmed')`;
      params = agent_id
        ? [new_status, userStatus, fullRejectReason, order_id, agent_id]
        : [new_status, userStatus, fullRejectReason, order_id];
    } else {
      const startOtp = new_status === "confirmed" ? Math.floor(1000 + Math.random() * 9000).toString() : null;

      query = `UPDATE bookings SET booking_status = ?, status = ?${new_status === 'confirmed' ? ", start_otp = ?" : ""} WHERE order_id = ?${agent_id ? " AND agent_id = ?" : ""} AND booking_status = 'pending'`;

      if (new_status === 'confirmed') {
        params = agent_id ? [new_status, userStatus, startOtp, order_id, agent_id] : [new_status, userStatus, startOtp, order_id];
      } else {
        params = agent_id ? [new_status, userStatus, order_id, agent_id] : [new_status, userStatus, order_id];
      }
    }

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      console.warn(`[StatusUpdate] No booking updated for Order ID: ${order_id}. It might already be processed or the IDs don't match.`);
      return res.status(404).json({
        success: false,
        error: "Booking not found or already processed.",
      });
    }

    console.log(`[StatusUpdate] Successfully updated Order ID: ${order_id} to ${new_status}`);
    res.json({
      success: true,
      message: `Booking status changed to ${new_status}.`,
    });
  } catch (error) {
    console.error("Booking status update error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during booking status update." });
  }
});

module.exports = router;
