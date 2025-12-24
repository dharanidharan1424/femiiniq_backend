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

      await db.execute(
        `UPDATE bookings SET booking_status = ?, cancel_reason = ? WHERE order_id = ?${
          agent_id ? " AND agent_id = ?" : ""
        } AND booking_status = "pending"`,
        agent_id
          ? [new_status, fullRejectReason, order_id, agent_id]
          : [new_status, fullRejectReason, order_id]
      );
    } else {
      // Update status to confirmed or rejected without reason
      await db.execute(
        `UPDATE bookings SET booking_status = ? WHERE order_id = ?${
          agent_id ? " AND agent_id = ?" : ""
        } AND booking_status = "pending"`,
        agent_id ? [new_status, order_id, agent_id] : [new_status, order_id]
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
