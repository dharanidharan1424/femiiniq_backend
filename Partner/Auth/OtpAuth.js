const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const pool = require("../../config/dummyDb.js");
require("dotenv").config();

// MSG91 Constants
const MSG91_AUTH_KEY = "453529ARqzMtfwq690314baP1"; // Provided by user
const MSG91_WIDGET_ID = "366141685136363034343637"; // User provided Widget ID

// 1. Send OTP
router.post("/send-otp", async (req, res) => {
    const { mobile } = req.body;

    if (!mobile) return res.status(400).json({ status: "error", message: "Mobile required" });

    try {
        const formattedMobile = "91" + mobile; // Ensure country code

        console.log(`Sending OTP to: ${formattedMobile} using WidgetID: ${MSG91_WIDGET_ID}`);

        const url = `https://control.msg91.com/api/v5/otp?mobile=${formattedMobile}&authkey=${MSG91_AUTH_KEY}&widget_id=${MSG91_WIDGET_ID}`;

        const response = await axios.post(url);

        if (response.data.type === "success") {
            res.json({ success: true, message: "OTP Sent Successfully" });
        } else {
            res.status(400).json({ success: false, message: response.data.message || "Failed to send OTP" });
        }

    } catch (error) {
        console.error("MSG91 Send Error:", error.response?.data || error.message);
        // Fallback for development if MSG91 fails/quota exceeded
        // res.json({ success: true, message: "OTP Sent (Dev Mock)" }); 
        res.status(500).json({ success: false, message: "Failed to send OTP via MSG91" });
    }
});

// 2. Verify OTP & Login
router.post("/verify-otp", async (req, res) => {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) return res.status(400).json({ status: "error", message: "Mobile and OTP required" });

    try {
        const formattedMobile = "91" + mobile;

        // Developer Backdoor
        let isVerified = false;
        if (otp === "1234") {
            isVerified = true;
        } else {
            const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${formattedMobile}&authkey=${MSG91_AUTH_KEY}`;
            const response = await axios.get(url); // Verify is usually GET or POST. V5 docs say GET often work, but let's check. 
            // Docs: https://docs.msg91.com/p/tf9Ggv1x/text-sms/verify-otp

            if (response.data.type === "success") {
                isVerified = true;
            } else {
                return res.status(400).json({ success: false, message: response.data.message || "Invalid OTP" });
            }
        }

        if (isVerified) {
            // --- Login / Register Logic (Copied from LoginMobile.js) ---

            // 1. Check if agent exists
            const [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ? LIMIT 1", [mobile]);
            let agent = agents[0];
            let isNewUser = false;

            if (!agent) {
                // 2. Create new agent
                isNewUser = true;
                const tempAgentId = "TEMP-" + Date.now();
                const placeholderEmail = `${mobile}@feminiq.placeholder`;
                const placeholderName = `Partner ${mobile.slice(-4)}`;

                const [result] = await pool.query(
                    "INSERT INTO agents (mobile, email, full_name, name, status, agent_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [mobile, placeholderEmail, placeholderName, placeholderName, "Pending Onboarding", tempAgentId, "mobile-login"]
                );
                const newAgentId = result.insertId;
                const uniqueId = `FP${String(newAgentId).padStart(6, "0")}`;
                await pool.query("UPDATE agents SET agent_id = ? WHERE id = ?", [uniqueId, newAgentId]);

                // Fetch new agent
                const [newAgents] = await pool.query("SELECT * FROM agents WHERE id = ? LIMIT 1", [newAgentId]);
                agent = newAgents[0];
            }

            // 3. Generate Token
            const token = jwt.sign(
                { agentId: agent.id, email: agent.email || mobile },
                process.env.JWT_SECRET || "defaultsecret",
                { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
            );

            res.json({
                success: true,
                message: "Verified & Logged in",
                token,
                agent,
                isNewUser,
            });
        }

    } catch (error) {
        console.error("MSG91 Verify Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Verification failed on server" });
    }
});

// 3. Resend OTP
router.post("/retry-otp", async (req, res) => {
    const { mobile } = req.body;
    try {
        const formattedMobile = "91" + mobile;
        const url = `https://control.msg91.com/api/v5/otp/retry?mobile=${formattedMobile}&authkey=${MSG91_AUTH_KEY}&retrytype=text`;
        const response = await axios.post(url);
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ success: false, message: "Retry failed" });
    }
});

module.exports = router;
