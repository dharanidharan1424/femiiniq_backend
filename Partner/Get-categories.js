const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb"); // Ensure this path matches your db config

router.get("/", async (req, res) => {
    try {
        const [categories] = await db.query("SELECT id, name FROM categories ORDER BY name ASC");

        // Format for frontend if needed (e.g., label/value for dropdowns)
        const formatted = categories.map(cat => ({
            label: cat.name,
            value: cat.id
        }));

        res.json({
            status: "success",
            data: formatted,
            raw: categories
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ status: "error", message: "Failed to fetch categories" });
    }
});

module.exports = router;
