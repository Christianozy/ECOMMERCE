/**
 * IYKMAVIAN – Payments Routes
 *
 * POST  /api/payments              – Log a payment (customer self-report)
 * GET   /api/payments              – List all payments (staff+)
 * GET   /api/payments/:id          – Single payment details (staff+)
 * PATCH /api/payments/:id/verify   – Verify a payment (staff+)
 * PATCH /api/payments/:id/reject   – Reject a payment (staff+)
 */

"use strict";

const express = require("express");
const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadReceipt } = require("../middleware/upload");
const { sendPaymentReceipt } = require("../config/email");
const { generateInvoicePDF } = require("../utils/invoice");
const { audit } = require("../middleware/auditLog");

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payments  (public – customer logs payment after bank transfer)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  [
    body("order_id").notEmpty().withMessage("order_id is required."),
    body("amount")
      .isFloat({ min: 1 })
      .withMessage("Amount must be a positive number."),
    body("method")
      .optional()
      .isIn(["bank_transfer", "paystack", "flutterwave"])
      .withMessage("Invalid payment method."),
    body("reference").optional().isString(),
  ],
  validate,
  (req, res, next) => {
    try {
      const {
        order_id,
        amount,
        method = "bank_transfer",
        reference,
        logged_by,
      } = req.body;

      // Ensure order exists
      const order = db
        .prepare("SELECT id FROM orders WHERE id = ?")
        .get(order_id);
      if (!order)
        return res
          .status(404)
          .json({ success: false, message: "Order not found." });

      const id = uuidv4();
      db.prepare(
        `INSERT INTO payments (id, order_id, amount, method, reference, logged_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, order_id, amount, method, reference || null, logged_by || null);

      // Also mark order payment as pending_verify
      db.prepare(
        `UPDATE orders SET payment_status = 'pending_verify', updated_at = datetime('now') WHERE id = ?`,
      ).run(order_id);

      const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(id);

      audit(req, "payment.log", { paymentId: id, orderId: order_id, amount });

      res.status(201).json({
        success: true,
        message: "Payment logged. Awaiting staff verification.",
        data: payment,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/payments  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const { status, page = 1, pageSize = 50 } = req.query;
    let sql =
      "SELECT p.*, o.customer_name FROM payments p LEFT JOIN orders o ON p.order_id = o.id WHERE 1=1";
    const args = [];

    if (status) {
      sql += " AND p.status = ?";
      args.push(status);
    }
    sql += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    const size = Math.min(Math.max(Number(pageSize), 1), 100);
    const offset = (Math.max(Number(page), 1) - 1) * size;
    args.push(size, offset);

    const data = db.prepare(sql).all(...args);
    const total = db.prepare("SELECT COUNT(*) AS n FROM payments").get().n;
    res.json({
      success: true,
      page: Number(page),
      pageSize: size,
      total,
      count: data.length,
      data,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/payments/:id  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/:id",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const row = db
      .prepare(
        "SELECT p.*, o.customer_name FROM payments p LEFT JOIN orders o ON p.order_id = o.id WHERE p.id = ?",
      )
      .get(req.params.id);
    if (!row)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    res.json({ success: true, data: row });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/verify  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/verify",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const payment = db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .get(req.params.id);
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });

    db.prepare(
      `UPDATE payments SET status = 'verified', updated_at = datetime('now') WHERE id = ?`,
    ).run(payment.id);

    // Cascade: mark the order as paid
    db.prepare(
      `UPDATE orders SET payment_status = 'paid', status = 'confirmed', updated_at = datetime('now') WHERE id = ?`,
    ).run(payment.order_id);

    const order = db
      .prepare(
        "SELECT id, customer_name, customer_email, total, items_json FROM orders WHERE id = ?",
      )
      .get(payment.order_id);

    if (order) {
      // Generate PDF Invoice
      generateInvoicePDF(order)
        .then((invoicePath) => {
          sendPaymentReceipt({ order, payment, invoicePath }).catch(
            console.error,
          );
        })
        .catch((err) => {
          console.error("Invoice Generation Error:", err);
          sendPaymentReceipt({ order, payment }).catch(console.error);
        });
    }

    audit(req, "payment.verify", {
      paymentId: payment.id,
      orderId: payment.order_id,
    });

    res.json({
      success: true,
      message: "Payment verified. Order confirmed and invoice sent.",
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/reject  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/reject",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const payment = db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .get(req.params.id);
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });

    db.prepare(
      `UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?`,
    ).run(payment.id);

    db.prepare(
      `UPDATE orders SET payment_status = 'unpaid', updated_at = datetime('now') WHERE id = ?`,
    ).run(payment.order_id);

    audit(req, "payment.reject", {
      paymentId: payment.id,
      orderId: payment.order_id,
    });

    res.json({ success: true, message: "Payment rejected." });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payments/:id/receipt  (upload receipt/proof)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/:id/receipt",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  uploadReceipt,
  (req, res) => {
    const payment = db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .get(req.params.id);
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });

    const url = `/uploads/receipts/${req.file.filename}`;
    db.prepare(
      `UPDATE payments SET receipt_url = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(url, payment.id);

    audit(req, "payment.upload_receipt", {
      paymentId: payment.id,
      receiptUrl: url,
    });

    const updated = db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .get(payment.id);
    res.json({
      success: true,
      message: "Receipt uploaded.",
      data: updated,
    });
  },
);

module.exports = router;
