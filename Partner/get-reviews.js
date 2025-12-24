const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb");

// GET /api/reviews/user/:userId
router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ reviews: rows });
  } catch (err) {
    console.error("Error fetching reviews for user:", err);
    res
      .status(500)
      .json({ error: "Unable to fetch reviews due to server error." });
  }
});

module.exports = router;
