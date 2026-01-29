const pool = require("../../config/db");
const verifyMsg91Otp = require("../../utils/msg91Verify");
const generateAgentId = require("../../utils/generateAgentId");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "your-refresh-secret-key";

const generateTokens = (agent) => {
    const accessToken = jwt.sign(
        { id: agent.id, agent_id: agent.agent_id, mobile: agent.mobile },
        JWT_SECRET,
        { expiresIn: "15m" } // Short lived
    );
    const refreshToken = jwt.sign(
        { id: agent.id, agent_id: agent.agent_id, mobile: agent.mobile },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" } // Long lived
    );
    return { accessToken, refreshToken };
};

exports.verifyOtp = async (req, res) => {
    const { mobile, accessToken } = req.body;

    if (!mobile || !accessToken) {
        return res.status(400).json({ error: "Mobile and access token required" });
    }

    try {
        // 1. Verify OTP
        const isValid = await verifyMsg91Otp(mobile, accessToken);
        // For Development/Testing
        // if (accessToken === "test-token" && mobile === "9999999999") isValid = true; 

        if (!isValid) {
            return res.status(401).json({ error: "Invalid OTP or Access Token" });
        }

        // 2. Check/Create Agent
        let [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ?", [mobile]);
        let agent = agents[0];
        let isNew = false;

        if (!agent) {
            isNew = true;
            const newAgentId = await generateAgentId();
            await pool.query(
                `INSERT INTO agents (agent_id, mobile, status, publish_status, adminverifystatus) 
                 VALUES (?, ?, 'Pending Onboarding', 'pending', 'pending')`,
                [newAgentId, mobile]
            );
            [agents] = await pool.query("SELECT * FROM agents WHERE mobile = ?", [mobile]);
            agent = agents[0];
        }

        // 3. Generate Tokens
        const tokens = generateTokens(agent);

        // 4. Store Refresh Token in DB
        await pool.query("UPDATE agents SET refresh_token = ? WHERE id = ?", [tokens.refreshToken, agent.id]);

        res.json({
            success: true,
            token: tokens.accessToken, // Maintain backward compatibility for now if frontend uses 'token'
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            agentId: agent.agent_id,
            isNewUser: isNew,
            onboardingStatus: agent.status
        });

    } catch (error) {
        console.error("Auth Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh Token Required" });

    try {
        // 1. Verify Signature
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

        // 2. Check DB for matching token
        const [agents] = await pool.query("SELECT * FROM agents WHERE id = ?", [decoded.id]);
        if (!agents.length || agents[0].refresh_token !== refreshToken) {
            return res.status(403).json({ error: "Invalid Refresh Token" });
        }

        const agent = agents[0];

        // 3. Generate New Access Token
        const newAccessToken = jwt.sign(
            { id: agent.id, agent_id: agent.agent_id, mobile: agent.mobile },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.json({
            success: true,
            accessToken: newAccessToken,
            token: newAccessToken
        });

    } catch (error) {
        console.error("Refresh Error:", error);
        return res.status(403).json({ error: "Invalid or Expired Refresh Token" });
    }
};
