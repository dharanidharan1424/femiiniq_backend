const express = require("express");
const router = express.Router();
const db = require("../../config/dummyDb.js");

// Body: { booking_id: number, decision: 'accept' | 'reject' }
router.patch("/", async (req, res) => {
  const { order_id, decision } = req.body;
  if (!order_id || !["accept", "reject"].includes(decision)) {
    return res
      .status(400)
      .json({ error: "order_id and valid decision required." });
  }

  try {
    if (decision === "accept") {
      // Update booking_date/time to reschedule_date/time and set status to accepted
      await db.execute(
        `UPDATE bookings
         SET booking_date = reschedule_date,
             booking_time = DATE_FORMAT(reschedule_date, '%H:%i:%s'),
             reschedule_status = 'accepted'
         WHERE order_id = ?`,
        [order_id]
      );
      return res.json({
        success: true,
        message: "Reschedule accepted and booking date/time updated.",
      });
    } else {
      // Only update reschedule_status to rejected
      await db.execute(
        `UPDATE bookings SET reschedule_status = 'rejected' WHERE order_id = ?`,
        [order_id]
      );
      return res.json({
        success: true,
        message: "Reschedule rejected, booking date/time unchanged.",
      });
    }
  } catch (err) {
    console.error("Reschedule update error:", err);
    res
      .status(500)
      .json({ error: "Internal server error while updating booking." });
  }
});

module.exports = router;
