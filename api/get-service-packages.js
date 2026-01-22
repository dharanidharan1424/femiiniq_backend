const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// Route to get all packages or filter by staff_id
router.get("/", async (req, res) => {
  const { staff_id } = req.query;
  try {
    let query = "SELECT *, image AS mobile_url, process_desc AS process, agent_name FROM service_package";
    const params = [];

    if (staff_id) {
      query += " WHERE staff_id = ? OR agent_id = ?";
      params.push(staff_id, staff_id);
    }

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

// Existing route (kept for compatibility in case used elsewhere, though name suggests get by ID, logic was filtering by category_id?)
// The previous code was: SELECT * FROM service_packages WHERE category_id = ?
// The param name was :id. This is ambiguous. I will preserve it but check table.
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT *, image AS mobile_url, process_desc AS process FROM service_package WHERE category_id = ?",
      [req.params.id]
    );
    if (rows.length === 0) {
      // return res.status(404).json({ error: "Service package not found" });
      return res.json({ data: [] });
    }
    res.json({ data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});
module.exports = router;
