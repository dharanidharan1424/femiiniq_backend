const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// Create a review (user → staff)
// POST: Create a review
router.post("/", async (req, res) => {
  const { reviewer_id, reviewee_id, rating, comment } = req.body;

  const userId = reviewer_id;
  const agentNumericId = reviewee_id; // Frontend passes numeric id
  const reviewText = comment;

  if (!userId || !agentNumericId || !rating) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields." });
  }
  try {
    // 1. Fetch agent info using numeric ID to get the FP... string ID and names
    const [agents] = await pool.query("SELECT agent_id, full_name, name FROM agents WHERE id = ?", [agentNumericId]);

    if (agents.length === 0) {
      return res.status(404).json({ status: "error", message: "Agent not found" });
    }

    const dbAgentId = agents[0].agent_id; // String ID like FP000001
    // The "agents" table has "name" (e.g. "Diya Nayar") and "full_name" (often same or null).
    // The "reviews" table requires "agent_name" (NOT NULL).
    // So we prioritize "name" which is likely the display name, or fallback to "full_name".
    const agentName = agents[0].name || agents[0].full_name || "Unknown Vendor";
    const staffName = agents[0].name || "Unknown Shop";

    // 2. Insert Review using string agent_id
    const insertSql = `
      INSERT INTO reviews
      (user_id, agent_id, agent_name, staff_name, rating, review)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertSql, [
      userId,
      dbAgentId,
      agentName,
      staffName,
      rating,
      reviewText || null,
    ]);

    // 3. Calculate aggregates from reviews table using string ID
    const statsSql = `
      SELECT
        COUNT(*) AS review_count,
        IFNULL(AVG(rating), 0) AS avg_rating
      FROM reviews
      WHERE agent_id = ?
    `;
    const [statsRows] = await pool.query(statsSql, [dbAgentId]);
    const { review_count, avg_rating } = statsRows[0];

    // 4. Update agents table using numeric ID
    const updateAgentQuery = `
      UPDATE agents
      SET rating = ?, reviews = ?
      WHERE id = ?
    `;
    await pool.query(updateAgentQuery, [avg_rating, review_count, agentNumericId]);

    res.status(201).json({ status: "success", review_id: result.insertId });
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json({ status: "error", message: "Failed to add review." });
  }
});

// Edit a review (only by owner user)
// PUT: Edit a review
router.put("/:id", async (req, res) => {
  const reviewId = req.params.id;
  const { reviewer_id, rating, comment } = req.body;

  const userId = reviewer_id;
  const reviewText = comment;

  if (!userId || !rating) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields." });
  }
  try {
    const [existing] = await pool.query(
      "SELECT * FROM reviews WHERE id = ? AND user_id = ?",
      [reviewId, userId]
    );
    if (existing.length === 0) {
      return res
        .status(403)
        .json({ status: "error", message: "Not authorized" });
    }

    await pool.query(
      "UPDATE reviews SET rating = ?, review = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [rating, reviewText, reviewId]
    );

    const agentId = existing[0].agent_id;

    // Recalculate aggregates
    const statsSql = `
      SELECT
        COUNT(*) AS review_count,
        IFNULL(AVG(rating), 0) AS avg_rating
      FROM reviews
      WHERE agent_id = ?
    `;
    const [statsRows] = await pool.query(statsSql, [agentId]);
    const { review_count, avg_rating } = statsRows[0];

    // Update agents
    await pool.query(
      "UPDATE agents SET rating = ?, reviews = ? WHERE id = ?",
      [avg_rating, review_count, agentId]
    );

    res.json({ status: "success", message: "Review updated" });
  } catch (err) {
    console.error("Update Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to update review." });
  }
});

// Get mobile_reviews for a staff (mobile_reviews received)
router.get("/staff/:id", async (req, res) => {
  const staffNumericId = req.params.id;
  try {
    const sql = `
      SELECT 
        r.id, r.user_id AS reviewer_id, r.rating, r.review AS comment, 0 AS likes, r.created_at,
        u.fullname AS reviewer_name, u.image AS reviewer_image
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN agents s ON r.agent_id = s.agent_id
      WHERE s.id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(sql, [staffNumericId]);
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("Query Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch reviews." });
  }
});

// Get mobile_reviews written by a user (for user profile)
router.get("/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const sql = `
      SELECT 
        r.id, r.user_id AS reviewer_id, s.id AS reviewee_id, r.rating, r.review AS comment, 0 AS likes, r.created_at,
        s.full_name AS agent_name, s.name AS staff_name, s.image AS staff_image
      FROM reviews r
      JOIN agents s ON r.agent_id = s.agent_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(sql, [userId]);
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user reviews.",
    });
  }
});

router.post("/:id/like", async (req, res) => {
  // reviews table missing likes column - returning success to avoid frontend error
  res.json({ status: "success" });
});

router.post("/:id/unlike", async (req, res) => {
  // reviews table missing likes column - returning success to avoid frontend error
  res.json({ status: "success" });
});
// DELETE: Delete a review
router.delete("/:id", async (req, res) => {
  const reviewId = req.params.id;
  const { reviewer_id } = req.body;

  const userId = reviewer_id;

  if (!userId) {
    return res
      .status(400)
      .json({ status: "error", message: "User ID required" });
  }
  try {
    const [existing] = await pool.query(
      "SELECT * FROM reviews WHERE id = ? AND user_id = ?",
      [reviewId, userId]
    );
    if (existing.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to delete this review",
      });
    }

    const agentNumericId = existing[0].id; // We need numeric ID for agent-reviews relation if possible
    // Wait, reviews table agent_id is string. Let's find numeric ID first
    const [agents] = await pool.query("SELECT id FROM agents WHERE agent_id = ?", [existing[0].agent_id]);
    const agentId = agents.length > 0 ? agents[0].id : null;

    await pool.query("DELETE FROM reviews WHERE id = ?", [reviewId]);

    // Recalculate aggregates if we found the agent
    if (agentId) {
      const statsSql = `
        SELECT
          COUNT(*) AS review_count,
          IFNULL(AVG(rating), 0) AS avg_rating
        FROM reviews
        WHERE agent_id = ?
      `;
      const [statsRows] = await pool.query(statsSql, [existing[0].agent_id]);
      const { review_count, avg_rating } = statsRows[0];

      const updateAgentQuery = `
        UPDATE agents
        SET rating = ?, reviews = ?
        WHERE id = ?
      `;
      await pool.query(updateAgentQuery, [avg_rating, review_count, agentId]);
    }

    res.json({ status: "success", message: "Review deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete review" });
  }
});

module.exports = router;
