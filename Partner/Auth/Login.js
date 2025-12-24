const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../config/dummyDb.js"); // Adjust path accordingly
require("dotenv").config();

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Email and password are required",
    });
  }

  try {
    const [agents] = await pool.query(
      "SELECT * FROM agents WHERE email = ? LIMIT 1",
      [email]
    );

    if (agents.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Agent not found",
      });
    }

    const agent = agents[0];
    const match = await bcrypt.compare(password, agent.password);
    if (!match) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { agentId: agent.id, email: agent.email },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({
      status: "success",
      message: "Logged in successfully",
      token,
      agent: agent,
    });
  } catch (error) {
    console.error("Agent login error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

module.exports = router;
