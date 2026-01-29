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
    // This assumes you are using a promise-enabled mysql2 connection
    const [results] = await db.query(
      "SELECT * FROM service_type WHERE agent_id = ?",
      [agentId]
    );
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
    // ✅ Fetch all service packages for the given agent
    const [results] = await db.query(
      "SELECT * FROM service_package WHERE agent_id = ?",
      [agentId]
    );

    if (!results || results.length === 0) {
      return res.status(200).json({
        status: "success",
        packages: [],
      });
    }

    // ✅ Send all results, not just the first one
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
