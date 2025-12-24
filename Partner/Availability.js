const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

router.patch("/", async (req, res) => {
  const { agent_id } = req.body;

  if (!agent_id) {
    return res.status(400).json({ error: "agent_id is required" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT status FROM agents WHERE agent_id = ?`,
      [agent_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Agent not found" });
    }
    const currentStatus = rows[0].status;
    let newStatus;

    if (currentStatus === "Available") {
      newStatus = "Not Available";
    } else {
      newStatus = "Available";
    }

    // Update to new status
    await db.execute(`UPDATE agents SET status = ? WHERE agent_id = ?`, [
      newStatus,
      agent_id,
    ]);
    res.json({
      success: true,
      message: `Status updated to ${newStatus}`,
      status: newStatus,
    });
  } catch (err) {
    console.error("Error toggling status:", err);
    res.status(500).json({ error: "Could not update status." });
  }
});

module.exports = router;

module.exports = router;
