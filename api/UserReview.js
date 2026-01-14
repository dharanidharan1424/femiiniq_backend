const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// Create a review (user → staff)
// POST: Create a review
router.post("/", async (req, res) => {
  const { reviewer_id, reviewee_id, rating, comment } = req.body;

  // Map reviewer_id -> user_id, reviewee_id -> agent_id, comment -> review
  const userId = reviewer_id;
  const agentId = reviewee_id;
  const reviewText = comment;

  if (!userId || !agentId || !rating) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields." });
  }
  try {
    // 1. Fetch agent info to populate agent_name/staff_name (if needed by db triggers or for consistency)
    const [agents] = await pool.query("SELECT full_name, name FROM agents WHERE id = ?", [agentId]);
    const agentName = agents.length > 0 ? agents[0].full_name : "Unknown Agent";
    const staffName = agents.length > 0 ? agents[0].name : "Unknown Shop";

    // 2. Insert Review
    const insertSql = `
      INSERT INTO reviews
      (user_id, agent_id, agent_name, staff_name, rating, review)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertSql, [
      userId,
      agentId,
      agentName,
      staffName,
      rating,
      reviewText || null,
    ]);

    // 3. Calculate aggregates from reviews table
    const statsSql = `
      SELECT
        COUNT(*) AS review_count,
        IFNULL(AVG(rating), 0) AS avg_rating
      FROM reviews
      WHERE agent_id = ?
    `;
    const [statsRows] = await pool.query(statsSql, [agentId]);
    const { review_count, avg_rating } = statsRows[0];

    // 4. Update agents table
    const updateAgentQuery = `
      UPDATE agents
      SET rating = ?, reviews = ?
      WHERE id = ?
    `;
    await pool.query(updateAgentQuery, [avg_rating, review_count, agentId]);

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
  const staffId = req.params.id;
  try {
    const sql = `
      SELECT 
        r.id, r.user_id AS reviewer_id, r.rating, r.review AS comment, r.likes, r.created_at,
        u.fullname AS reviewer_name, u.image AS reviewer_image
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.agent_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(sql, [staffId]);
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
        r.id, r.user_id AS reviewer_id, r.agent_id AS reviewee_id, r.rating, r.review AS comment, r.likes, r.created_at,
        s.full_name AS agent_name, s.name AS staff_name, s.image AS staff_image
      FROM reviews r
      JOIN agents s ON r.agent_id = s.id
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
  const reviewId = req.params.id;
  try {
    await pool.query(
      "UPDATE reviews SET likes = likes + 1 WHERE id = ?",
      [reviewId]
    );
    res.json({ status: "success" });
  } catch (err) {
    console.error("Like Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to like review." });
  }
});

router.post("/:id/unlike", async (req, res) => {
  const reviewId = req.params.id;
  try {
    await pool.query(
      "UPDATE reviews SET likes = likes - 1 WHERE id = ?",
      [reviewId]
    );
    res.json({ status: "success" });
  } catch (err) {
    console.error("Unlike Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to unlike review." });
  }
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

    const agentId = existing[0].agent_id;

    await pool.query("DELETE FROM reviews WHERE id = ?", [reviewId]);

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

    const updateAgentQuery = `
      UPDATE agents
      SET rating = ?, reviews = ?
      WHERE id = ?
    `;
    await pool.query(updateAgentQuery, [avg_rating, review_count, agentId]);

    res.json({ status: "success", message: "Review deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete review" });
  }
});

module.exports = router;
