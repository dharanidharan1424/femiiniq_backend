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
    const [bookingRows] = await conn.execute(
      "SELECT * FROM demobookings WHERE receipt_id = ?",
      [receiptId]
    );
    if (bookingRows.length === 0)
      return res.status(404).send("Receipt not found");
    booking = bookingRows[0];

    booking.booked_services =
      typeof booking.booked_services === "string" &&
        booking.booked_services.length > 0
        ? JSON.parse(booking.booked_services)
        : booking.booked_services || [];
    booking.booked_packages =
      typeof booking.booked_packages === "string" &&
        booking.booked_packages.length > 0
        ? JSON.parse(booking.booked_packages)
        : booking.booked_packages || [];
    booking.specialist =
      typeof booking.specialist === "string" && booking.specialist.length > 0
        ? JSON.parse(booking.specialist)
        : booking.specialist || {};

    const [staffRows] = await conn.execute(
      "SELECT * FROM staffs WHERE id = ?",
      [booking.staff_id]
    );
    staff = staffRows[0];
    const [userRows] = await conn.execute("SELECT * FROM users WHERE id = ?", [
      booking.user_id,
    ]);
    user = userRows[0];
  } finally {
    conn.release();
  }

  const [serviceCategoriesRows] = await pool.query(
    "SELECT id, name FROM service_categories"
  );
  const serviceCategoryMap = {};
  serviceCategoriesRows.forEach((r) => {
    serviceCategoryMap[r.id] = r.name;
  });

  const couponPercent = 20;
  const platformPercent = 5;
  const totalPrice = Number(booking.total_price);
  const discountAmount = Math.round(totalPrice * (couponPercent / 100));
  const platformFee = Math.round(
    (totalPrice - discountAmount) * (platformPercent / 100)
  );
  const finalAmount = totalPrice - discountAmount + platformFee;

  const services = [...booking.booked_services, ...booking.booked_packages].map(
    (item) => ({
      quantity: item.quantity,
      name: item.name,
      type: serviceCategoryMap[item.service_id] || "Service",
      unit_price: formatINR(item.price),
      amount: formatINR(item.price * item.quantity),
    })
  );

  const data = {
    receipt_id: booking.receipt_id,
    date: formatDate(booking.date),
    time: formatTime12h(booking.time),
    appointment_location: `${booking.service_at} - ${booking.address}`,
    user_name: user?.fullname || booking.user_name,
    user_address: user?.address || booking.address,
    user_phone: user?.mobile || booking.user_mobile,
    user_email: user?.email,
    staff_name: staff?.name || booking.staff_name,
    staff_address: staff?.address || "",
    staff_id: staff?.id || "",
    staff_phone: staff?.mobile || "",
    services,
    subtotal: formatINR(totalPrice),
    discount: formatINR(discountAmount),
    platform_fee: formatINR(platformFee),
    total: formatINR(finalAmount),
    payment_method: booking.payment_id ? "Online" : "Not Provided",
    generated_on: new Date().toLocaleString("en-IN"),
  };

  const pdfBuffer = await generateReceiptPDF(data);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename=${data.receipt_id}.pdf`,
    "Content-Length": pdfBuffer.length,
  });
  res.send(pdfBuffer);
});

module.exports = router;
