const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// Existing route for all staffs
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *, 
      COALESCE(NULLIF(agent_id, ''), CONCAT('agent_', id)) AS agent_id,
      COALESCE(NULLIF(studio_name, ''), NULLIF(full_name, ''), NULLIF(fullname, ''), name) AS name,
      COALESCE(NULLIF(address, ''), CONCAT_WS(', ', NULLIF(address_line1, ''), NULLIF(area, ''), NULLIF(city, ''))) AS address
      FROM agents
    `);
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
    const [rows] = await pool.query(`
      SELECT *, 
      COALESCE(NULLIF(agent_id, ''), CONCAT('agent_', id)) AS agent_id,
      COALESCE(NULLIF(studio_name, ''), NULLIF(full_name, ''), NULLIF(fullname, ''), name) AS name,
      COALESCE(NULLIF(address, ''), CONCAT_WS(', ', NULLIF(address_line1, ''), NULLIF(area, ''), NULLIF(city, ''))) AS address
      FROM agents WHERE id = ? OR agent_id = ?`, [
      staffId,
      staffId
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
