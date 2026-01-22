const express = require("express");
const router = express.Router();
const pool = require("../../config/db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../../middleware/authToken.js");

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt:", { email });

  if (!email || !password) {
    console.log("Missing email or password");
    return res
      .status(400)
      .json({ status: "error", message: "Email and Password are required" });
  }

  try {
    // 1. Try mobile_user_auth first (active only)
    let [userAuthRows] = await pool.query(
      "SELECT * FROM mobile_user_auth WHERE email = ? AND status = 'active' LIMIT 1",
      [email]
    );
    console.log("mobile_user_auth query result:", userAuthRows.length);

    let userId, passwordHash, userEmail;
    if (userAuthRows.length) {
      // Mobile app user
      const userAuth = userAuthRows[0];
      userId = userAuth.user_id;
      userEmail = userAuth.email;
      passwordHash = userAuth.password_hash;
      console.log("User found in mobile_user_auth:", userId, userEmail);
    } else {
      // 2. Try users table (for web users; must have password set)
      let [usersRows] = await pool.query(
        "SELECT * FROM users WHERE email = ? AND password != '' LIMIT 1",
        [email]
      );
      console.log("users table query result:", usersRows.length);

      if (!usersRows.length) {
        console.log("User not found in either mobile_user_auth or users table");
        return res
          .status(401)
          .json({ status: "error", message: "Invalid email or password" });
      }
      const userRow = usersRows[0];
      userId = userRow.id;
      userEmail = userRow.email;
      passwordHash = userRow.password;
      console.log(
        "User found in users table:",
        userId,
        userEmail,
        passwordHash,
        password
      );
    }

    let normalizedHash = passwordHash.startsWith("$2y$")
      ? "$2a$" + passwordHash.slice(4)
      : passwordHash;

    // 3. Verify password hash
    const match = await bcrypt.compare(password, normalizedHash);
    console.log("Password match result:", match);
    if (!match) {
      console.log("Password mismatch");
      return res
        .status(401)
        .json({ status: "error", message: "Invalid email or password" });
    }

    // 4. Get full user profile from users table
    const [profileRows] = await pool.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    console.log("User profile query result:", profileRows.length);
    if (!profileRows.length) {
      console.log("User profile not found");
      return res
        .status(404)
        .json({ status: "error", message: "User profile not found" });
    }
    const user = profileRows[0];
    console.log("User profile loaded:", user.id, user.email);

    // 5. Generate JWT
    const secret = process.env.JWT_SECRET || "secret-key";
    const token = jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
    console.log("JWT token created");

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    console.log("Login successful, sending response");
    return res.json({ status: "success", user, token });
  } catch (error) {
    console.error("DB query error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Database query failed" });
  }
});

router.post("/oauth-login", async (req, res) => {
  const { email, fullname } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ status: "error", message: "Email is required" });
  }

  try {
    // Try to find the user in users table by email
    const [userRows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    // Now userRows is always an array of results

    let user;
    if (userRows.length === 0) {
      // User does not exist, create new user with the provided fullname and email
      const insertResult = await pool.query(
        "INSERT INTO users (email, fullname) VALUES (?, ?)",
        [email, fullname]
      );
      user = {
        id: insertResult[0].insertId,
        email,
        name: fullname,
      };
    } else {
      user = userRows[0];
    }

    // Generate JWT token for the user
    const secret = process.env.JWT_SECRET || "secret-key";
    const token = jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    // Set cookie if you want to maintain consistency with existing login
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.json({ status: "success", user, token });
  } catch (error) {
    console.error("OAuth login error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "OAuth login failed" });
  }
});

router.post("/savePushToken", async (req, res) => {
  const { expoPushToken, userId } = req.body;

  if (!expoPushToken)
    return res.status(400).json({ error: "Token is required" });

  try {
    await pool.query("UPDATE users SET expo_push_token = ? WHERE id = ?", [
      expoPushToken,
      userId,
    ]);
    res.json({ success: true, message: "Token saved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not save token" });
  }
});

module.exports = router;
