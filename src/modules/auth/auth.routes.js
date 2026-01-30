const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");

router.post("/verify-otp", (req, res, next) => {
    console.log("[ROUTER] Hit /verify-otp");
    next();
}, authController.verifyOtp);
router.post("/refresh-token", authController.refreshToken);

module.exports = router;
