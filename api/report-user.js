const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// POST /api/report
router.post("/", async (req, res) => {
  const { user_id, user_name, report_type, subject, message, order_ref } =
    req.body;

  console.log(req.body);

  if (!user_id || !report_type || !subject || !message) {
    return res.status(400).json({ error: "Required fields missing." });
  }

  try {
    // Generate manual ID (random 9-digit number)
    const reportId = Math.floor(100000000 + Math.random() * 900000000);

    const [result] = await pool.query(
      `INSERT INTO user_reports (
        id, user_id, user_name, report_type, subject, message, order_ref, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        user_id,
        user_name || "",
        report_type,
        subject,
        message,
        order_ref || "",
        "Open",
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit report." });
  }
});

module.exports = router;
