const express = require("express");
const router = express.Router();
const db = require("../../config/dummyDb.js");

// PATCH /status/change
router.patch("/status", async (req, res) => {
  const { order_id, agent_id, new_status, reject_reason } = req.body;

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
    if (new_status === "rejected" && reject_reason) {
      // Update status to rejected and set reject reason
      const fullRejectReason = reject_reason?.trim()
        ? reject_reason.trim() + " by agent"
        : "Rejected by agent";

      const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
      await db.execute(
        `UPDATE bookings SET booking_status = ?, cancel_reason = ?, start_otp = ? WHERE order_id = ?${agent_id ? " AND agent_id = ?" : ""
        } AND booking_status = "pending"`,
        agent_id
          ? [new_status, fullRejectReason, startOtp, order_id, agent_id]
          : [new_status, fullRejectReason, startOtp, order_id]
      );
    } else {
      // Update status to confirmed or rejected without reason
      const startOtp = new_status === "confirmed" ? Math.floor(1000 + Math.random() * 9000).toString() : null;
      await db.execute(
        `UPDATE bookings SET booking_status = ?, start_otp = ? WHERE order_id = ?${agent_id ? " AND agent_id = ?" : ""
        } AND booking_status = "pending"`,
        agent_id ? [new_status, startOtp, order_id, agent_id] : [new_status, startOtp, order_id]
      );
    }

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
