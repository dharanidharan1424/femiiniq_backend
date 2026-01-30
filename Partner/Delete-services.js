const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js"); // Your MySQL connection (should support promises)

// ✅ DELETE /api/service/delete
router.post("/service", async (req, res) => {
  const { agentId, serviceId } = req.body;

  if (!agentId || !serviceId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agentId or serviceId" });
  }

  try {
    // 1️⃣ Get all upcoming bookings for the agent
    const [bookings] = await db.query(
      `SELECT id, services FROM bookings WHERE status = 'upcoming' AND agent_id = ?`,
      [agentId]
    );

    // 2️⃣ Check if this service exists in any booking's services array
    for (const booking of bookings) {
      let servicesArray = [];
      try {
        servicesArray = JSON.parse(booking.services);
      } catch (e) {
        console.error(
          `Invalid JSON in booking ${booking.id}:`,
          booking.services
        );
        continue;
      }

      const hasService = servicesArray.some(
        (s) => s.type === "service" && String(s.id) === String(serviceId)
      );

      if (hasService) {
        return res.status(400).json({
          status: "error",
          message: "Cannot delete service: it is part of an upcoming booking.",
        });
      }
    }

    // 3️⃣ Proceed to delete from agent_services table
    const [result] = await db.query(
      "DELETE FROM agent_services WHERE agent_id = ? AND id = ?",
      [agentId, serviceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service not found or not owned by agent.",
      });
    }

    return res.json({
      status: "success",
      message: "Service deleted successfully.",
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ status: "error", message: "Database error" });
  }
});

// ✅ DELETE /api/package/delete
router.post("/package", async (req, res) => {
  console.log("called");
  const { agentId, packageId } = req.body;

  if (!agentId || !packageId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agentId or packageId" });
  }

  try {
    // 1️⃣ Get all upcoming bookings for the agent
    const [bookings] = await db.query(
      `SELECT id, services FROM bookings WHERE status = 'upcoming' AND agent_id = ?`,
      [agentId]
    );

    // 2️⃣ Check if this package exists in any booking's services array
    for (const booking of bookings) {
      let servicesArray = [];
      try {
        servicesArray = JSON.parse(booking.services);
      } catch (e) {
        console.error(
          `Invalid JSON in booking ${booking.id}:`,
          booking.services
        );
        continue;
      }

      const hasPackage = servicesArray.some(
        (s) => s.type === "package" && String(s.id) === String(packageId)
      );

      if (hasPackage) {
        return res.status(400).json({
          status: "error",
          message: "Cannot delete package: it is part of an upcoming booking.",
        });
      }
    }

    // 3️⃣ Proceed to delete from agent_packages table
    const [result] = await db.query(
      "DELETE FROM agent_packages WHERE agent_id = ? AND id = ?",
      [agentId, packageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Package not found or not owned by agent.",
      });
    }

    return res.json({
      status: "success",
      message: "Package deleted successfully.",
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ status: "error", message: "Database error" });
  }
});

// ✅ POST /partner/delete/staff → Delete a specialist (specialists table)
router.post("/staff", async (req, res) => {
  const { agentId, staffId } = req.body;

  if (!agentId || !staffId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing agentId or staffId" });
  }

  try {
    // We could check for upcoming bookings that might be assigned to this staff member,
    // but the current system doesn't seem to have a strict staff-booking assignment in the bookings table 'services' JSON.
    // If it did, we'd loop through bookings like we do for services/packages.

    const [result] = await db.query(
      "DELETE FROM specialists WHERE agent_id = ? AND id = ?",
      [agentId, staffId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Specialist not found or not owned by agent.",
      });
    }

    return res.json({
      status: "success",
      message: "Specialist deleted successfully.",
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ status: "error", message: "Database error" });
  }
});

module.exports = router;
