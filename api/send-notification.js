const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");
const { Expo } = require("expo-server-sdk");
const expo = new Expo();

async function sendBookingPushNotification(
  expoPushToken,
  title,
  body,
  data = {}
) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error("Invalid Expo push token.", expoPushToken);
    return;
  }
  try {
    const receipts = await expo.sendPushNotificationsAsync([
      {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
        channelId: "default",
      },
    ]);
    console.log("Expo push notification receipts:", receipts);
  } catch (err) {
    console.error("Error sending push notification:", err);
  }
}

// GET /notifications/:userId - Retrieve notifications for a user
router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  const conn = await pool.getConnection();

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const [rows] = await conn.execute(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    res.json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch notifications",
    });
  }
});

// POST /offers - send offer notifications to all users with valid tokens
router.post("/offers", async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing title or body" });
  }

  const conn = await pool.getConnection();

  try {
    const [users] = await conn.execute(
      "SELECT id, expo_push_token FROM users WHERE expo_push_token IS NOT NULL"
    );

    console.log("Users fetched for notification:", users);

    if (users.length === 0) {
      conn.release();
      return res.json({
        status: "success",
        message: "No users with valid push tokens",
      });
    }

    const pushTokens = users.map((u) => u.expo_push_token);

    const chunks = [];
    for (let i = 0; i < pushTokens.length; i += 100) {
      chunks.push(pushTokens.slice(i, i + 100));
    }

    // Send push notifications batch-wise
    for (const tokensChunk of chunks) {
      const messages = tokensChunk.map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data: { type: "offer" },
      }));

      try {
        const receipts = await expo.sendPushNotificationsAsync(messages);
        console.log("Sent notification batch, receipts:", receipts);
      } catch (err) {
        console.error("Error sending notification batch:", err);
      }
    }

    // Insert notifications in DB for all users WITH type = 'offer'
    for (const user of users) {
      await conn.execute(
        "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
        [user.id, body, "offer", 0, new Date()]
      );
    }

    conn.release();
    res.json({
      status: "success",
      message: "Offer notifications sent and stored in DB",
    });
  } catch (error) {
    conn.release();
    console.error("Error in sending offer notifications:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to send offer notifications" });
  }
});

// POST /default-reminder - send daily profile update reminder to users missing mobile or address
router.post("/default-reminder", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [users] = await conn.execute(
      `SELECT id, expo_push_token, fullname, mobile, address, name FROM users 
        WHERE (mobile IS NULL OR mobile = '') 
          OR (address IS NULL OR address = '')
          AND expo_push_token IS NOT NULL`
    );

    console.log("Users fetched for profile reminder:", users);

    if (users.length === 0) {
      conn.release();
      return res.json({ status: "success", message: "No users need reminder" });
    }

    for (const user of users) {
      const title = "Update Your Profile 📢";
      let body = `Hi ${user.fullname}, please update your profile for a better experience.`;

      if (!user.mobile && user.address) {
        body = `Hi ${user.fullname}, please update your mobile number for a better experience.`;
      } else if (!user.address && user.mobile) {
        body = `Hi ${user.fullname}, please update your address for a better experience.`;
      }

      // Now insert with type
      await conn.execute(
        "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
        [user.id, body, "reminder", 0, new Date()]
      );

      if (user.expo_push_token) {
        await sendBookingPushNotification(user.expo_push_token, title, body, {
          type: "reminder",
        });
      }
    }

    conn.release();
    res.json({
      status: "success",
      message: `Notifications sent to ${users.length} users.`,
    });
  } catch (error) {
    conn.release();
    console.error("Error sending default reminders:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to send default reminders" });
  }
});

// Remind me api route
router.post("/toggle-booking-reminder", async (req, res) => {
  const { bookingId, enabled } = req.body;
  if (typeof enabled !== "boolean" || !bookingId) {
    return res.status(400).json({ status: "error", message: "Invalid params" });
  }

  const conn = await pool.getConnection();
  try {
    // Convert JS boolean to MySQL integer 0/1
    const value = enabled ? 1 : 0;
    await conn.execute(
      "UPDATE demobookings SET reminder_enabled = ? WHERE id = ?",
      [value, bookingId]
    );
    conn.release();
    res.json({
      status: "success",
      message: `Booking reminder ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (err) {
    conn.release();
    res
      .status(500)
      .json({ status: "error", message: "Failed to update booking reminder" });
  }
});

// POST /booking-reminder - send daily reminder about the bookings which reminder is enabled
router.post("/booking-reminder", async (req, res) => {
  console.log("Running booking reminders via API trigger");
  const conn = await pool.getConnection();
  try {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const [bookings] = await conn.execute(
      `SELECT *
       FROM demobookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.reminder_enabled = TRUE
         AND u.expo_push_token IS NOT NULL
         AND DATE(b.time) >= ?`,
      [todayDate]
    );

    for (const booking of bookings) {
      const appointmentDateStr = new Date(booking.date).toLocaleDateString();
      const title = "Booking Reminder ⏰";
      const body = `Hi ${booking.fullname}, your appointment is on ${appointmentDateStr}. Please be prepared!`;

      // Insert with type "booking_reminder"
      await conn.execute(
        "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
        [booking.user_id, body, "reminder", 0, new Date()]
      );

      await sendBookingPushNotification(booking.expo_push_token, title, body, {
        type: "reminder",
        bookingId: booking.id,
      });
    }
    conn.release();
    res.json({ status: "success", message: "Booking reminders sent" });
  } catch (error) {
    conn.release();
    console.error("Error sending booking reminders:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to send booking reminders" });
  }
});

router.post("/mark-all-read", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ status: "error", message: "Missing userId" });
  }
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [userId]
    );
    conn.release();
    res.json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (err) {
    conn.release();
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to mark all as read" });
  }
});

router.get("/unread-count/:userId", async (req, res) => {
  const userId = req.params.userId;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0",
      [userId]
    );
    conn.release();
    res.json({ status: "success", unreadCount: rows[0].unreadCount });
  } catch (err) {
    conn.release();
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to get unread count" });
  }
});

module.exports = router;
