const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");

router.post("/verify-otp", authController.verifyOtp);
router.post("/refresh-token", authController.refreshToken);

module.exports = router;
