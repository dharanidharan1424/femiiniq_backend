const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

router.get("/", async (req, res) => {
  const { staff_id } = req.query;
  try {
    let query = `
      SELECT id, category_id, service_name, service_name as name, price, duration, description, image, image as mobile_url 
      FROM agent_services
    `;
    const params = [];

    if (staff_id) {
      // Handle "agent_" prefix if present, though staff_id in DB is usually the string ID now (e.g. FP000012)
      // If the frontend sends numeric ID, we might need to handle it, but agent_services uses agent_id string.
      // Based on DB image, agent_id is "FP000012".
      // We will assume staff_id passed here corresponds to agent_id.

      const agentId = staff_id.toString();
      query += " WHERE agent_id = ?";
      params.push(agentId);
    }

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
