const express = require("express");
const router = express.Router();
const db = require("../../config/dummyDb"); // your DB connect module

// Add or update personal note for a booking by order_id
router.post("/", async (req, res) => {
  const { order_id, personal_note } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: "order_id is required." });
  }

  try {
    await db.execute(
      `UPDATE bookings SET personal_note = ? WHERE order_id = ?`,
      [personal_note, order_id]
    );
    res.json({ success: true, message: "Personal note saved successfully." });
  } catch (err) {
    console.error("Error saving personal note:", err);
    res
      .status(500)
      .json({ error: "Could not update booking due to server error." });
  }
});

// get the personal note
router.post("/get", async (req, res) => {
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: "order_id is required." });
  }

  try {
    const [rows] = await db.execute(
      `SELECT personal_note FROM bookings WHERE order_id = ? LIMIT 1`,
      [order_id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Booking not found." });
    }
    res.json({ personal_note: rows[0].personal_note || "" });
  } catch (err) {
    console.error("Error fetching personal note:", err);
    res
      .status(500)
      .json({ error: "Could not fetch personal note due to server error." });
  }
});

module.exports = router;
