const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../../config/dummyDb.js");
require("dotenv").config();

// Widget-Verified Login - No OTP check needed
router.post("/widget-login", async (req, res) => {
    const { mobile } = req.body;

    if (!mobile) {
        return res.status(400).json({ success: false, message: "Mobile number required" });
    }

    try {
        const formattedMobile = "91" + mobile;
        console.log('[WIDGET-LOGIN] Processing login for:', formattedMobile);

        // 1. Check if agent exists
        const [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ? LIMIT 1", [formattedMobile]);
        let agent = agents[0];
        let isNewUser = false;

        if (!agent) {
            // 2. Create new agent
            console.log('[WIDGET-LOGIN] Creating new user');
            isNewUser = true;
            const tempAgentId = "TEMP-" + Date.now();
            const placeholderEmail = `${mobile}@feminiq.placeholder`;
            const placeholderName = `Partner ${mobile.slice(-4)}`;

            const [result] = await pool.query(
                "INSERT INTO agents (mobile, email, full_name, name, status, agent_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [formattedMobile, placeholderEmail, placeholderName, placeholderName, "Pending Onboarding", tempAgentId, "mobile-login"]
            );
            const newAgentId = result.insertId;

            // Calculate next unique FP ID by checking BOTH active and deleted tables
            const [agentsMax] = await pool.query("SELECT MAX(CAST(SUBSTRING(agent_id, 3) AS UNSIGNED)) as maxVal FROM agents WHERE agent_id LIKE 'FP%'");
            let deletedMaxVal = 0;
            try {
                const [deletedMax] = await pool.query("SELECT MAX(CAST(SUBSTRING(agent_id, 3) AS UNSIGNED)) as maxVal FROM agent_deleted_accounts WHERE agent_id LIKE 'FP%'");
                deletedMaxVal = deletedMax[0]?.maxVal || 0;
            } catch (e) { /* ignore if table missing */ }

            const currentMax = Math.max(agentsMax[0]?.maxVal || 0, deletedMaxVal);
            const uniqueId = `FP${String(currentMax + 1).padStart(6, "0")}`;
            await pool.query("UPDATE agents SET agent_id = ? WHERE id = ?", [uniqueId, newAgentId]);

            // Fetch new agent
            const [newAgents] = await pool.query("SELECT * FROM agents WHERE id = ? LIMIT 1", [newAgentId]);
            agent = newAgents[0];
        }

        // 3. Generate Token
        const token = jwt.sign(
            { agentId: agent.id, email: agent.email || mobile },
            process.env.JWT_SECRET || "defaultsecret",
            { expiresIn: "30d" }
        );

        console.log('[WIDGET-LOGIN] Login successful for agent:', agent.agent_id);

        res.json({
            success: true,
            message: "Login successful",
            token,
            agent,
            isNewUser
        });

    } catch (error) {
        console.error("[WIDGET-LOGIN] Error:", error);
        res.status(500).json({ success: false, message: "Server error during login" });
    }
});

module.exports = router;
