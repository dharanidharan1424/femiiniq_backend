const express = require("express");
const router = express.Router();

// POST /logout
router.post("/", (req, res) => {
  // For stateless JWT, just instruct the client to delete the token.
  // Optionally log logout events or handle refresh token revocation, if implemented.
  return res.json({ status: "success", message: "Logged out successfully" });
});

module.exports = router;
