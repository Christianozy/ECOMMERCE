/**
 * IYKMAVIAN – Inventory Restock Routes
 *
 * POST   /api/restock-requests – Request a restock for a product
 * GET    /api/restock-requests – List all requests (staff+)
 */

"use strict";

const express = require("express");
const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/restock-requests (staff only)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("product_id").notEmpty().withMessage("Product ID is required."),
  ],
  validate,
  (req, res) => {
    const { product_id } = req.body;
    const requestId = uuidv4();

    db.prepare(`
      INSERT INTO restock_requests (id, product_id, requested_by)
      VALUES (?, ?, ?)
    `).run(requestId, product_id, req.user.name || req.user.id);

    res.status(201).json({
      success: true,
      message: "Restock request created.",
      data: { id: requestId }
    });
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/restock-requests (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, p.name as product_name, p.stock
      FROM restock_requests r
      JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
    `).all();
    res.json({ success: true, data: requests });
  }
);

module.exports = router;
