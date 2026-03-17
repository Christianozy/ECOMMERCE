/**
 * IYKMAVIAN – Orders Routes
 *
 * POST   /api/orders             – Place a new order (public / customer)
 * GET    /api/orders             – List all orders (staff+)
 * GET    /api/orders/:id         – Get a single order (staff+)
 * PATCH  /api/orders/:id/status  – Update order status (staff+)
 * PATCH  /api/orders/:id/payment – Update payment status (staff+)
 * DELETE /api/orders/:id         – Cancel order (superintendent)
 * POST   /api/orders/:id/prescription – Upload prescription for restricted items
 */

"use strict";

const express = require("express");
const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadPrescription } = require("../middleware/upload");
const { sendOrderConfirmation, sendLowStockAlert } = require("../config/email");
const { verifyToken } = require("../config/jwt");
const { audit } = require("../middleware/auditLog");

const router = express.Router();

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUSES = ["unpaid", "pending_verify", "paid", "refunded"];

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/orders  (public – customer places order)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  [
    body("customer_name").notEmpty().withMessage("Customer name is required."),
    body("customer_email")
      .optional()
      .isEmail()
      .withMessage("Invalid email address."),
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required."),
    body("items.*.id").optional().isString(),
    body("items.*.name").notEmpty().withMessage("Each item must have a name."),
    body("items.*.price")
      .isFloat({ min: 0 })
      .withMessage("Each item must have a valid price."),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Each item must have quantity ≥ 1."),
  ],
  validate,
  (req, res, next) => {
    try {
      const { customer_name, customer_email, customer_phone, items, notes } =
        req.body;

      const withIds = items.filter((i) => i.id);
      if (withIds.length) {
        for (const it of withIds) {
          const prod = db
            .prepare(
              "SELECT id, stock, is_active FROM products WHERE id = ? AND is_active = 1",
            )
            .get(it.id);
          if (!prod) {
            const err = new Error("One or more products not found.");
            err.status = 400;
            throw err;
          }
          if (prod.stock < Number(it.quantity)) {
            const err = new Error("Insufficient stock for one or more items.");
            err.status = 400;
            throw err;
          }
        }
        for (const it of withIds) {
          db.prepare(
            `UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?`,
          ).run(Number(it.quantity), it.id);

          // Check if stock is low
          const updatedProd = db
            .prepare("SELECT name, stock FROM products WHERE id = ?")
            .get(it.id);
          if (updatedProd && updatedProd.stock <= 5) {
            sendLowStockAlert({
              product: {
                id: it.id,
                name: updatedProd.name,
                stock: updatedProd.stock,
              },
            }).catch(console.error);
          }
        }
      }

      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const id = uuidv4();

      // Link to user if logged in
      let userId = null;
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = verifyToken(token);
          if (decoded) userId = decoded.id;
        } catch (e) {}
      }

      db.prepare(
        `INSERT INTO orders
           (id, customer_name, customer_email, customer_phone, items_json, total, notes, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        customer_name,
        customer_email || null,
        customer_phone || null,
        JSON.stringify(items),
        total,
        notes || null,
        userId,
      );

      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
      const parsed = { ...order, items: JSON.parse(order.items_json) };
      delete parsed.items_json;

      sendOrderConfirmation({ order: parsed }).catch(() => {});

      audit(req, "order.create", {
        orderId: id,
        customer: customer_name,
        total,
      });

      res.status(201).json({
        success: true,
        message: "Order placed successfully.",
        data: parsed,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/orders/my-orders  (authenticated customer)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/my-orders", requireAuth, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);

  const data = orders.map((o) => ({
    ...o,
    items: JSON.parse(o.items_json),
    items_json: undefined,
  }));

  res.json({ success: true, data });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/orders  (staff only)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const { status, payment_status, limit = 50, offset = 0 } = req.query;

    let sql = "SELECT * FROM orders WHERE 1=1";
    const args = [];

    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }
    if (payment_status) {
      sql += " AND payment_status = ?";
      args.push(payment_status);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    args.push(Number(limit), Number(offset));

    const rows = db.prepare(sql).all(...args);
    const data = rows.map((r) => ({
      ...r,
      items: JSON.parse(r.items_json),
      items_json: undefined,
    }));

    const total = db.prepare("SELECT COUNT(*) as n FROM orders").get().n;
    res.json({ success: true, total, count: data.length, data });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id  (public for tracking)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(req.params.id);
  if (!row)
    return res
      .status(404)
      .json({ success: false, message: "Order not found." });

  // Santize data for public tracking if not logged in
  const data = { ...row };
  if (!req.headers.authorization) {
    // Only expose status info
    delete data.customer_phone;
    delete data.customer_email;
    delete data.notes;
  }

  data.items = JSON.parse(data.items_json || "[]");
  delete data.items_json;

  res.json({ success: true, data });
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("status")
      .isIn(ORDER_STATUSES)
      .withMessage(`Status must be one of: ${ORDER_STATUSES.join(", ")}`),
  ],
  validate,
  (req, res) => {
    const order = db
      .prepare("SELECT id FROM orders WHERE id = ?")
      .get(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    db.prepare(
      `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(req.body.status, order.id);

    audit(req, "order.update_status", {
      orderId: order.id,
      status: req.body.status,
    });

    res.json({
      success: true,
      message: "Order status updated.",
      data: { id: order.id, status: req.body.status },
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/payment  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/payment",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("payment_status")
      .isIn(PAYMENT_STATUSES)
      .withMessage(
        `Payment status must be one of: ${PAYMENT_STATUSES.join(", ")}`,
      ),
  ],
  validate,
  (req, res) => {
    const order = db
      .prepare("SELECT id FROM orders WHERE id = ?")
      .get(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    db.prepare(
      `UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(req.body.payment_status, order.id);

    audit(req, "order.update_payment", {
      orderId: order.id,
      status: req.body.payment_status,
    });

    res.json({
      success: true,
      message: "Payment status updated.",
      data: { id: order.id, payment_status: req.body.payment_status },
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/orders/:id  (superintendent only – mark cancelled)
// ──────────────────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  requireAuth,
  requireRole("superintendent"),
  (req, res) => {
    const order = db
      .prepare("SELECT id FROM orders WHERE id = ?")
      .get(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    db.prepare(
      `UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
    ).run(order.id);

    audit(req, "order.cancel", { orderId: order.id });

    res.json({ success: true, message: "Order cancelled." });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:id/prescription (customer – upload prescription)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/:id/prescription",
  uploadPrescription,
  [
    body("patient_name").notEmpty().withMessage("Patient name is required."),
    body("doctor_name").notEmpty().withMessage("Doctor name is required."),
  ],
  validate,
  (req, res) => {
    const { id } = req.params;
    const { patient_name, doctor_name } = req.body;

    const order = db.prepare("SELECT id FROM orders WHERE id = ?").get(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Prescription file is required." });
    }

    const prescriptionId = uuidv4();
    const imageUrl = `/uploads/prescriptions/${req.file.filename}`;

    db.prepare(
      `
      INSERT INTO prescriptions (id, order_id, patient_name, doctor_name, image_url)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(prescriptionId, id, patient_name, doctor_name, imageUrl);

    audit(req, "order.upload_prescription", {
      orderId: id,
      prescriptionId,
      patientName: patient_name,
    });

    res.status(201).json({
      success: true,
      message: "Prescription uploaded and awaiting verification.",
      data: { prescriptionId, imageUrl },
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/prescriptions/:id (staff – verify/reject)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/prescriptions/:id",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("status")
      .isIn(["verified", "rejected"])
      .withMessage("Invalid status."),
  ],
  validate,
  (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const rx = db
      .prepare("SELECT order_id FROM prescriptions WHERE id = ?")
      .get(id);
    if (!rx)
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found." });

    db.prepare("UPDATE prescriptions SET status = ? WHERE id = ?").run(
      status,
      id,
    );

    audit(req, "order.verify_prescription", {
      prescriptionId: id,
      orderId: rx.order_id,
      status,
    });

    res.json({ success: true, message: `Prescription ${status}.` });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/orders/prescriptions/pending (staff – list)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/prescriptions/pending",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const data = db
      .prepare(
        `
      SELECT rx.*, o.customer_name 
      FROM prescriptions rx 
      JOIN orders o ON rx.order_id = o.id 
      WHERE rx.status = 'pending'
    `,
      )
      .all();
    res.json({ success: true, data });
  },
);

module.exports = router;
