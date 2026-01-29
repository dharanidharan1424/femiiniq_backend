const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// POST /service/agent
router.get("/service/:agentId", async (req, res) => {
  const { agentId } = req.params;
  if (!agentId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agentId" });
  }
  try {
    // Fetch from new table 'agent_services'
    // We map 'service_name' to 'name' for frontend compatibility
    const [results] = await db.query(
      "SELECT id, service_name as name, price, duration, description, category_id, image FROM agent_services WHERE agent_id = ?",
      [agentId]
    );

    // Also fetch categories to map category_id to name if needed? 
    // For now, let's just return what we have. Frontend might need category name.

    if (!results || results.length === 0) {
      return res
        .status(200)
        .json({ status: "success", services: [] });
    }
    res.json({ status: "success", services: results });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ status: "error", message: "Database query failed" });
  }
});

// ✅ GET /api/service_package/:agentId → Get all packages by agent
router.get("/package/:agentId", async (req, res) => {
  const { agentId } = req.params;

  if (!agentId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agentId" });
  }

  try {
    const [results] = await db.query(
      "SELECT id, package_name as name, total_price as price, description, image, services FROM agent_packages WHERE agent_id = ?",
      [agentId]
    );

    if (!results || results.length === 0) {
      return res.status(200).json({
        status: "success",
        packages: [],
      });
    }

    // ✅ Send all results
    return res.status(200).json({
      status: "success",
      packages: results,
    });
  } catch (error) {
    console.error("DB Error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Database query failed" });
  }
});

module.exports = router;
