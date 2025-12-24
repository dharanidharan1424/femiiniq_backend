const express = require("express");
const router = express.Router();
const pool = require("../../config/dummyDb2.js"); // your MySQL pool connection

// GET check if chat is accepted by agent
router.get("/is-accepted/:agentId/:userId", async (req, res) => {
  const { agentId, userId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT accepted FROM chat_permissions WHERE agent_id = ? AND user_id = ?`,
      [agentId, userId]
    );

    if (rows.length > 0 && rows[0].accepted === 1) {
      return res.json({ accepted: true });
    }
    return res.json({ accepted: false });
  } catch (error) {
    console.error("Error checking accepted status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/respond", async (req, res) => {
  const { agentId, userId, accept } = req.body;

  if (typeof accept !== "boolean" || !agentId || !userId) {
    return res
      .status(400)
      .json({ error: "agentId, userId and accept (boolean) are required" });
  }

  try {
    if (accept) {
      // Accept chat: upsert into chat_permissions with accepted = 1
      await pool.query(
        `INSERT INTO chat_permissions (agent_id, user_id, accepted) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE accepted = 1`,
        [agentId, userId]
      );
      return res.json({ message: "Chat accepted" });
    } else {
      // Reject chat: delete from chat_permissions and insert block in blocked_users
      await pool.query(
        `DELETE FROM chat_permissions WHERE agent_id = ? AND user_id = ?`,
        [agentId, userId]
      );

      await pool.query(
        `INSERT INTO blocked_users (agent_id, user_id, blocked, blocked_at)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE blocked = 1, blocked_at = NOW()`,
        [agentId, userId]
      );

      return res.json({ message: "Chat rejected and user blocked" });
    }
  } catch (error) {
    console.error("Error processing chat response:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
