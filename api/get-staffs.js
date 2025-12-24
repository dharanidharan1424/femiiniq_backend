const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// Existing route for all staffs
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM staffs");
    res.status(200).json({ status: "success", data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ status: "error", error: "Database query failed" });
  }
});

// New route to get staff by ID
router.get("/:id", async (req, res) => {
  const staffId = req.params.id;
  try {
    const [rows] = await pool.query("SELECT * FROM staffs WHERE id = ?", [
      staffId,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", error: "Staff not found" });
    }
    res.status(200).json({ status: "success", data: rows[0] });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ status: "error", error: "Database query failed" });
  }
});

module.exports = router;
