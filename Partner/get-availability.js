const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb");

// Add availability
router.post("/add", async (req, res) => {
  const { agent_id, agent_name, date, day, month, time } = req.body;
  if (!agent_id || !agent_name || !date || !day || !month || !time) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    const [result] = await db.execute(
      `INSERT INTO availability (agent_id, agent_name, date, day, month, time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [agent_id, agent_name, date, day, month, time]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Error adding availability:", err);
    res.status(500).json({ error: "Server error adding availability." });
  }
});

// Fetch availability for agent
router.get("/agent/:agent_id", async (req, res) => {
  const agent_id = req.params.agent_id;
  if (!agent_id) {
    return res.status(400).json({ error: "agent_id is required." });
  }
  try {
    const [rows] = await db.execute(
      `SELECT * FROM availability
       WHERE agent_id = ? AND date >= CURDATE()
       ORDER BY date ASC, time ASC`,
      [agent_id]
    );
    res.json({ availability: rows });
  } catch (err) {
    console.error("Error fetching availability:", err);
    res.status(500).json({ error: "Server error fetching availability." });
  }
});

module.exports = router;
