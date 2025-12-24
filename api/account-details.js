const express = require("express");
const router = express.Router();
const db = require("../config/db.js"); // Your MySQL2 promise pool/connection

// SAVE OR UPDATE bank/payment details
router.post("/", async (req, res) => {
  const {
    user_id,
    user_name,
    upi_id,
    bank_name,
    branch_name,
    ifsc_code,
    account_number,
  } = req.body;
  if (
    !user_id ||
    !user_name ||
    !upi_id ||
    !bank_name ||
    !branch_name ||
    !ifsc_code ||
    !account_number
  ) {
    return res
      .status(400)
      .json({ status: "error", message: "All fields required" });
  }
  try {
    // Upsert: insert or update if exists
    await db.query(
      `INSERT INTO user_payment_details
        (user_id , user_name , upi_id, bank_name, branch_name, ifsc_code, account_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          upi_id = VALUES(upi_id),
          bank_name = VALUES(bank_name),
          branch_name = VALUES(branch_name),
          ifsc_code = VALUES(ifsc_code),
          account_number = VALUES(account_number),
          updated_at = NOW()`,
      [
        user_id,
        user_name,
        upi_id,
        bank_name,
        branch_name,
        ifsc_code,
        account_number,
      ]
    );
    res.json({ status: "success", message: "Bank/UPI details saved" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET bank/payment details for an agent
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) {
    return res
      .status(400)
      .json({ status: "error", message: "agent_id required" });
  }
  try {
    const [rows] = await db.query(
      `SELECT * FROM user_payment_details WHERE user_id = ? LIMIT 1`,
      [user_id]
    );
    if (rows.length === 0) {
      return res.json({ status: "empty", data: null });
    }
    res.json({ status: "success", data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
