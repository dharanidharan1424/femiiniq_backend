const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// Existing route for all staffs
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *, 
      COALESCE(NULLIF(agent_id, ''), CONCAT('agent_', id)) AS agent_id,
      COALESCE(NULLIF(full_name, ''), name) AS name,
      COALESCE(NULLIF(address, ''), CONCAT_WS(', ', NULLIF(address_line1, ''), NULLIF(address_line2, ''), NULLIF(city, ''))) AS address
      FROM agents
      WHERE hide_profile = 'no'
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
    let numericId = parseInt(staffId);
    let agentIdStr = staffId;

    if (isNaN(numericId) && typeof staffId === 'string' && staffId.startsWith('agent_')) {
      numericId = parseInt(staffId.replace('agent_', ''));
    }

    // If parsing fails, set numericId to -1 (or some invalid ID) to avoid NaN errors in SQL
    if (isNaN(numericId)) {
      numericId = -1;
    }

    const [rows] = await pool.query(`
      SELECT *, 
      COALESCE(NULLIF(agent_id, ''), CONCAT('agent_', id)) AS agent_id,
      COALESCE(NULLIF(full_name, ''), name) AS name,
      COALESCE(NULLIF(address, ''), CONCAT_WS(', ', NULLIF(address_line1, ''), NULLIF(address_line2, ''), NULLIF(city, ''))) AS address
      FROM agents WHERE (id = ? OR agent_id = ?) AND hide_profile = 'no'`, [
      numericId,
      agentIdStr
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
