const pool = require("../../config/db");
const verifyMsg91Otp = require("../../utils/msg91Verify");
const generateAgentId = require("../../utils/generateAgentId");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

exports.verifyOtp = async (req, res) => {
    const { mobile, accessToken } = req.body;

    if (!mobile || !accessToken) {
        return res.status(400).json({ error: "Mobile and access token required" });
    }

    try {
        // 1. Verify OTP with MSG91
        const isValid = await verifyMsg91Otp(mobile, accessToken);
        // For Development/Testing without real SMS, you might want to bypass:
        // if (accessToken === "test-token" && mobile === "9999999999") isValid = true; 

        if (!isValid) {
            return res.status(401).json({ error: "Invalid OTP or Access Token" });
        }

        // 2. Check if agent exists
        const [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ?", [mobile]);
        let agent = agents[0];
        let isNew = false;

        if (!agent) {
            // 3. Create new agent if not exists
            isNew = true;
            const newAgentId = await generateAgentId();

            await pool.query(
                `INSERT INTO agents (agent_id, mobile, status, publish_status, adminverifystatus) 
         VALUES (?, ?, 'Pending Onboarding', 'pending', 'pending')`,
                [newAgentId, mobile]
            );

            // Fetch newly created agent
            const [newAgents] = await pool.query("SELECT * FROM agents WHERE mobile = ?", [mobile]);
            agent = newAgents[0];
        }

        // 4. Generate JWT
        const token = jwt.sign(
            {
                id: agent.id,
                agent_id: agent.agent_id,
                mobile: agent.mobile
            },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.json({
            success: true,
            token,
            agentId: agent.agent_id,
            isNewUser: isNew,
            onboardingStatus: agent.status
        });

    } catch (error) {
        console.error("Auth Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
