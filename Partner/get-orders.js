const express = require("express");
const router = express.Router();
const db = require("../config/db.js");

router.post("/", async (req, res) => {
  const { agent_id } = req.body;
  if (!agent_id) {
    return res.status(400).json({ error: "agent_id is required" });
  }
  try {
    const [rows] = await db.execute(
      `SELECT * FROM bookings WHERE agent_id = ? ORDER BY booking_date DESC, booking_time DESC`,
      [agent_id]
    );
    if (!rows || rows.length === 0) {
      return res.json({
        bookings: [],
        message: "No bookings found for this agent.",
      });
    }
    res.json({ bookings: rows });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res
      .status(500)
      .json({ error: "Could not fetch booking details due to server error." });
  }
});

router.post("/single", async (req, res) => {
  const { order_id, agent_id } = req.body;
  if (!order_id || !agent_id) {
    return res
      .status(400)
      .json({ error: "order_id and agent_id are required" });
  }
  try {
    const [rows] = await db.execute(
      `SELECT * FROM bookings WHERE order_id = ? AND agent_id = ? LIMIT 1`,
      [order_id, agent_id]
    );
    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Booking not found for given order_id and agent_id" });
    }
    res.json({ booking: rows[0] });
  } catch (err) {
    console.error("Error fetching booking:", err);
    res
      .status(500)
      .json({ error: "Could not fetch booking due to server error." });
  }
});

// For history
router.post("/history", async (req, res) => {
  const { agent_id, user_id } = req.body;

  if (!agent_id || !user_id) {
    return res.status(400).json({ error: "agent_id and user_id are required" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT * FROM bookings WHERE agent_id = ? AND user_id = ? ORDER BY booking_date DESC, booking_time DESC`,
      [agent_id, user_id]
    );

    if (!rows || rows.length === 0) {
      return res.json({
        bookings: [],
        message: "No bookings found for this agent and user.",
      });
    }
    res.json({ bookings: rows });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res
      .status(500)
      .json({ error: "Could not fetch booking details due to server error." });
  }
});
module.exports = router;
