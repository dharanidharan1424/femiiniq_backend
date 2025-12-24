const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// GET all agents
router.get("/all", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM agents");
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Database query failed" });
  }
});

router.get("/:agent_id", async (req, res) => {
  const { agent_id } = req.params;
  try {
    const [results] = await db.query(
      "SELECT * FROM agents WHERE agent_id = ?",
      [agent_id]
    );
    if (results.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json(results[0]);
  } catch (error) {
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
