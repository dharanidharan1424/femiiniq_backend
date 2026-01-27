const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../../config/dummyDb.js");
require("dotenv").config();

router.post("/", async (req, res) => {
    const { mobile, role } = req.body;

    if (!mobile) {
        return res.status(400).json({
            status: "error",
            message: "Mobile number is required",
        });
    }

    try {
        // 1. Check if agent exists with this mobile
        const [agents] = await pool.query(
            "SELECT * FROM agents WHERE mobile = ? LIMIT 1",
            [mobile]
        );

        let agent = agents[0];
        let isNewUser = false;

        if (!agent) {
            // 2. Create new agent if not found
            isNewUser = true;

            // Generate temp values for required fields
            const tempAgentId = "TEMP-" + Date.now(); // Will be updated to FP format if needed, or keeping it simple
            const placeholderEmail = `${mobile}@feminiq.placeholder`;
            const placeholderName = `Partner ${mobile.slice(-4)}`;
            const placeholderPassword = "mobile-login-no-pass"; // Should definitely be handled better in prod

            // Insert
            // Note: Assuming 'password' is required. Using dummy.
            // Assuming 'email' is required. Using placeholder.
            const [result] = await pool.query(
                "INSERT INTO agents (mobile, email, full_name, name, status, agent_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [mobile, placeholderEmail, placeholderName, placeholderName, "Pending Onboarding", tempAgentId, placeholderPassword]
            );

            const newAgentId = result.insertId;
            const uniqueId = `FP${String(newAgentId).padStart(6, "0")}`;

            // Update agent_id to FP format
            await pool.query(
                "UPDATE agents SET agent_id = ? WHERE id = ?",
                [uniqueId, newAgentId]
            );

            // Fetch the newly created agent
            const [newAgents] = await pool.query(
                "SELECT * FROM agents WHERE id = ? LIMIT 1",
                [newAgentId]
            );
            agent = newAgents[0];
        } else {
            // Update status if needed? No, preserve existing status.
            // If status was 'Pending Onboarding', it remains so.
        }

        // 3. Generate Token
        const token = jwt.sign(
            { agentId: agent.id, email: agent.email || mobile }, // Use mobile as fallback for payload
            process.env.JWT_SECRET || "defaultsecret",
            { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
        );

        // 4. Return success
        res.json({
            success: true,
            message: isNewUser ? "Account created successfully" : "Logged in successfully",
            token,
            agent,
            isNewUser,
        });

    } catch (error) {
        console.error("Agent mobile login error:", error);
        res.status(500).json({ status: "error", message: "Server error", details: error.message });
    }
});

module.exports = router;
