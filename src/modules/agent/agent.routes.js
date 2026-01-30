const express = require("express");
const router = express.Router();
const agentController = require("./agent.controller");
const authMiddleware = require("../../../middleware/authToken");

// Protected routes
router.patch("/status", authMiddleware, agentController.toggleStatus);
router.get("/bank-details", authMiddleware, agentController.getBankDetails);

module.exports = router;
