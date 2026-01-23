const express = require("express");
const supabase = require("../../config/supabaseClient.js");
const pool = require("../../config/db.js");
const router = express.Router();

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
const nodemailer = require("nodemailer");

const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

(async () => {
  try {
    const { data, error } = await supabase.from("otps").select("*");
    if (error) {
      console.error("Supabase Connection Test Error:", error.message);
    } else {
      const formattedData = data.map((item) => ({
        ...item,
        expires_at: new Date(item.expires_at).toLocaleString(),
      }));
      console.log("Supabase Connection Test Success:", formattedData);
    }
  } catch (err) {
    console.error("Unexpected Supabase Error:", err.message);
  }
})();

router.post("/send-otp", async (req, res) => {
  const { email, type } = req.body;
  if (!email)
    return res.status(400).json({ success: false, error: "Email required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  console.log(
    "Generated OTP:",
    otp,
    "Expires At:",
    new Date(expiresAt).toLocaleString()
  );

  try {
    const { error } = await supabase
      .from("otps")
      .upsert({ email, otp, expires_at: expiresAt }, { onConflict: "email" });
    if (error) throw error;

    console.log("Processing OTP request for:", email, "Type:", type);

    if (type === "artist") {
      console.log("Attempting to send artist OTP via Brevo API...");
      try {
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = "Your Artist Signup OTP Code";
        sendSmtpEmail.htmlContent = `<h2>Welcome to feminiq!</h2><p>Your OTP for artist account creation is:</p><p style="font-size:2em;"><b>${otp}</b></p><p>Expires in 10 minutes.</p>`;
        sendSmtpEmail.sender = { name: "feminiq Artist", email: "socialflyinfotech@gmail.com" };
        sendSmtpEmail.to = [{ email: email }];

        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("✅ Brevo API Success (Artist):", data);
      } catch (brevoError) {
        console.error("❌ Brevo API Error (Artist):", brevoError);
        return res.status(500).json({ success: false, error: "Brevo API failed", details: brevoError.message });
      }
    } else {
      // Default to Resend for mobile app/other users
      console.log("Attempting to send user OTP via Resend...");
      try {
        const data = await resend.emails.send({
          from: "feminiq <feminiq@resend.dev>",
          to: email,
          subject: "Your OTP Code",
          html: `<h2>Your OTP is:</h2><p style="font-size:2em;"><b>${otp}</b></p><p>Expires in 10 minutes.</p>`,
        });
        console.log("Resend API Response (User):", data);
        console.log(`✅ OTP successfully sent via Resend to user: ${email}`);
      } catch (resendError) {
        console.error("❌ Resend API Error (User):", resendError);
        return res.status(500).json({ success: false, error: "Resend API failed", details: resendError.message });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to send OTP.",
      details: err.message,
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, error: "Email required" });

  try {
    let [userRows] = await pool.query(
      "SELECT * FROM mobile_user_auth WHERE email = ? AND status = 'active' LIMIT 1",
      [email]
    );

    if (!userRows.length) {
      [userRows] = await pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      if (!userRows.length)
        return res.json({ success: false, error: "User not found" });
    }

    // User exists, generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    console.log(
      "Generated OTP (Forgot Password):",
      otp,
      "Expires At:",
      new Date(expiresAt).toLocaleString()
    );

    // Save OTP in Supabase
    const { error: otpError } = await supabase
      .from("otps")
      .upsert({ email, otp, expires_at: expiresAt }, { onConflict: "email" });
    if (otpError) throw otpError;

    // Send OTP email with Resend SMTP
    await resend.emails.send({
      from: "feminiq <feminiq@resend.dev>",
      to: email,
      subject: "Your Password Reset OTP Code",
      html: `<h2>Your OTP for password reset is:</h2><p style="font-size:2em;"><b>${otp}</b></p><p>Expires in 10 minutes.</p>`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Forgot password OTP error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to send OTP for forgot password.",
      details: err.message,
    });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  console.log("verify-otp request body:", req.body);
  if (!email || !otp)
    return res
      .status(400)
      .json({ success: false, error: "Required fields missing" });

  try {
    const { data, error } = await supabase
      .from("otps")
      .select("otp, expires_at")
      .eq("email", email)
      .single();
    if (error) throw error;

    if (!data || data.otp !== otp)
      return res.json({ success: false, error: "Invalid OTP" });
    if (new Date() > new Date(data.expires_at))
      return res.json({ success: false, error: "OTP expired" });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
