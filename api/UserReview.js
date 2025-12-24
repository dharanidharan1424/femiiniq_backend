const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// Create a review (user → staff)
// POST: Create a review
router.post("/", async (req, res) => {
  const { reviewer_id, reviewee_id, rating, comment } = req.body;
  if (!reviewer_id || !reviewee_id || !rating) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields." });
  }
  try {
    const insertSql = `
      INSERT INTO mobile_reviews
      (reviewer_id, reviewer_type, reviewee_id, reviewee_type, rating, comment)
      VALUES (?, 'user', ?, 'staff', ?, ?)
    `;
    const [result] = await pool.query(insertSql, [
      reviewer_id,
      reviewee_id,
      rating,
      comment || null,
    ]);

    // Calculate new aggregates for staff - alias AVG(rating) as avg_rating to avoid var name conflict
    const statsSql = `
      SELECT
        COUNT(*) AS review_count,
        AVG(rating) AS avg_rating
      FROM mobile_reviews
      WHERE reviewee_id = ? AND reviewee_type = 'staff'
    `;
    const [statsRows] = await pool.query(statsSql, [reviewee_id]);
    const { review_count, avg_rating } = statsRows[0]; // use avg_rating here

    // Update staffs table with calculated averages
    const updateStaffQuery = `
      UPDATE staffs
      SET rating = ?, reviews = ?
      WHERE id = ?
    `;
    await pool.query(updateStaffQuery, [avg_rating, review_count, reviewee_id]);

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
  if (!reviewer_id || !rating) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields." });
  }
  try {
    const [existing] = await pool.query(
      "SELECT * FROM mobile_reviews WHERE id = ? AND reviewer_id = ?",
      [reviewId, reviewer_id]
    );
    if (existing.length === 0) {
      return res
        .status(403)
        .json({ status: "error", message: "Not authorized" });
    }
    const oldRating = existing[0].rating;
    await pool.query(
      "UPDATE mobile_reviews SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [rating, comment, reviewId]
    );

    // Adjust staff rating by difference
    const ratingDiff = rating - oldRating;
    const updateStaffQuery = `
      UPDATE staffs
      SET rating = (rating + ?) / (reviews + 1)
      WHERE id = ?
    `;
    await pool.query(updateStaffQuery, [ratingDiff, existing[0].reviewee_id]);

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
      SELECT r.*, u.fullname AS reviewer_name, u.image AS reviewer_image
      FROM mobile_reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ? AND r.reviewee_type = 'staff' AND r.reviewer_type = 'user'
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(sql, [staffId]);
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("Query Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch mobile_reviews." });
  }
});

// Get mobile_reviews written by a user (for user profile)
router.get("/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const sql = `
      SELECT r.*, s.name AS staff_name, s.mobile_image_url AS staff_image
      FROM mobile_reviews r
      JOIN staffs s ON r.reviewee_id = s.id AND r.reviewee_type = 'staff'
      WHERE r.reviewer_id = ? AND r.reviewer_type = 'user'
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(sql, [userId]);
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user mobile_reviews.",
    });
  }
});

router.post("/:id/like", async (req, res) => {
  const reviewId = req.params.id;
  try {
    await pool.query(
      "UPDATE mobile_reviews SET likes = likes + 1 WHERE id = ?",
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
      "UPDATE mobile_reviews SET likes = likes - 1 WHERE id = ?",
      [reviewId]
    );
    res.json({ status: "success" });
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

  if (!reviewer_id) {
    return res
      .status(400)
      .json({ status: "error", message: "Reviewer ID required" });
  }
  try {
    const [existing] = await pool.query(
      "SELECT * FROM mobile_reviews WHERE id = ? AND reviewer_id = ?",
      [reviewId, reviewer_id]
    );
    if (existing.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to delete this review",
      });
    }

    const revieweeId = existing[0].reviewee_id;

    await pool.query("DELETE FROM mobile_reviews WHERE id = ?", [reviewId]);

    // Recalculate after delete
    const statsSql = `
      SELECT
        COUNT(*) AS review_count,
        IFNULL(AVG(rating), 0) AS rating
      FROM mobile_reviews
      WHERE reviewee_id = ? AND reviewee_type = 'staff'
    `;
    const [statsRows] = await pool.query(statsSql, [revieweeId]);
    const { review_count, rating } = statsRows[0];

    const updateStaffQuery = `
      UPDATE staffs
      SET rating = ?, reviews = ?
      WHERE id = ?
    `;
    await pool.query(updateStaffQuery, [rating, review_count, revieweeId]);

    res.json({ status: "success", message: "Review deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete review" });
  }
});

module.exports = router;
