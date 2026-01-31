const express = require("express");
const router = express.Router();
const userAuthController = require("./user.auth.controller");

router.post("/verify-otp", userAuthController.verifyOtp);
router.post("/refresh-token", userAuthController.refreshToken);

module.exports = router;
