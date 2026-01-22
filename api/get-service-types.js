const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

router.get("/", async (req, res) => {
  const { staff_id } = req.query;
  try {
    if (!staff_id) {
      const [rows] = await pool.query(`
        SELECT id, category_id, name, image, image AS mobile_url, staff_id, agent_id, price, duration, description, procedure_desc AS procedure FROM service_type
        UNION ALL
        SELECT id, category_id, name, image, image AS mobile_url, staff_id, NULL AS agent_id, price, duration, description, procedure AS procedure FROM service_types
      `);
      return res.json({ data: rows });
    }

    const numericId = parseInt(staff_id.startsWith("agent_") ? staff_id.replace("agent_", "") : staff_id);
    const params = [];

    // Part 1: service_type (singular) - Has agent_id
    let filter1 = "WHERE (staff_id = ?";
    params.push(numericId || -1); // staff_id as number

    if (!isNaN(numericId)) {
      filter1 += " OR agent_id = ? OR staff_id IN (SELECT id FROM staffs WHERE shop_id = ?)";
      params.push(numericId, numericId);
    }
    filter1 += " OR agent_id = ?)";
    params.push(staff_id); // agent_id as string (e.g. agent_9 or FP...)

    // Part 2: service_types (plural) - NO agent_id
    let filter2 = "WHERE (staff_id = ?";
    params.push(numericId || -1);

    if (!isNaN(numericId)) {
      filter2 += " OR staff_id IN (SELECT id FROM staffs WHERE shop_id = ?)";
      params.push(numericId);
    }
    filter2 += ")";

    const query = `
      SELECT id, category_id, name, image, image AS mobile_url, staff_id, agent_id, price, duration, description, procedure_desc AS procedure 
      FROM service_type 
      ${filter1}
      UNION ALL
      SELECT id, category_id, name, image, image AS mobile_url, staff_id, NULL AS agent_id, price, duration, description, procedure AS procedure 
      FROM service_types 
      ${filter2}
    `;

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error("DB query error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
