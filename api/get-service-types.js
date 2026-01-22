const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

router.get("/", async (req, res) => {
  const { staff_id } = req.query;
  try {
    const params = [];
    let filterPart = "";

    if (staff_id) {
      let numericId = parseInt(staff_id);
      let agentIdStr = staff_id;

      if (isNaN(numericId) && typeof staff_id === "string" && staff_id.startsWith("agent_")) {
        numericId = parseInt(staff_id.replace("agent_", ""));
      }

      if (!isNaN(numericId)) {
        filterPart = `WHERE (staff_id = ? 
                       OR agent_id = ? 
                       OR agent_id = ?
                       OR staff_id IN (SELECT id FROM staffs WHERE shop_id = ?))`;
        params.push(numericId, numericId, agentIdStr, numericId);
      } else {
        filterPart = "WHERE agent_id = ?";
        params.push(staff_id);
      }
    }

    // Query both singular and plural tables to be safe, as both exist with data
    const query = `
      SELECT *, image AS mobile_url, procedure_desc AS procedure FROM service_type ${filterPart}
      UNION
      SELECT *, image AS mobile_url, NULL AS procedure FROM service_types ${filterPart}
    `;

    // Double the params since we use filterPart twice in UNION
    const finalParams = [...params, ...params];

    const [rows] = await pool.query(query, finalParams);
    res.json({ data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
