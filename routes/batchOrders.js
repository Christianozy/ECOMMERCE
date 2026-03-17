/**
 * IYKMAVIAN – Batch Orders Routes (B2B)
 *
 * POST   /api/batch-orders – Request a bulk order
 * GET    /api/batch-orders – List all batch requests (staff+)
 */

"use strict";

const express = require("express");
const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { audit } = require("../middleware/auditLog");

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/batch-orders (public/B2B customer)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  [
    body("organization")
      .notEmpty()
      .withMessage("Organization name is required."),
    body("contact_person")
      .notEmpty()
      .withMessage("Contact person is required."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("items_json")
      .notEmpty()
      .withMessage("Items or requirements are required."),
  ],
  validate,
  (req, res) => {
    const {
      organization,
      org_type,
      reg_no,
      contact_person,
      email,
      phone,
      items_json,
      notes,
    } = req.body;
    const id = uuidv4();

    // If items_json is a JSON string (e.g., from a more advanced UI), try to parse it
    // otherwise, just store it as a string
    let storedItems = items_json;
    let total = 0;
    try {
      if (typeof items_json === "string" && items_json.startsWith("[")) {
        const parsed = JSON.parse(items_json);
        if (Array.isArray(parsed)) {
          total = parsed.reduce(
            (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
            0,
          );
        }
      } else if (Array.isArray(items_json)) {
        storedItems = JSON.stringify(items_json);
        total = items_json.reduce(
          (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
          0,
        );
      }
    } catch (e) {
      // Just store as string if parsing fails
    }

    db.prepare(
      `
      INSERT INTO batch_orders (id, organization, org_type, reg_no, contact_person, email, phone, items_json, notes, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      organization,
      org_type || null,
      reg_no || null,
      contact_person,
      email,
      phone || null,
      storedItems,
      notes || null,
      total,
    );

    audit(req, "batch_order.create", {
      batchOrderId: id,
      organization,
      email,
    });

    res.status(201).json({
      success: true,
      message:
        "Batch order request submitted. Our sales team will contact you.",
      data: { id },
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/batch-orders (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const orders = db
      .prepare("SELECT * FROM batch_orders ORDER BY created_at DESC")
      .all();
    const data = orders.map((o) => ({
      ...o,
      items: JSON.parse(o.items_json),
      items_json: undefined,
    }));
    res.json({ success: true, data });
  },
);

module.exports = router;
