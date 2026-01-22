const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// GET specialists for a specific shop
router.get("/:shop_id", async (req, res) => {
    const { shop_id } = req.params;

    if (!shop_id) {
        return res.status(400).json({
            status: "error",
            message: "shop_id is required"
        });
    }

    try {
        const [specialists] = await db.query(
            "SELECT * FROM staffs WHERE shop_id = ?",
            [shop_id]
        );

        return res.json({
            status: "success",
            specialists: specialists
        });
    } catch (error) {
        console.error("Error fetching specialists:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch specialists"
        });
    }
});

module.exports = router;
