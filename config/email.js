/**
 * IYKMAVIAN – Email Service (Nodemailer)
 *
 * Set these env vars to enable real email sending:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 *
 * If not set, emails are logged to the console instead (dev mode).
 */

"use strict";

const nodemailer = require("nodemailer");

const DEV_MODE =
  !process.env.EMAIL_HOST || process.env.NODE_ENV === "development";

// ── Transporter ──────────────────────────────────────────────────────────────
let transporter;

if (DEV_MODE) {
  // In dev mode: log emails to console instead of sending
  transporter = {
    sendMail: async (opts) => {
      console.log("\n📧  [DEV EMAIL - not sent]");
      console.log(`   To     : ${opts.to}`);
      console.log(`   Subject: ${opts.subject}`);
      console.log(`   Body   : ${opts.text || "(html only)"}`);
      console.log("");
      return { messageId: "dev-" + Date.now() };
    },
  };
} else {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FROM = process.env.EMAIL_FROM || '"IYKMAVIAN" <noreply@kriloxhub.com>';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Send order confirmation to customer and notify staff.
 */
async function sendOrderConfirmation({ order }) {
  // Customer email
  if (order.customer_email) {
    await transporter.sendMail({
      from: FROM,
      to: order.customer_email,
      subject: `✅ Order Confirmed – IYKMAVIAN #${order.id.slice(0, 8).toUpperCase()}`,
      text:
        `Dear ${order.customer_name},\n\n` +
        `Thank you for your order at IYKMAVIAN!\n\n` +
        `Order ID : ${order.id}\n` +
        `Total    : ₦${Number(order.total).toLocaleString()}\n` +
        `Status   : Pending\n\n` +
        `We will process your order shortly and contact you for payment.\n\n` +
        `— IYKMAVIAN Pharma Team`,
    });
  }

  // Staff notification
  const staffEmail = process.env.STAFF_NOTIFY_EMAIL;
  if (staffEmail) {
    await transporter.sendMail({
      from: FROM,
      to: staffEmail,
      subject: `🛒 New Order Received – ${order.customer_name}`,
      text:
        `A new order has been placed.\n\n` +
        `Customer : ${order.customer_name}\n` +
        `Phone    : ${order.customer_phone || "N/A"}\n` +
        `Email    : ${order.customer_email || "N/A"}\n` +
        `Total    : ₦${Number(order.total).toLocaleString()}\n` +
        `Order ID : ${order.id}\n\n` +
        `Log in to the staff dashboard to manage this order.`,
    });
  }
}

/**
 * Send payment receipt to customer after verification.
 */
async function sendPaymentReceipt({ order, payment, invoicePath }) {
  if (!order.customer_email) return;

  const attachments = [];
  if (invoicePath) {
    attachments.push({
      filename: `invoice-${order.id.slice(0, 8)}.pdf`,
      path: invoicePath,
    });
  }

  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject: `💳 Payment Verified – IYKMAVIAN #${order.id.slice(0, 8).toUpperCase()}`,
    text:
      `Dear ${order.customer_name},\n\n` +
      `Your payment has been verified!\n\n` +
      `Order ID    : ${order.id}\n` +
      `Amount Paid : ₦${Number(payment.amount).toLocaleString()}\n` +
      `Method      : ${payment.method}\n` +
      `Reference   : ${payment.reference || "N/A"}\n\n` +
      `Your order is now confirmed and being processed. Please find your official invoice attached.\n\n` +
      `Thank you for choosing IYKMAVIAN.\n\n` +
      `— IYKMAVIAN Pharma Team`,
    attachments,
  });
}

/**
 * Send consultation acknowledgement to patient.
 */
async function sendConsultationAck({ consultation, whatsappLink }) {
  if (!consultation.patient_email) return;
  await transporter.sendMail({
    from: FROM,
    to: consultation.patient_email,
    subject: `🏥 Consultation Received – IYKMAVIAN`,
    text:
      `Dear ${consultation.patient_name},\n\n` +
      `We have received your consultation request. Our pharmacist will review it shortly.\n\n` +
      `Consultation ID : ${consultation.id}\n` +
      `Status          : Pending\n\n` +
      `You can also reach us directly:\n${whatsappLink}\n\n` +
      `— IYKMAVIAN Telemedicine Team`,
  });
}

/**
 * Send welcome email to new staff member.
 */
async function sendStaffWelcome({ name, email, tempPassword }) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `🎉 Welcome to IYKMAVIAN Staff Portal`,
    text:
      `Dear ${name},\n\n` +
      `Your IYKMAVIAN staff account has been created.\n\n` +
      `Email    : ${email}\n` +
      `Password : ${tempPassword}\n\n` +
      `Please log in at https://your-domain.com/staff-login.html and change your password immediately.\n\n` +
      `— IYKMAVIAN Administration`,
  });
}

/**
 * Send newsletter subscription welcome email.
 */
async function sendNewsletterWelcome({ email }) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `📬 You're Subscribed to KriloxHub Updates!`,
    text:
      `Hello!\n\n` +
      `Thank you for subscribing to KriloxHub's newsletter.\n` +
      `You'll receive updates on new pharmaceutical products, health tips and promotions.\n\n` +
      `— KriloxHub Pharma Team`,
  });
}

/**
 * Notify staff of low stock.
 */
async function sendLowStockAlert({ product }) {
  const staffEmail = process.env.STAFF_NOTIFY_EMAIL;
  if (!staffEmail) return;

  await transporter.sendMail({
    from: FROM,
    to: staffEmail,
    subject: `⚠️ LOW STOCK ALERT: ${product.name}`,
    text:
      `Notice: Inventory for "${product.name}" is low.\n\n` +
      `Current Stock: ${product.stock}\n` +
      `Product ID   : ${product.id}\n\n` +
      `Please restock soon to avoid service disruption.`,
  });
}

module.exports = {
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendConsultationAck,
  sendStaffWelcome,
  sendNewsletterWelcome,
  sendLowStockAlert,
};
