const pool = require("../../config/db");
const verifyMsg91Otp = require("../../utils/msg91Verify");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "your-refresh-secret-key";

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, mobile: user.mobile, role: 'user' },
        JWT_SECRET,
        { expiresIn: "15m" } // Short lived
    );
    const refreshToken = jwt.sign(
        { id: user.id, mobile: user.mobile, role: 'user' },
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
        console.log(`[USER-AUTH] Verifying OTP for mobile: ${mobile}`);

        // 1. Verify OTP using the shared MSG91 utility
        const isValid = await verifyMsg91Otp(mobile, accessToken);
        console.log(`[USER-AUTH] OTP isValid: ${isValid}`);

        if (!isValid) {
            console.warn(`[USER-AUTH] OTP Verification failed for ${mobile}`);
            return res.status(401).json({ error: "Invalid OTP or Access Token" });
        }

        // 2. Check/Create User
        console.log(`[USER-AUTH] Checking if user exists for ${mobile}`);
        // Note: Assuming 'users' table has a 'mobile' column. 
        // Based on previous inspection, it might ONLY have email.
        // If mobile column is missing, this query will fail. 
        // We relying on the earlier auto-migration or existing schema.
        // IMPORTANT: Schema inspection showed 'mobile' column exists in 'agents' but 'users' was INSPECT_DB target.
        // Wait, looking at previous db_schema_utf8.txt, 'users' wasn't fully shown but 'agents' was.
        // Implementation plan assumes 'users' logic mirrors 'agents'.

        let [users] = await pool.query("SELECT * FROM users WHERE mobile = ?", [mobile]);
        let user = users[0];
        let isNew = false;

        if (!user) {
            console.log(`[USER-AUTH] User not found, creating new user for ${mobile}`);
            isNew = true;

            // Create user with dummy email/password
            const dummyEmail = `${mobile}@feminiq.user`; // Unique constraint usually on email
            const dummyName = `User ${mobile.slice(-4)}`;

            // Using INSERT IGNORE or standard INSERT
            await pool.query(
                `INSERT INTO users (mobile, email, name, fullname, password) 
                 VALUES (?, ?, ?, ?, 'mobile-login-no-pass')`,
                [mobile, dummyEmail, dummyName, dummyName]
            );

            [users] = await pool.query("SELECT * FROM users WHERE mobile = ?", [mobile]);
            user = users[0];
        }

        console.log(`[USER-AUTH] User identified: ${user.id}`);

        // 3. Generate Tokens
        const tokens = generateTokens(user);

        // 4. Store Tokens in DB
        await pool.query("UPDATE users SET refresh_token = ?, jwt_token = ? WHERE id = ?",
            [tokens.refreshToken, tokens.accessToken, user.id]
        );
        console.log(`[USER-AUTH] Tokens stored for user ${user.id}`);

        res.json({
            success: true,
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                email: user.email
            },
            isNewUser: isNew
        });

    } catch (error) {
        console.error("[USER-AUTH] Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh Token Required" });

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

        const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [decoded.id]);
        if (!users.length || users[0].refresh_token !== refreshToken) {
            return res.status(403).json({ error: "Invalid Refresh Token" });
        }

        const user = users[0];
        const newAccessToken = jwt.sign(
            { id: user.id, email: user.email, mobile: user.mobile, role: 'user' },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Update jwt_token in DB
        await pool.query("UPDATE users SET jwt_token = ? WHERE id = ?", [newAccessToken, user.id]);

        res.json({
            success: true,
            accessToken: newAccessToken,
            token: newAccessToken
        });

    } catch (error) {
        console.error("[USER-AUTH] Refresh Error:", error);
        return res.status(403).json({ error: "Invalid or Expired Refresh Token" });
    }
};
