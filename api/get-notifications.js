const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing user ID" });
  }

  const conn = await pool.getConnection();

  try {
    const [notifications] = await conn.execute(
      "SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    conn.release();

    res.json({ status: "success", notifications });
  } catch (error) {
    conn.release();
    console.error("Failed to fetch notifications:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch notifications" });
  }
});

module.exports = router;
