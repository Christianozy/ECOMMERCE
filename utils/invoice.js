/**
 * IYKMAVIAN Pharmaceuticals – Invoice Generation Utility
 * Uses PDFKit to generate PDF invoices
 */

"use strict";

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generate a PDF invoice and return the file path
 */
async function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice-${order.id.slice(0, 8)}.pdf`;
      const dir = path.join(__dirname, "../../../uploads/invoices");

      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fillColor("#001f3f")
        .fontSize(20)
        .text("IYKMAVIAN Pharmaceuticals", 50, 50);
      doc.fontSize(10).fillColor("#666").text("Official Invoice", 50, 75);

      // Order Details
      doc
        .fillColor("#333")
        .fontSize(12)
        .text(`Invoice #: ${order.id.toUpperCase()}`, 350, 50);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 350, 65);

      // Customer Info
      doc.moveDown(2);
      doc.fontSize(14).text("Bill To:", 50, 120);
      doc.fontSize(12).text(order.customer_name, 50, 140);
      if (order.customer_email) doc.text(order.customer_email, 50, 155);
      if (order.customer_phone) doc.text(order.customer_phone, 50, 170);

      // Table Header
      doc.moveDown(3);
      doc.rect(50, 220, 500, 20).fill("#f0f2f5");
      doc.fillColor("#001f3f").fontSize(10).text("Item Description", 60, 225);
      doc.text("Qty", 350, 225);
      doc.text("Price", 420, 225);
      doc.text("Subtotal", 490, 225);

      // Table Rows
      let y = 250;
      const items =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;

      items.forEach((item) => {
        doc.fillColor("#333").text(item.name, 60, y);
        doc.text(item.quantity.toString(), 350, y);
        doc.text(`N${Number(item.price).toLocaleString()}`, 420, y);
        doc.text(`N${(item.price * item.quantity).toLocaleString()}`, 490, y);
        y += 20;
      });

      // Total
      doc.moveDown(2);
      doc
        .fontSize(14)
        .fillColor("#001f3f")
        .text(
          `Total Amount: N${Number(order.total).toLocaleString()}`,
          380,
          y + 20,
        );

      // Footer
      doc
        .fontSize(10)
        .fillColor("#888")
        .text("Thank you for choosing IYKMAVIAN Pharmaceuticals.", 50, 700, {
          align: "center",
        });

      doc.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF };
