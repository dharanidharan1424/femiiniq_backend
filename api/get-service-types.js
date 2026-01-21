const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

router.get("/", async (req, res) => {
  const { staff_id } = req.query;
  try {
    let query = "SELECT * FROM service_type";
    const params = [];

    if (staff_id) {
      // Allow fetching by staff_id OR agent_id string OR agent_id resolved from agents table PK
      query += ` WHERE staff_id = ? 
                 OR agent_id = ? 
                 OR agent_id = (SELECT agent_id FROM agents WHERE id = ?)`;
      params.push(staff_id, staff_id, staff_id);
    }

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
