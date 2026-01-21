const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// GET /api/booking/available-slots - Fetch available slots for booking
router.get("/", async (req, res) => {
    const { agent_id, date, service_duration } = req.query;

    if (!agent_id || !date) {
        return res.status(400).json({
            status: "error",
            message: "agent_id and date are required"
        });
    }

    const finalServiceDuration = parseInt(service_duration) || 60;

    try {
        // Fetch available slots with capacity information
        const [slots] = await db.query(`
      SELECT 
        a.start_time,
        a.end_time,
        b.total_capacity,
        b.booked_count,
        (b.total_capacity - b.booked_count) as available_capacity
      FROM availability_slots a
      INNER JOIN booking_slots b 
        ON a.agent_id = b.agent_id 
        AND a.date = b.date 
        AND a.start_time = b.start_time
      WHERE a.agent_id = ?
        AND a.date = ?
        AND a.is_available = TRUE
        AND b.booked_count < b.total_capacity
        AND a.date >= CURDATE()
      ORDER BY a.start_time ASC
    `, [agent_id, date]);

        // Filter out past time slots if date is today
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        const filteredSlots = slots.filter(slot => {
            if (date !== today) return true;

            // Parse start_time to minutes
            const [hours, minutes] = slot.start_time.split(':').map(Number);
            const slotTimeMinutes = hours * 60 + minutes;

            return slotTimeMinutes > currentTimeMinutes;
        });

        // Format times to 12-hour format for display
        const formattedSlots = filteredSlots.map(slot => {
            const formatTime = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
            };

            return {
                start_time: slot.start_time,
                end_time: slot.end_time,
                display_time: formatTime(slot.start_time),
                available_capacity: slot.available_capacity,
                total_capacity: slot.total_capacity,
                is_limited: slot.total_capacity > 1 && slot.available_capacity <= 2
            };
        });

        res.json({
            status: "success",
            date: date,
            slots: formattedSlots,
            total_slots: formattedSlots.length
        });
    } catch (error) {
        console.error("Error fetching available slots:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch available slots",
            slots: []
        });
    }
});

module.exports = router;
