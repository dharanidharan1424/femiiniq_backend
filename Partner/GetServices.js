const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// POST /service/agent
// GET /service/:agentId → Get all services by agent (Using agent_services)
router.get("/service/:agentId", async (req, res) => {
  const { agentId } = req.params;
  if (!agentId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agentId" });
  }
  try {
    const [results] = await db.query(
      "SELECT * FROM agent_services WHERE agent_id = ?",
      [agentId]
    );
    res.json({ status: "success", services: results || [] });
  } catch (error) {
    console.error("DB error fetching services:", error);
    res.status(500).json({ status: "error", message: "Database query failed" });
  }
});

// ✅ GET /package/:agentId → Get all packages by agent (Using agent_packages)
router.get("/package/:agentId", async (req, res) => {
  const { agentId } = req.params;

  if (!agentId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agentId" });
  }

  try {
    const [results] = await db.query(
      "SELECT * FROM agent_packages WHERE agent_id = ?",
      [agentId]
    );

    return res.status(200).json({
      status: "success",
      packages: results || [],
    });
  } catch (error) {
    console.error("DB Error fetching packages:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Database query failed" });
  }
});

module.exports = router;
