const express = require("express");
const router = express.Router();
const pool = require("../../config/db.js");
const axios = require("axios");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
const { Expo } = require("expo-server-sdk");
const expo = new Expo();

function formatTo12Hour(time24) {
  // time24 like "15:30" or "09:05"
  const [hourStr, minuteStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr.padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

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
    console.error(expoPushToken);
    console.log("Expo push notification receipts:", receipts);
  } catch (err) {
    console.error("Error sending push notification:", err);
  }
}

// --- Create booking ---
router.post("/", async (req, res) => {
  console.log("Booking request body:", req.body);
  const {
    order_id,
    payment_id,
    user_id,
    agent_id,
    agent_name,
    booking_date,
    booking_time,
    staffname,
    address,
    location,
    services,
    category_id,
    service_id,
    image,
    status,
    paid_at,
    note,
    cancel_reason,
    reschedule_date,
    reschedule_reason,
    reschedule_status,
    discountprice,
    coupon_discount,
    platformfee,
    totalprice,
    finalprice,
    payment_method,
    payment_type,
    amount,
    personal_note,
    booking_status,
    couponcode,
    artist_platform_fee,
    start_otp,
    complete_otp,
    is_started,
    is_completed,
    remaining_amount,
    payment_status,
    paid_amount,
  } = req.body;

  if (!user_id || user_id <= 0)
    return res
      .status(400)
      .json({ status: "error", message: "Invalid user_id" });

  // Check required fields and log which ones are missing
  const requiredFields = {
    agent_id,
    agent_name,
    address,
    booking_date,
    booking_time,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    console.error("Missing required fields:", missingFields);
    console.error("Received values:", requiredFields);
    return res
      .status(400)
      .json({
        status: "error",
        message: "Missing required fields",
        missing: missingFields,
        received: requiredFields
      });
  }

  // Log location value for debugging
  console.log("📍 Location value:", {
    location,
    type: typeof location,
    length: location?.length,
    charCodes: location ? Array.from(location).map(c => c.charCodeAt(0)) : null
  });

  let conn;

  try {
    conn = await pool.getConnection();

    // Verify user exists and get expo_push_token
    const [usersRows] = await conn.execute(
      "SELECT id, expo_push_token FROM users WHERE id = ?",
      [user_id]
    );
    if (usersRows.length === 0)
      return res
        .status(400)
        .json({ status: "error", message: "User not found" });

    const userPushToken = usersRows[0].expo_push_token;

    // Verify agent exists (optional - only if agent_id is a valid number)
    if (agent_id && !isNaN(agent_id) && agent_name && agent_name !== "Unknown Staff") {
      const [agentRows] = await conn.execute(
        "SELECT id FROM agents WHERE id = ?",
        [agent_id]
      );
      if (agentRows.length === 0) {
        console.warn(`⚠️ Agent ID ${agent_id} not found in agents table, proceeding anyway`);
      }
    }

    await conn.beginTransaction();

    const safeValue = (val) => (val === undefined ? null : val);

    // Generate ID manually since the table doesn't have AUTO_INCREMENT
    const [maxIdResult] = await conn.execute(
      "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM bookings"
    );
    const nextId = maxIdResult[0].next_id;

    // Log database info for debugging
    const [dbInfo] = await conn.execute("SELECT DATABASE() as db_name");
    console.log("📊 Database info:", {
      database: dbInfo[0].db_name,
      nextId: nextId,
      user_id: user_id,
      agent_id: agent_id
    });

    const insertSql = `
  INSERT INTO bookings 
  (id, order_id, payment_id, user_id, agent_id, agent_name, booking_date, booking_time, 
   staffname, address, location, services, category_id, service_id, image, 
   status, paid_at, note, cancel_reason, reschedule_date, reschedule_reason, 
   reschedule_status, discountprice, coupon_discount, platformfee, totalprice, 
   finalprice, payment_method, payment_type, amount, personal_note, booking_status, 
   couponcode, artist_platform_fee, start_otp, complete_otp, is_started, 
   is_completed, remaining_amount, payment_status, paid_amount, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

    const [result] = await conn.execute(insertSql, [
      nextId, // Manually generated ID
      safeValue(order_id),
      safeValue(payment_id),
      safeValue(user_id),
      safeValue(agent_id),
      safeValue(agent_name),
      safeValue(booking_date),
      safeValue(booking_time),
      safeValue(staffname || agent_name),
      safeValue(address),
      safeValue(location),
      typeof services === 'string' ? services : JSON.stringify(services) || null,
      safeValue(category_id),
      safeValue(service_id),
      safeValue(image),
      safeValue(status || "upcoming"),
      safeValue(paid_at || new Date()),
      safeValue(note),
      safeValue(cancel_reason),
      safeValue(reschedule_date),
      safeValue(reschedule_reason),
      safeValue(reschedule_status),
      safeValue(discountprice || 0),
      safeValue(coupon_discount || 0),
      safeValue(platformfee || 0),
      safeValue(totalprice),
      safeValue(finalprice || totalprice),
      safeValue(payment_method),
      safeValue(payment_type || "online"),
      safeValue(amount || totalprice),
      safeValue(personal_note),
      safeValue(booking_status || "confirmed"),
      safeValue(couponcode),
      safeValue(artist_platform_fee || 0),
      safeValue(start_otp),
      safeValue(complete_otp),
      safeValue(is_started || 0),
      safeValue(is_completed || 0),
      safeValue(remaining_amount || 0),
      safeValue(payment_status || "paid"),
      safeValue(paid_amount || totalprice),
      new Date(),
      new Date(), // updated_at
    ]);

    const insertedId = nextId; // Use the manually generated ID

    console.log("✅ INSERT executed, result:", {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      nextId: nextId
    });

    // Verify the booking was actually inserted
    const [verifyRows] = await conn.execute(
      "SELECT id FROM bookings WHERE id = ?",
      [nextId]
    );

    if (verifyRows.length === 0) {
      throw new Error(`Booking INSERT failed - no row found with id ${nextId}`);
    }

    console.log("✅ Booking verified in database with id:", nextId);

    // Commit the booking transaction FIRST before notifications
    await conn.commit();
    console.log("✅ Booking transaction committed successfully");

    // Notification details (do this AFTER commit so it doesn't cause rollback)
    const formattedTime = formatTo12Hour(booking_time);
    const notifMessage = `💸 Payment Received! Your payment for booking (#${insertedId}) of ₹${totalprice} on ${booking_date} at ${formattedTime} is successful. The agent will now confirm this booking from their side. Thank you for choosing Feminiq!`;
    const notifType = "payment";

    // Try to save notification (don't let this fail the booking)
    try {
      await conn.execute(
        "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
        [user_id, notifMessage, notifType, 0, new Date()]
      );
      console.log("✅ Notification saved");
    } catch (notifError) {
      console.error("⚠️ Failed to save notification (non-critical):", notifError.message);
    }

    // Try to send push notification (don't let this fail the booking)
    try {
      if (userPushToken) {
        await sendBookingPushNotification(
          userPushToken,
          "Payment Successful 💸",
          notifMessage,
          { booking_id: insertedId, booking_date, booking_time, totalprice }
        );
        console.log("✅ Push notification sent");
      } else {
        console.warn("No expo_push_token found for user, not sending push.");
      }
    } catch (pushError) {
      console.error("⚠️ Failed to send push notification (non-critical):", pushError.message);
    }

    conn.release();

    res.json({ status: "success", booking_id: insertedId, order_id });
  } catch (error) {
    console.error("❌ Booking creation error:", error);
    if (conn) {
      await conn.rollback();
      console.log("⚠️ Transaction rolled back");
    }
    if (conn) conn.release();
    console.error("Booking creation error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to create booking", details: error.message });
  }
});

function safeParse(value, fallback) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (e) {
    return fallback;
  }
}


// --- Get all bookings for a user with automatic status update ---
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  console.log("📋 Fetching bookings for user:", userId);
  let conn;

  try {
    conn = await pool.getConnection();

    await conn.execute(`
      UPDATE bookings
      SET status = 'completed'
      WHERE status = 'upcoming'
        AND (
          booking_date < CURDATE()
          OR (booking_date = CURDATE() AND STR_TO_DATE(booking_time, '%H:%i:%s') <= CURTIME())
        )
        AND user_id = ?;
    `, [userId]);

    console.log("📊 Executing bookings query for user:", userId);

    const [bookings] = await conn.execute(`
      SELECT b.*, s.image AS staff_image,
        rr.status AS reschedule_status,
        rr.reason AS reschedule_reason
      FROM bookings b
      LEFT JOIN agents s ON b.agent_id = s.id
      LEFT JOIN (
        SELECT r1.booking_id, r1.status, r1.reason, r1.requested_at
        FROM reschedule_requests r1
        INNER JOIN (
          SELECT booking_id, MAX(requested_at) AS max_requested_at
          FROM reschedule_requests
          GROUP BY booking_id
        ) r2
        ON r1.booking_id = r2.booking_id
        AND r1.requested_at = r2.max_requested_at
      ) rr ON b.id = rr.booking_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `, [userId]);

    console.log(`✅ Found ${bookings.length} bookings for user ${userId}`);
    if (bookings.length > 0) {
      console.log("📝 First booking:", {
        id: bookings[0].id,
        booking_date: bookings[0].booking_date,
        status: bookings[0].status
      });
    }

    const parsedBookings = bookings.map(b => ({
      ...b,
      // Parse services JSON field
      services: safeParse(b.services, []),
    }));

    res.status(200).json({
      status: "success",
      bookings: parsedBookings
    });

  } catch (error) {
    console.error("User bookings fetch error:", error);
    res.status(500).json({
      status: "error",
      bookings: [],
      message: "Failed to fetch user bookings"
    });
  } finally {
    if (conn) conn.release();
  }
});

// --- Get booking details by booking_code ---
router.get("/:bookingCode", async (req, res) => {
  const { bookingCode } = req.params;


  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      "SELECT * FROM bookings WHERE booking_code = ?",
      [bookingCode]
    );
    conn.release();

    if (rows.length === 0)
      return res
        .status(404)
        .json({ status: "error", message: "Booking not found" });

    const booking = rows[0];

    booking.specialist =
      typeof booking.specialist === "string"
        ? JSON.parse(booking.specialist)
        : booking.specialist;
    booking.booked_services =
      typeof booking.booked_services === "string"
        ? JSON.parse(booking.booked_services)
        : booking.booked_services;
    booking.booked_packages =
      typeof booking.booked_packages === "string"
        ? JSON.parse(booking.booked_packages)
        : booking.booked_packages;

    res.json({ status: "success", booking });
  } catch (error) {
    conn.release();
    console.error("Booking fetch error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch booking" });
  }
});




// POST /booking/reschedule-request
// Create a new reschedule request
router.post("/reschedule-request", async (req, res) => {
  const { booking_id, requested_date, requested_time, reason } = req.body;

  if (!booking_id || !requested_date || !requested_time) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields" });
  }


  try {
    const conn = await pool.getConnection();
    // Insert a new pending reschedule request
    await conn.execute(
      `INSERT INTO reschedule_requests (booking_id, requested_date, requested_time, reason, status, requested_at) VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [booking_id, requested_date, requested_time, reason]
    );

    const notifMessage = `⏰ Reschedule Requested! Your reschedule request for booking (${booking_id}) on ${requested_date} at ${formatTo12Hour(
      requested_time
    )} has been submitted. Awaiting approval from the agent/system.`;
    const notifType = "reschedule-request";

    // Assume you know user_id associated with booking_id (fetch if needed)
    const [bookingRows] = await conn.execute(
      "SELECT user_id FROM demobookings WHERE id = ?",
      [booking_id]
    );
    const userIdForNotif =
      bookingRows.length > 0 ? bookingRows[0].user_id : null;

    if (userIdForNotif) {
      await conn.execute(
        "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
        [userIdForNotif, notifMessage, notifType, 0, new Date()]
      );
    }

    res.json({ status: "success", message: "Reschedule request submitted" });

    // Simulate approval/rejection after 10 minutes asynchronously (do not block response)
    setTimeout(async () => {
      const decisionConn = await pool.getConnection();
      try {
        const isApproved = Math.random() < 0.5;
        const status = isApproved ? "approved" : "rejected";
        const decision_reason = isApproved
          ? "Auto-approved by system"
          : "Auto-rejected by system";

        // Update the latest pending request with decision
        await decisionConn.execute(
          `UPDATE reschedule_requests SET status = ?, decision_reason = ?, decision_at = NOW()
           WHERE booking_id = ? AND status = 'pending' ORDER BY requested_at DESC LIMIT 1`,
          [status, decision_reason, booking_id]
        );

        // If approved, update the original booking with new date and time
        if (isApproved) {
          await decisionConn.execute(
            `UPDATE demobookings SET date = ?, time = ? WHERE id = ?`,
            [requested_date, requested_time, booking_id]
          );
        }
      } catch (err) {
        console.error("Error in delayed reschedule approval task:", err);
      } finally {
        decisionConn.release();
      }
    }, 10 * 60 * 1000); // 10 minutes delay
  } catch (error) {
    conn.release();
    console.error("Reschedule request error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to submit reschedule request",
    });
  } finally {
    conn.release();
  }
});

// --- Cancel Pending Reschedule Request ---
router.post("/reschedule-cancel/:bookingId", async (req, res) => {
  const bookingId = req.params.bookingId;
  if (!bookingId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing booking ID" });
  }


  try {
    const conn = await pool.getConnection();
    // Mark latest pending reschedule request as cancelled for given booking
    await conn.execute(
      `UPDATE reschedule_requests SET status = 'cancelled', decision_reason = 'Cancelled by user', decision_at = NOW()
       WHERE booking_id = ? AND status = 'pending'`,
      [bookingId]
    );

    res.json({
      status: "success",
      message: "Pending reschedule request cancelled",
    });
  } catch (err) {
    console.error("Cancel reschedule request error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to cancel reschedule request",
    });
  } finally {
    conn.release();
  }
});

// Cancel Booking API
router.post("/cancel", async (req, res) => {
  const { booking_code } = req.body;


  try {
    const conn = await pool.getConnection();
    // Update booking status to cancelled and disable reminders
    const [result] = await conn.execute(
      `UPDATE demobookings SET status = 'cancelled', reminder_enabled = 0 WHERE booking_code = ?`,
      [booking_code]
    );

    if (result.affectedRows === 0) {
      conn.release();
      return res
        .status(404)
        .json({ status: "error", message: "Booking not found" });
    }

    // Get user details and total price
    const [rows] = await conn.execute(
      `SELECT d.user_id, d.user_name, d.date, d.time, d.total_price, u.expo_push_token 
       FROM demobookings d JOIN users u ON d.user_id = u.id WHERE d.booking_code = ?`,
      [booking_code]
    );

    if (rows.length === 0) {
      conn.release();
      return res
        .status(404)
        .json({ status: "error", message: "Booking not found" });
    }

    const booking = rows[0];

    // Calculate refund percent and amount based on time
    const now = new Date();

    const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
    const msIn24Hours = 24 * 60 * 60 * 1000;
    let refundPercent = 100;

    if (bookingDateTime - now <= msIn24Hours && bookingDateTime - now > 0) {
      refundPercent = 80;
    }

    const refundAmount = Math.round(
      (booking.total_price * refundPercent) / 100
    );

    // Prepare notification message with refund info and timeline
    const bookingDateFormatted = new Date(booking.date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

    const formattedTime = formatTo12Hour(booking.time);
    let cancelMessage = `❌ Hi ${booking.user_name}, your booking (${booking_code}) scheduled for ${bookingDateFormatted} at ${formattedTime} has been cancelled. `;

    if (refundPercent === 80) {
      cancelMessage += `According to the policy, only 80% refund will be processed as the booking time is within 24 hours. You will receive ₹${refundAmount}. `;
    } else {
      cancelMessage += `You will receive a full refund of ₹${refundAmount}. `;
    }

    cancelMessage += `The refund will be processed within 3-5 business days.`;

    // Insert notification in DB
    try {
      await conn.execute(
        "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
        [booking.user_id, cancelMessage, "cancel", 0, new Date()]
      );
    } catch (notifErr) {
      console.error("Notification insert failed:", notifErr);
    }

    // Send push notification
    if (booking.expo_push_token) {
      await sendBookingPushNotification(
        booking.expo_push_token,
        "Booking Cancelled ❌",
        cancelMessage,
        { booking_code, date: booking.date, time: formattedTime, refundAmount }
      );
    }

    conn.release();

    res.json({
      status: "success",
      message:
        "Booking cancelled, reminders disabled, notification and refund info sent",
      refundPercent,
      refundAmount,
      refundTimeline: "3-5 business days",
    });
  } catch (error) {
    conn.release();
    console.error("Cancel booking error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to cancel booking" });
  }
});
module.exports = router;
