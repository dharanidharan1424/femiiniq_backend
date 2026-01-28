const express = require("express");
const router = express.Router();
const agentController = require("./agent.controller");
const authMiddleware = require("../../middleware/authMiddleware");

// Protected routes
router.patch("/status", authMiddleware, agentController.toggleStatus);

module.exports = router;
