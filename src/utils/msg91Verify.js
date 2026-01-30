const axios = require("axios");

/**
 * Verify OTP using MSG91 Widget API
 * @param {string} mobile - Mobile number to verify (with country code if needed, but usually widget handles it)
 * @param {string} accessToken - Token from MSG91 widget
 * @returns {Promise<boolean>} - True if valid, False otherwise
 */
const verifyMsg91Otp = async (mobile, accessToken) => {
    try {
        console.log(`[MSG91] Verifying access token...`);
        const response = await axios.post(
            "https://control.msg91.com/api/v5/widget/verifyAccessToken",
            {
                authkey: "453529ARqzMtfwq690314baP1", // User provided authkey
                "access-token": accessToken,
                mobile: mobile // Sometimes required depending on widget config
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 10000 // 10 second timeout
            }
        );
        console.log(`[MSG91] Response:`, JSON.stringify(response.data));

        // MSG91 usually returns type: "success" or "error"
        if (response.data && response.data.type === "success") {
            return true;
        }

        // Check if message is "OTP Verified" or similar
        if (response.data && response.data.message === "OTP verified success") {
            return true;
        }

        console.warn("MSG91 Verification Failed:", response.data);
        return false;

    } catch (error) {
        console.error("MSG91 API Error:", error.response ? error.response.data : error.message);
        return false;
    }
};

module.exports = verifyMsg91Otp;
