const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const router = express.Router();
const fetch = require("node-fetch");
require("dotenv").config();

// Initialize Razorpay instance using environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID?.slice(0, 10));
console.log("RAZORPAY_KEY_SECRET EXISTS:", process.env.RAZORPAY_SECRET);


// Route to create Razorpay order
router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        error: "Amount and currency are required",
      });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_SECRET;

    const auth = Buffer.from(
      `${razorpayKeyId}:${razorpayKeySecret}`
    ).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amount, // in paise
        currency: currency,
        receipt: `receipt_${Date.now()}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Razorpay API error:", data);
      return res.status(500).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Create order failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Route to verify Razorpay payment signature


router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        error: "Required payment details are missing",
      });
    }

    // 1️⃣ Verify signature (MOST IMPORTANT)
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    // 2️⃣ Fetch payment details from Razorpay
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`
    ).toString("base64");

    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const paymentData = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: paymentData,
      });
    }

    // 3️⃣ Check payment status
    if (paymentData.status === "captured") {
      return res.status(200).json({
        success: true,
        payment: paymentData,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment not captured",
        payment: paymentData,
      });
    }
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
});


module.exports = router;
