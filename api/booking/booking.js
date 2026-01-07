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
    staff_id,
    staff_name,
    service_at,
    address,
    user_id,
    user_name,
    user_mobile,
    user_email,
    date,
    time,
    specialist,
    booked_services,
    booked_packages,
    payment_id,
    payment_method,
    total_price,
    notes,
    coupon_code,
  } = req.body;

  if (!user_id || user_id <= 0)
    return res
      .status(400)
      .json({ status: "error", message: "Invalid user_id" });

  if (!staff_id || !staff_name || !service_at || !address || !date || !time)
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields" });

  let conn;

  try {
    conn = await pool.getConnection();
    // Verify user exists
    const [userRows] = await conn.execute("SELECT id FROM users WHERE id = ?", [
      user_id,
    ]);
    if (userRows.length === 0)
      return res
        .status(400)
        .json({ status: "error", message: "User not found" });

    // -- Verify user exists and get expo_push_token --
    const [usersRows] = await conn.execute(
      "SELECT id, expo_push_token FROM users WHERE id = ?",
      [user_id]
    );
    if (usersRows.length === 0)
      return res
        .status(400)
        .json({ status: "error", message: "User not found" });

    const userPushToken = usersRows[0].expo_push_token;

    // Verify staff exists with matching id and name
    const [staffRows] = await conn.execute(
      "SELECT id FROM staffs WHERE id = ? AND name = ?",
      [staff_id, staff_name]
    );
    if (staffRows.length === 0)
      return res
        .status(400)
        .json({ status: "error", message: "Staff not found or name mismatch" });

    await conn.beginTransaction();

    const safeValue = (val) => (val === undefined ? null : val);

    const insertSql = `
  INSERT INTO demobookings 
  (staff_id, staff_name, service_at, address, user_id, user_name, user_mobile,
   date, time, specialist, booked_services, booked_packages,total_price, notes, status, created_at, payment_id,payment_method ,couponcode
   )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?,?);
`;

    const [result] = await conn.execute(insertSql, [
      safeValue(staff_id),
      safeValue(staff_name),
      safeValue(service_at),
      safeValue(address),
      safeValue(user_id),
      safeValue(user_name),
      safeValue(user_mobile),
      safeValue(date),
      safeValue(time),
      JSON.stringify(specialist) || null,
      JSON.stringify(booked_services) || null,
      JSON.stringify(booked_packages) || null,
      safeValue(total_price), // new
      safeValue(notes),
      "upcoming",
      new Date(),
      safeValue(payment_id),
      safeValue(payment_method),
      safeValue(coupon_code),
    ]);

    const insertedId = result.insertId;
    const booking_code = `Bkg${String(insertedId).padStart(4, "0")}`;
    const receipt_id = `REC-${String(insertedId).padStart(9, "0")}`;

    const updateSql = `UPDATE demobookings SET booking_code = ?, receipt_id = ? WHERE id = ?`;
    await conn.execute(updateSql, [booking_code, receipt_id, insertedId]);

    // Notification details
    const formattedTime = formatTo12Hour(time);

    const notifMessage = `💸 Payment Received! Your payment for booking (${booking_code}) of ₹${total_price} on ${date} at ${formattedTime} is successful. The agent will now confirm this booking from their side. Thank you for choosing Feminiq!`;
    const notifType = "payment";

    // 1. Save notification to notification table WITH TYPE
    await conn.execute(
      "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?)",
      [user_id, notifMessage, notifType, 0, new Date()]
    );

    // 2. Send push notification if token available
    if (userPushToken) {
      await sendBookingPushNotification(
        userPushToken,
        "Payment Successful 💸",
        notifMessage,
        { booking_code, date, time, total_price }
      );
    } else {
      console.warn("No expo_push_token found for user, not sending push.");
    }

    await conn.commit();
    conn.release();

    res.json({ status: "success", booking_code, receipt_id });

    const userEmail = user_email; // from req.body, ensure email is passed in request

    if (userEmail) {
      try {
        const receiptUrl = `https://femiiniq-backend.onrender.com/receipt/${receipt_id}`; // Adjust PORT and path accordingly

        const response = await axios.get(receiptUrl, {
          responseType: "arraybuffer",
        });

        const pdfBuffer = response.data;
        const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

        const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <img src="../../assets/logo.png" alt="Company Logo" style="max-width:150px; margin-bottom:20px;" />
          <h2>Booking Confirmation - ${booking_code}</h2>
          <p>Dear ${user_name},</p>
          <p>Thank you for your booking with Feminiq. Please find your booking receipt attached.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li><strong>Booking Code:</strong> ${booking_code}</li>
            <li><strong>Receipt ID:</strong> ${receipt_id}</li>
            <li><strong>Service Date & Time:</strong> ${date} at ${time}</li>
            <li><strong>Staff:</strong> ${staff_name}</li>
            <li><strong>Location:</strong> ${service_at} - ${address}</li>
            <li><strong>Total Price:</strong> ₹${total_price}</li>
          </ul>
          <p>We look forward to serving you!</p>
          <p>Best regards,<br/>Feminiq Team</p>
        </div>
    `;

        // Send email with attachment using Resend
        await resend.emails.send({
          from: "Feminiq <feminiq@resend.dev>",
          to: userEmail,
          subject: `Booking Confirmation - ${booking_code}`,
          html: emailHtml,
          attachments: [
            {
              filename: `${receipt_id}.pdf`,
              content: pdfBase64,
              encoding: "base64",
              contentType: "application/pdf",
            },
          ],
        });
        console.log("Booking confirmation email sent to", userEmail);
      } catch (emailErr) {
        console.error("Error sending booking confirmation email:", emailErr);
      }
    }
  } catch (error) {
    if (conn) await conn.rollback();
    if (conn) conn.release();
    console.error("Booking creation error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to create booking" });
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
  let conn;

  try {
    conn = await pool.getConnection();

    await conn.execute(`
      UPDATE demobookings
      SET status = 'completed'
      WHERE status = 'upcoming'
        AND (
          date < CURDATE()
          OR (date = CURDATE() AND STR_TO_DATE(time, '%H:%i:%s') <= CURTIME())
        )
        AND user_id = ?;
    `, [userId]);

    const [bookings] = await conn.execute(`
      SELECT d.*, s.image AS staff_image, s.mobile_image_url AS staff_mobile_image_url,
        rr.status AS reschedule_status,
        rr.reason AS reschedule_reason
      FROM demobookings d
      JOIN staffs s ON d.staff_id = s.id
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
      ) rr ON d.id = rr.booking_id
      WHERE d.user_id = ?
      ORDER BY d.date DESC, d.time DESC
    `, [userId]);

    const parsedBookings = bookings.map(b => ({
      ...b,
      specialist: safeParse(b.specialist, null),
      booked_services: safeParse(b.booked_services, []),
      booked_packages: safeParse(b.booked_packages, []),
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
      "SELECT * FROM demobookings WHERE booking_code = ?",
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
