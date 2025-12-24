const express = require("express");
const router = express.Router();
const db = require("../../config/dummyDb.js");

router.patch("/", async (req, res) => {
  const { agent_id, hide_profile } = req.body; // agent_id identifies the agent, hide_profile is the new value

  // Validate presence of required fields
  if (typeof agent_id === "undefined" || typeof hide_profile === "undefined") {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  // Execute update query
  try {
    const [result] = await db.execute(
      "UPDATE agents SET hide_profile = ? WHERE id = ?",
      [hide_profile, agent_id]
    );
    if (result.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: "Agent not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
