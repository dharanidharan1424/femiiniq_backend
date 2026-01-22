const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

router.get("/", async (req, res) => {
  const { staff_id } = req.query;
  try {
    let query = "SELECT *, image AS mobile_url, procedure_desc AS procedure FROM service_type";
    const params = [];

    if (staff_id) {
      let numericId = parseInt(staff_id);
      let agentIdStr = staff_id;

      // Handle agent_ prefix if present
      if (isNaN(numericId) && typeof staff_id === 'string' && staff_id.startsWith('agent_')) {
        numericId = parseInt(staff_id.replace('agent_', ''));
      }

      if (!isNaN(numericId)) {
        // Broad search for any variation of the ID
        query += ` WHERE (staff_id = ? 
                   OR agent_id = ? 
                   OR agent_id = ?
                   OR staff_id IN (SELECT id FROM staffs WHERE shop_id = ?))`;
        params.push(numericId, numericId, agentIdStr, numericId);
      } else {
        // Fallback for non-numeric/non-agent_prefix strings
        query += " WHERE agent_id = ?";
        params.push(staff_id);
      }
    }

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
