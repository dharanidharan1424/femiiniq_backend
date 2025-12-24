const express = require("express");
const router = express.Router();
const pool = require("../../config/db.js"); // Your MySQL2 promise pool/connection

router.post("/verify", async (req, res) => {
  const { userId, couponCode } = req.body;
  if (!userId || !couponCode) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing userId or couponCode" });
  }
  const conn = await pool.getConnection();
  try {
    // Find coupon by coupon_name as the code
    const [coupons] = await conn.execute(
      "SELECT * FROM coupons WHERE coupon_name = ?",
      [couponCode]
    );
    if (coupons.length === 0) {
      conn.release();
      return res.json({
        status: "invalid",
        message: "Coupon code does not exist",
      });
    }
    // Check if user already used this coupon_name
    const [used] = await conn.execute(
      "SELECT id FROM demobookings WHERE user_id = ? AND couponcode = ?",
      [userId, couponCode]
    );
    conn.release();
    if (used.length > 0) {
      return res.json({
        status: "used",
        message: "You have already used this coupon",
      });
    }
    res.json({
      status: "valid",
      message: "Coupon applied successfully",
      coupon: coupons[0],
    });
  } catch (err) {
    conn.release();
    res
      .status(500)
      .json({ status: "error", message: "Server error, try again" });
    console.error(err);
  }
});

router.post("/add", async (req, res) => {
  const { coupon_name, discount_amount } = req.body;

  // Validate input
  if (!coupon_name || typeof discount_amount !== "number") {
    return res.status(400).json({
      status: "error",
      message: "Missing coupon_name or discount_amount",
    });
  }

  const conn = await pool.getConnection();
  try {
    // Insert the coupon (coupon_name must be unique)
    await conn.execute(
      "INSERT INTO coupons (coupon_name, discount_amount) VALUES (?, ?)",
      [coupon_name.trim().toUpperCase(), discount_amount]
    );
    conn.release();
    res.json({
      status: "success",
      message: "Coupon added successfully",
      coupon: {
        coupon_name: coupon_name.trim().toUpperCase(),
        discount_amount,
      },
    });
  } catch (err) {
    conn.release();
    if (err.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ status: "error", message: "Coupon name already exists" });
    } else {
      res
        .status(500)
        .json({ status: "error", message: "Server error, try again" });
    }
  }
});

router.get("/list", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [coupons] = await conn.execute("SELECT * FROM coupons");
    conn.release();
    res.json({ status: "success", coupons });
  } catch (err) {
    conn.release();
    res

      .status(500)
      .json({ status: "error", message: "Server error, try again" });
  }
});

module.exports = router;
