const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../config/dummyDb.js");
require("dotenv").config();

router.post("/", async (req, res) => {
  const { email, password, fullname } = req.body;

  if (!email || !password || !fullname) {
    return res.status(400).json({
      status: "error",
      message: "Email, password, and fullname are required",
    });
  }

  try {
    const [existingAgents] = await pool.query(
      "SELECT * FROM agents WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingAgents.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Agent with this email already exists",
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert agent WITHOUT shop_id first, so we can use insertId
    const [result] = await pool.query(
      "INSERT INTO agents (email, full_name, name, status) VALUES (?, ?, ?, ?)",
      [email, fullname, fullname, "Pending Onboarding"]
    );

    const agentId = result.insertId;
    const uniqueId = `FP${String(agentId).padStart(6, "0")}`;

    // Now update agent_id, password, and shop_id to match the auto-increment id
    await pool.query(
      "UPDATE agents SET agent_id = ?, password = ?, shop_id = ? WHERE id = ?",
      [uniqueId, passwordHash, agentId, agentId]
    );

    const token = jwt.sign(
      { agentId, email },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    const [agents] = await pool.query(
      "SELECT id, agent_id, full_name, email, status, shop_id FROM agents WHERE id = ? LIMIT 1",
      [agentId]
    );

    res.status(201).json({
      status: "success",
      message: "Agent registered successfully",
      token,
      agent: agents[0],
    });
  } catch (error) {
    console.error("Agent register error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

module.exports = router;
