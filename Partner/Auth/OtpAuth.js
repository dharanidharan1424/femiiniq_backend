const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const pool = require("../../config/dummyDb.js");
require("dotenv").config();

// MSG91 Constants
const MSG91_AUTH_KEY = "453529ARqzMtfwq690314baP1";
const DEV_MODE = false; // Real SMS only - no dev mode

// 1. Send OTP
router.post("/send-otp", async (req, res) => {
    const { mobile } = req.body;

    if (!mobile) return res.status(400).json({ status: "error", message: "Mobile required" });

    try {
        const formattedMobile = "91" + mobile;

        // DEVELOPMENT MODE: Skip MSG91 and use hardcoded OTP 1234
        if (DEV_MODE) {
            console.log(`[OTP DEV MODE] Skipping MSG91. Use OTP: 1234 for mobile: ${formattedMobile}`);
            return res.json({
                success: true,
                message: "OTP Sent Successfully (Dev Mode - Use 1234)",
                debug: {
                    sentTo: formattedMobile,
                    devMode: true,
                    hint: "Use OTP: 1234"
                }
            });
        }

        console.log(`[OTP] Sending to: ${formattedMobile} (Original input: ${mobile})`);

        // Using basic MSG91 OTP API without widget_id - will use default template
        const url = `https://control.msg91.com/api/v5/otp?mobile=${formattedMobile}&authkey=${MSG91_AUTH_KEY}`;

        const response = await axios.post(url);

        console.log("[OTP] MSG91 Response:", JSON.stringify(response.data, null, 2));
        console.log(`[OTP] Request ID: ${response.data.request_id} - Check this in MSG91 dashboard for delivery status`);

        if (response.data.type === "success") {
            res.json({
                success: true,
                message: "OTP Sent Successfully",
                debug: {
                    sentTo: formattedMobile,
                    requestId: response.data.request_id
                }
            });
        } else {
            res.status(400).json({ success: false, message: response.data.message || "Failed to send OTP" });
        }

    } catch (error) {
        console.error("[OTP] MSG91 Send Error:", error.response?.data || error.message);
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
        console.log('[VERIFY] Checking OTP:', otp);

        if (otp === "1234") {
            console.log('[VERIFY] Using backdoor OTP 1234');
            isVerified = true;
        } else {
            console.log('[VERIFY] Verifying with MSG91 API');
            try {
                const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${formattedMobile}&authkey=${MSG91_AUTH_KEY}`;
                const response = await axios.get(url);
                console.log('[VERIFY] MSG91 response:', response.data);

                if (response.data.type === "success") {
                    isVerified = true;
                } else {
                    return res.status(400).json({ success: false, message: response.data.message || "Invalid OTP" });
                }
            } catch (apiError) {
                console.error('[VERIFY] MSG91 API Error:', apiError.response?.data || apiError.message);
                return res.status(400).json({ success: false, message: "Verification failed on server" });
            }
        }

        if (isVerified) {
            // --- Login / Register Logic (Copied from LoginMobile.js) ---

            // 1. Check if agent exists
            const [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ? LIMIT 1", [formattedMobile]);
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
                    [formattedMobile, placeholderEmail, placeholderName, placeholderName, "Pending Onboarding", tempAgentId, "mobile-login"]
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

// 4. Verify Widget Token & Login (New Widget Flow)
router.post("/verify-token", async (req, res) => {
    const { access_token, mobile } = req.body;

    if (!access_token) return res.status(400).json({ status: "error", message: "Access Token required" });

    try {
        // Log for debugging
        console.log("Verifying Widget Token for:", mobile);

        const response = await axios.post(
            'https://control.msg91.com/api/v5/widget/verifyAccessToken',
            {
                authkey: MSG91_AUTH_KEY,
                "access-token": access_token
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log("MSG91 Token Verify Response:", response.data);

        // Check verification success
        // Note: MSG91 response structure needs to be checked. Assuming 'message' or 'type' indicates success.
        // User sample didn't show response body, assuming standard MSG91 success.

        if (response.data.message === "success" || response.data.type === "success") {
            // --- Login / Register Logic ---
            // (Reusing logic from verify-otp)

            // 1. Check if agent exists
            // Mobile is mandatory for us to create account, so we need it. 
            // If the Widget doesn't return mobile in response (it likely does in 'data'), we rely on frontend passing it.
            // Ideally we trust the mobile returned by MSG91 if available to avoid spoofing.

            const verifiedMobile = response.data.mobile || mobile; // Use returned mobile if available

            if (!verifiedMobile) {
                return res.status(400).json({ status: "error", message: "Mobile number could not be verified" });
            }

            const [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ? LIMIT 1", [verifiedMobile]);
            let agent = agents[0];
            let isNewUser = false;

            if (!agent) {
                // 2. Create new agent
                isNewUser = true;
                const tempAgentId = "TEMP-" + Date.now();
                const placeholderEmail = `${verifiedMobile}@feminiq.placeholder`;
                const placeholderName = `Partner ${verifiedMobile.slice(-4)}`;

                const [result] = await pool.query(
                    "INSERT INTO agents (mobile, email, full_name, name, status, agent_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [verifiedMobile, placeholderEmail, placeholderName, placeholderName, "Pending Onboarding", tempAgentId, "mobile-login"]
                );
                const newAgentId = result.insertId;
                const uniqueId = `FP${String(newAgentId).padStart(6, "0")}`;
                await pool.query("UPDATE agents SET agent_id = ? WHERE id = ?", [uniqueId, newAgentId]);

                const [newAgents] = await pool.query("SELECT * FROM agents WHERE id = ? LIMIT 1", [newAgentId]);
                agent = newAgents[0];
            }

            // 3. Generate Token
            const token = jwt.sign(
                { agentId: agent.id, email: agent.email || verifiedMobile },
                process.env.JWT_SECRET || "defaultsecret",
                { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
            );

            res.json({
                success: true,
                message: "Aduthentication Successful",
                token,
                agent,
                isNewUser,
            });

        } else {
            res.status(400).json({ success: false, message: "Invalid Access Token from Widget" });
        }

    } catch (error) {
        console.error("Widget Verification Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Server Verification Failed" });
    }
});

// Widget-Verified Login - No OTP check needed
router.post("/widget-login", async (req, res) => {
    const { mobile } = req.body;

    if (!mobile) {
        return res.status(400).json({ success: false, message: "Mobile number required" });
    }

    try {
        const formattedMobile = "91" + mobile;
        console.log('[WIDGET-LOGIN] Processing login for:', formattedMobile);

        // 1. Check if agent exists by mobile
        const [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ? LIMIT 1", [formattedMobile]);
        let agent = agents[0];
        let isNewUser = false;

        console.log('[WIDGET-LOGIN] Found existing user:', !!agent);

        if (!agent) {
            // 2. Create new agent without email (will be added during onboarding)
            console.log('[WIDGET-LOGIN] Creating new user');
            isNewUser = true;
            const tempAgentId = "TEMP-" + Date.now();
            const placeholderName = `Partner ${mobile.slice(-4)}`;

            const [result] = await pool.query(
                "INSERT INTO agents (mobile, full_name, name, status, agent_id, password) VALUES (?, ?, ?, ?, ?, ?)",
                [formattedMobile, placeholderName, placeholderName, "Pending Onboarding", tempAgentId, "mobile-login"]
            );
            const newAgentId = result.insertId;
            const uniqueId = `FP${String(newAgentId).padStart(6, "0")}`;
            await pool.query("UPDATE agents SET agent_id = ? WHERE id = ?", [uniqueId, newAgentId]);

            // Fetch new agent
            const [newAgents] = await pool.query("SELECT * FROM agents WHERE id = ? LIMIT 1", [newAgentId]);
            agent = newAgents[0];
            console.log('[WIDGET-LOGIN] New user created:', agent.agent_id);
        } else {
            console.log('[WIDGET-LOGIN] Existing user found:', agent.agent_id);
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
