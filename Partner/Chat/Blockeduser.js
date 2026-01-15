const express = require("express");
const router = express.Router();
const pool = require("../../config/db.js"); // your MySQL pool connection

// GET check if user is blocked by agent
router.get("/is-blocked/:agentId/:userId", async (req, res) => {
  const { agentId, userId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT blocked FROM blocked_users WHERE agent_id = ? AND user_id = ?`,
      [agentId, userId]
    );

    if (rows.length > 0 && rows[0].blocked === 1) {
      return res.json({ blocked: true });
    }
    return res.json({ blocked: false });
  } catch (error) {
    console.error("Error checking blocked status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Block a user
router.post("/block", async (req, res) => {
  const { agentId, userId } = req.body;

  if (!agentId || !userId) {
    return res.status(400).json({ error: "agentId and userId are required" });
  }

  try {
    await pool.query(
      `INSERT INTO blocked_users (agent_id, user_id, blocked, blocked_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE blocked = 1, blocked_at = NOW()`,
      [agentId, userId]
    );

    // Optionally remove from chat_permissions to revoke acceptance on block
    await pool.query(
      `DELETE FROM chat_permissions WHERE agent_id = ? AND user_id = ?`,
      [agentId, userId]
    );

    res.json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Unblock a user
router.post("/unblock", async (req, res) => {
  const { agentId, userId } = req.body;

  if (!agentId || !userId) {
    return res.status(400).json({ error: "agentId and userId are required" });
  }

  try {
    // Unblock the user
    await pool.query(
      `UPDATE blocked_users SET blocked = 0 WHERE agent_id = ? AND user_id = ?`,
      [agentId, userId]
    );

    // Mark chat as accepted in chat_permissions (upsert)
    await pool.query(
      `INSERT INTO chat_permissions (agent_id, user_id, accepted, created_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE accepted = 1`,
      [agentId, userId]
    );

    res.json({ message: "User unblocked and chat accepted successfully" });
  } catch (error) {
    console.error(
      "Error unblocking user and updating chat_permissions:",
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/blocked-users/:agentId", async (req, res) => {
  const { agentId } = req.params;

  if (!agentId) {
    return res.status(400).json({ error: "agentId is required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id FROM blocked_users WHERE agent_id = ? AND blocked = 1`,
      [agentId]
    );

    res.json(rows); // return array of blocked user objects with user_id
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
