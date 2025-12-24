// bookingController.js
const express = require("express");
const router = express.Router();
const pool = require("../../config/dummyDb2.js"); // replace with your pool connection module

// POST /api/booking
router.post("/booking", async (req, res) => {
  try {
    const {
      order_id,
      payment_id,
      user_id,
      agent_id,
      agent_name,
      booking_date,
      booking_time,
      staffname,
      address,
      location,
      services,
      category_id,
      service_id,
      image,
      status,
      paid_at,
      note,
      cancel_reason,
      reschedule_date,
      reschedule_reason,
      reschedule_status,
      discountprice,
      platformfee,
      totalprice,
      payment_method,
      amount,
      personal_note,
      booking_status,
    } = req.body;

    // Insert booking data (matching columns structure)
    await pool.query(
      `INSERT INTO bookings 
        (order_id, payment_id, user_id, agent_id, agent_name, booking_date, booking_time, staffname, address, location, services, category_id, service_id, image, status, paid_at, note, cancel_reason, reschedule_date, reschedule_reason, reschedule_status, discountprice, platformfee, totalprice, payment_method, amount, personal_note, booking_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        payment_id,
        user_id,
        agent_id,
        agent_name,
        booking_date,
        booking_time,
        staffname,
        address,
        location,
        JSON.stringify(services),
        category_id,
        service_id,
        image,
        status,
        paid_at,
        note,
        cancel_reason,
        reschedule_date,
        reschedule_reason,
        reschedule_status,
        discountprice,
        platformfee,
        totalprice,
        payment_method,
        amount,
        personal_note,
        booking_status,
      ]
    );

    res.json({ success: true, message: "Booking added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;
