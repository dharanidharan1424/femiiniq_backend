const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Load Poppins font files (download .ttf and put them in /fonts folder of your project)
const poppinsRegular = path.join(__dirname, "../fonts/Poppins-Regular.ttf");
const poppinsBold = path.join(__dirname, "../fonts/Poppins-Bold.ttf");
const poppinsSemiBold = path.join(__dirname, "../fonts/Poppins-SemiBold.ttf");

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

async function generateReceiptPDF(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Register fonts
      doc.registerFont("Poppins", poppinsRegular);
      doc.registerFont("Poppins-Bold", poppinsBold);
      doc.registerFont("Poppins-SemiBold", poppinsSemiBold);

      // ===== Header =====

      const logoPath = path.resolve(__dirname, "..", "assets", "logo.png");
      try {
        doc.image(logoPath, 40, 0, { width: 150 });
      } catch (err) {
        console.warn("Logo could not be loaded, skipping...", err);
      }

      doc
        .font("Poppins")
        .fontSize(11)
        .fillColor("#444")
        .text(
          `123 Your Street\nCity, State ZIP\nPhone: (123) 456-7890\nEmail: support@feminiq.com`,
          350,
          40,
          { align: "right" }
        );

      doc.moveDown(2);
      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .lineWidth(2)
        .strokeColor("#555")
        .stroke();

      doc.font("Poppins-Bold").fontSize(12).fillColor("#000");
      doc.text(`Receipt #: ${data.receipt_id}`, 40, doc.y + 15);
      doc.text(`Date: ${data.date}`, 400, doc.y - 20, { align: "right" });

      // ===== Bill To & Staff Details =====
      // Position and sizing
      doc.moveDown(1);
      const startY = doc.y;

      const leftX = 40;
      const rightX = 300;
      const columnWidth = 259;
      const headerHeight = 24;
      const cellHeight = 18;
      const cellPadding = 10;
      const bodyRowCount = 4; // Number of rows (fields) in each column
      const bodyHeight = bodyRowCount * cellHeight;

      // Header background color (light gray)
      const headerBg = "#F8F8F8";

      // --- Draw headers ---
      doc.rect(leftX, startY, columnWidth, headerHeight).fill(headerBg);

      doc.rect(rightX, startY, columnWidth, headerHeight).fill(headerBg);

      // --- Draw header borders ---
      doc
        .lineWidth(1)
        .strokeColor("#DDD")
        .rect(leftX, startY, columnWidth, headerHeight)
        .stroke();

      doc.rect(rightX, startY, columnWidth, headerHeight).stroke();

      // --- Header texts ---
      doc
        .font("Poppins-SemiBold")
        .fontSize(11)
        .fillColor("#000")
        .text("BILL TO", leftX + cellPadding, startY + 6, {
          width: columnWidth - 2 * cellPadding,
          align: "left",
          lineBreak: false,
        });

      doc.text("STAFF DETAILS", rightX + cellPadding, startY + 6, {
        width: columnWidth - 2 * cellPadding,
        align: "left",
        lineBreak: false,
      });

      // --- Draw body cell borders ---
      const bodyStartY = startY + headerHeight;

      doc
        .lineWidth(1)
        .strokeColor("#DDD")
        .rect(leftX, bodyStartY, columnWidth, bodyHeight)
        .stroke();

      doc.rect(rightX, bodyStartY, columnWidth, bodyHeight).stroke();

      // --- Body cell background (optional, white for exact image look) ---
      doc
        .rect(leftX, bodyStartY, columnWidth, bodyHeight)
        .fillOpacity(1)
        .fill("#fff");
      doc
        .rect(rightX, bodyStartY, columnWidth, bodyHeight)
        .fillOpacity(1)
        .fill("#fff");

      // --- Left column fields (bold field names!) ---
      let yOffset = bodyStartY;
      doc.fontSize(10).fillColor("#000");
      const leftFields = [
        { label: "Name", value: data.user_name },
        { label: "Address", value: data.user_address },
        { label: "Phone", value: `+91 ${data.user_phone}` },
        { label: "Email", value: data.user_email },
      ];
      leftFields.forEach((field) => {
        doc
          .font("Poppins-SemiBold")
          .text(`${field.label}:`, leftX + cellPadding, yOffset + 2, {
            continued: true,
          })
          .font("Poppins")
          .text(` ${field.value}`, {
            width: columnWidth - 2 * cellPadding,
            align: "left",
            lineBreak: false,
          });
        yOffset += cellHeight;
      });

      // --- Right column fields ---
      yOffset = bodyStartY;
      const rightFields = [
        { label: "ID", value: data.staff_id },
        { label: "Name", value: data.staff_name },
        { label: "Phone", value: "+91 99******00" },
        { label: "Address", value: data.staff_address },
      ];
      rightFields.forEach((field) => {
        doc
          .font("Poppins-SemiBold")
          .text(`${field.label}:`, rightX + cellPadding, yOffset + 2, {
            continued: true,
          })
          .font("Poppins")
          .text(` ${field.value}`, {
            width: columnWidth - 2 * cellPadding,
            align: "left",
            lineBreak: false,
          });
        yOffset += cellHeight;
      });

      // Divider
      doc.moveDown(2);
      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .lineWidth(2)
        .strokeColor("#555")
        .stroke();

      // ===== Appointment Details =====
      doc.moveDown();
      doc
        .font("Poppins-Bold")
        .fontSize(13)
        .text("Appointment Details", 40, doc.y + 10);

      doc.font("Poppins-SemiBold").fontSize(11);
      doc
        .text("Time:", 40, doc.y + 15, { continued: true })
        .font("Poppins")
        .text(` ${data.time}`);
      doc
        .font("Poppins-SemiBold")
        .text("Date:", 40, doc.y + 5, { continued: true })
        .font("Poppins")
        .text(` ${data.date}`);
      doc
        .font("Poppins-SemiBold")
        .text("Location:", 40, doc.y + 5, { continued: true })
        .font("Poppins")
        .text(` ${data.appointment_location}`);

      doc.moveDown();
      doc
        .moveTo(40, doc.y + 5)
        .lineTo(555, doc.y + 5)
        .lineWidth(2)
        .strokeColor("#555")
        .stroke();

      doc
        .font("Poppins-Bold")
        .fontSize(14)
        .fillColor("#000")
        .text("Services", 40, doc.y + 15);

      // ===== Services Table =====
      const tableTop = doc.y + 15;
      const colX = { qty: 40, desc: 90, type: 270, unit: 400, amount: 500 };
      const colW = { qty: 50, desc: 170, type: 120, unit: 90, amount: 80 };
      const tableWidth = 515;
      const rowHeight = 30;
      const summaryRowHeight = 30;
      const slideLeft = 30;

      // Draw table header background and borders
      doc
        .lineWidth(1)
        .strokeColor("#000")
        .rect(colX.qty, tableTop, tableWidth, headerHeight)
        .fill("#F8F8F8")
        .stroke(1);

      // Draw header text (bold, left-aligned except numbers)
      doc.font("Poppins-SemiBold").fontSize(11).fillColor("#000");

      doc.text("QTY", colX.qty, tableTop + 6, {
        width: colW.qty,
        align: "center",
      });
      doc.text("Description", colX.desc, tableTop + 6, { width: colW.desc });
      doc.text("Type", colX.type, tableTop + 6, { width: colW.type });
      doc.text("Unit Price", colX.unit - slideLeft, tableTop + 6, {
        width: colW.unit,
        align: "right",
      });
      doc.text("Amount", colX.amount - slideLeft, tableTop + 6, {
        width: colW.amount,
        align: "right",
      });

      // Table horizontal line below header
      doc
        .lineWidth(1)
        .strokeColor("#DDD")
        .moveTo(colX.qty, tableTop + headerHeight)
        .lineTo(colX.qty + tableWidth, tableTop + headerHeight)
        .stroke();

      // Draw table rows
      let y = tableTop + headerHeight;
      doc.font("Poppins").fontSize(11).fillColor("#222");

      data.services.forEach((row) => {
        // Row border
        doc
          .lineWidth(1)
          .strokeColor("#DDD")
          .rect(colX.qty, y, tableWidth, rowHeight)
          .stroke();

        // Cells
        doc.text(row.quantity, colX.qty, y + 6, {
          width: colW.qty,
          align: "center",
        });
        doc.text(row.name, colX.desc, y + 6, { width: colW.desc });
        doc.text(row.type, colX.type, y + 6, { width: colW.type });
        doc.text(row.unit_price, colX.unit - slideLeft, y + 6, {
          width: colW.unit,
          align: "right",
        });
        doc.text(row.amount, colX.amount - slideLeft, y + 6, {
          width: colW.amount,
          align: "right",
        });
        y += rowHeight;
      });

      // Margin below table for summaries
      //   y += 5;

      // Draw summary rows (full width, light border below each)
      doc.font("Poppins-Bold").fontSize(12);

      // Subtotal row (label left, value right)
      doc
        .lineWidth(1)
        .strokeColor("#EEE")
        .rect(colX.qty, y, tableWidth, summaryRowHeight)
        .stroke();
      doc.fillColor("#000").text("Subtotal", colX.qty + 20, y + 8, {
        width: 320 - (colX.qty + 20),
        align: "left",
      });
      doc.text(data.subtotal, colX.amount - slideLeft, y + 8, {
        width: colW.amount,
        align: "right",
      });

      y += summaryRowHeight;

      // Discount (label red, value red)
      doc
        .lineWidth(1)
        .strokeColor("#EEE")
        .rect(colX.qty, y, tableWidth, summaryRowHeight)
        .stroke();
      doc.fillColor("#e74c3c").text("Discount (20%)", colX.qty + 20, y + 8, {
        width: 320 - (colX.qty + 20),
        align: "left",
      });
      doc.text("-" + data.discount, colX.amount - slideLeft, y + 8, {
        width: colW.amount,
        align: "right",
      });

      y += summaryRowHeight;

      doc
        .lineWidth(1)
        .strokeColor("#EEE")
        .rect(colX.qty, y, tableWidth, summaryRowHeight)
        .stroke();
      doc.fillColor("#222").text("Platform Fee (5%)", colX.qty + 20, y + 8, {
        width: 320 - (colX.qty + 20),
        align: "left",
      });
      doc.text(data.platform_fee, colX.amount - slideLeft, y + 8, {
        width: colW.amount,
        align: "right",
      });

      y += summaryRowHeight;

      doc
        .lineWidth(1)
        .strokeColor("#EEE")
        .rect(colX.qty, y, tableWidth, summaryRowHeight)
        .stroke();
      doc
        .fillColor("#0a9d41")
        .fontSize(13)
        .text("Total", colX.qty + 20, y + 8, {
          width: 320 - (colX.qty + 20),
          align: "left",
        });
      doc.text(data.total, colX.amount - slideLeft, y + 8, {
        width: colW.amount,
        align: "right",
      });
      doc.fillColor("#000");

      doc.moveDown(2);
      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .lineWidth(2)
        .strokeColor("#555")
        .stroke();

      // ===== Payment & Signature =====

      const startX = 50;
      const startY2 = doc.y + 20;

      // Payment Method & ID left aligned, closer line spacing
      doc
        .font("Poppins-Bold")
        .fontSize(11)
        .text("Payment Method: ", startX, startY2, {
          continued: true,
          align: "left",
        });

      doc.font("Poppins").fontSize(11).text(data.payment_method, {
        continued: false,
        align: "left",
      });

      // Next line for Payment Id, slightly closer to above
      doc
        .font("Poppins-Bold")
        .fontSize(11)
        .text("Payment Id: ", startX, doc.y + 5, {
          // negative offset to reduce gap
          continued: true,
          align: "left",
        });

      doc
        .font("Poppins")
        .fontSize(11)
        .text(data.payment_id || "-", {
          continued: false,
          align: "left",
        });

      // Signature texts right aligned and positioned tightly
      const signatureX = 400;
      const signatureStartY = startY2;

      doc
        .font("Poppins-Bold") // use Oblique variant if available
        .fontSize(11)
        .text("Authorized Signature", signatureX, signatureStartY, {
          align: "right",
        });

      doc
        .font("Poppins") // italic or oblique variant font
        .fontSize(11)
        .text("Signature", signatureX, doc.y + 5, {
          // reduce gap by moving text up
          align: "right",
        });

      // ===== Footer =====
      // Reduce space by removing extra moveDown
      doc
        .moveTo(40, doc.y + 10) // adjusted Y position closer to signature block
        .lineTo(555, doc.y + 10)
        .strokeColor("#555")
        .lineWidth(1)
        .stroke();

      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const usableWidth = pageWidth - margin * 2;

      doc
        .fontSize(10)
        .fillColor("#666")
        .text(
          `Online generated receipt on ${data.generated_on}`,
          margin,
          doc.y + 15,
          {
            width: usableWidth,
            align: "center",
          }
        );

      doc
        .fillColor("#FF49B7")
        .font("Poppins-Bold")
        .text("Thank you for choosing Feminiq!!!", margin, doc.y, {
          width: usableWidth,
          align: "center",
        });

      doc.moveDown(3);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateReceiptPDF;
