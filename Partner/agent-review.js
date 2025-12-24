const express = require("express");
const router = express.Router();
const pool = require("../config/dummyDb.js");

// Get reviews for agent (or optionally user)
router.get("/review/:agentId", async (req, res) => {
  const { agentId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, agent_id, agent_name, staff_name, service_name, rating, review, artist_reply, created_at
       FROM reviews WHERE agent_id = ? ORDER BY created_at DESC`,
      [agentId]
    );
    res.json({ status: "success", reviews: rows });
  } catch (error) {
    console.error("Error loading reviews:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to load reviews" });
  }
});

// Add or update reply for a review (agent side)
router.post("/reply/:reviewId", async (req, res) => {
  const { reviewId } = req.params;
  const { reply } = req.body;
  if (!reply || !reviewId) {
    return res
      .status(400)
      .json({ status: "error", message: "Reply and reviewId required" });
  }
  try {
    await pool.query("UPDATE reviews SET artist_reply = ? WHERE id = ?", [
      reply,
      reviewId,
    ]);
    res.json({ status: "success", message: "Reply updated" });
  } catch (error) {
    console.error("Error updating reply:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to update reply" });
  }
});

// Delete reply for a review (agent side)
router.post("/delete-reply/:reviewId", async (req, res) => {
  const { reviewId } = req.params;
  if (!reviewId) {
    return res
      .status(400)
      .json({ status: "error", message: "Review ID required" });
  }
  try {
    await pool.query("UPDATE reviews SET artist_reply = NULL WHERE id = ?", [
      reviewId,
    ]);
    res.json({ status: "success", message: "Reply deleted" });
  } catch (error) {
    console.error("Error deleting reply:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete reply" });
  }
});

module.exports = router;
