// routes/partner/gallery.js
const express = require("express");
const router = express.Router();
const pool = require("../config/dummyDb.js");

router.post("/upload", async (req, res) => {
  const { agent_id, agent_name, image } = req.body;
  if (!agent_id || !agent_name || !image) {
    return res.status(400).json({ status: "error", message: "Missing data" });
  }
  try {
    await pool.query(
      "INSERT INTO agent_images (agent_id, agent_name, image, uploaded_at) VALUES (?, ?, ?, NOW())",
      [agent_id, agent_name, image]
    );
    return res.json({ status: "success", message: "Image stored" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "DB insert failed" });
  }
});

router.get("/list/:agentId", async (req, res) => {
  const { agentId } = req.params;
  if (!agentId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agent ID" });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, agent_id, agent_name, image, uploaded_at FROM agent_images WHERE agent_id = ? ORDER BY uploaded_at DESC",
      [agentId]
    );
    return res.json({ status: "success", gallery: rows });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "DB query failed" });
  }
});

module.exports = router;
