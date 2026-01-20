const express = require("express");
const pool = require("../../config/db.js");
const generateReceiptPDF = require("../../utils/generateReceiptPDF.js");

const router = express.Router();

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}
function formatDate(input) {
  if (!input) return "";
  if (input instanceof Date) input = input.toISOString().split("T")[0];
  const [year, month, day] = input.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
}
function formatTime12h(time24) {
  if (!time24) return "";
  let [hour, min] = time24.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}

router.get("/:receiptId", async (req, res) => {
  const { receiptId } = req.params;

  const conn = await pool.getConnection();
  let booking, staff, user;
  try {
    // Query actual bookings table by order_id or id
    const [bookingRows] = await conn.execute(
      "SELECT * FROM bookings WHERE order_id = ? OR id = ?",
      [receiptId, receiptId]
    );
    if (bookingRows.length === 0)
      return res.status(404).send("Receipt not found");
    booking = bookingRows[0];

    // Parse services json
    booking.services =
      typeof booking.services === "string" && booking.services.length > 0
        ? JSON.parse(booking.services)
        : booking.services || [];

    // Safe parse specialist
    booking.specialist =
      typeof booking.specialist === "string" && booking.specialist.length > 0
        ? JSON.parse(booking.specialist)
        : booking.specialist || {};

    // Get staff info
    // booking.agent_id is consistently used in booking.js
    if (booking.agent_id) {
      const [staffRows] = await conn.execute(
        "SELECT * FROM agents WHERE id = ?", // agents table used in booking.js
        [booking.agent_id]
      );
      staff = staffRows[0];
    }

    // Get user info
    const [userRows] = await conn.execute("SELECT * FROM users WHERE id = ?", [
      booking.user_id,
    ]);
    user = userRows[0];
  } catch (e) {
    console.error("Receipt fetch error:", e);
    return res.status(500).send("Error fetching receipt");
  } finally {
    conn.release();
  }

  // Service categories mapping (optional if data already has names)
  let serviceCategoryMap = {};
  try {
    const [serviceCategoriesRows] = await pool.query(
      "SELECT id, name FROM service_categories"
    );
    serviceCategoriesRows.forEach((r) => {
      serviceCategoryMap[r.id] = r.name;
    });
  } catch (e) {
    console.log("Service categories fetch error (non-critical):", e.message);
  }

  const couponPercent = 20;
  const platformPercent = 5;
  const totalPrice = Number(booking.totalprice || booking.total_price || 0);

  // Use stored values if available, else calc
  const discountAmount = Number(booking.discountprice || Math.round(totalPrice * (couponPercent / 100)));
  const platformFee = Number(booking.platformfee || Math.round((totalPrice - discountAmount) * (platformPercent / 100)));
  const finalAmount = Number(booking.finalprice || (totalPrice - discountAmount + platformFee));

  // Map services for PDF
  const services = booking.services.map(
    (item) => ({
      quantity: item.quantity,
      name: item.name,
      type: item.type || (serviceCategoryMap[item.service_id] || "Service"),
      unit_price: formatINR(item.price),
      amount: formatINR(item.price * item.quantity),
    })
  );

  const data = {
    receipt_id: booking.order_id || booking.id, // Use order_id as receipt id
    date: formatDate(booking.booking_date || booking.date),
    time: formatTime12h(booking.booking_time || booking.time),
    appointment_location: `${booking.address || ''}`, // Combined address
    user_name: user?.fullname || user?.name || booking.user_name || "Guest",
    user_address: user?.address || booking.address || "",
    user_phone: user?.mobile || booking.user_mobile || "",
    user_email: user?.email || "",
    staff_name: staff?.name || booking.agent_name || booking.staffname || "Feminiq Staff",
    staff_address: staff?.address || "",
    staff_id: staff?.id || booking.agent_id || "",
    staff_phone: staff?.mobile || "",
    services,
    subtotal: formatINR(totalPrice),
    discount: formatINR(discountAmount),
    platform_fee: formatINR(platformFee),
    total: formatINR(finalAmount),
    payment_method: booking.payment_type || booking.payment_method || "Online",
    generated_on: new Date().toLocaleString("en-IN"),
  };

  try {
    const pdfBuffer = await generateReceiptPDF(data);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=${data.receipt_id}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (pdfError) {
    console.error("PDF Generation Error:", pdfError);
    res.status(500).send("Error generating PDF");
  }
});

module.exports = router;
