/**
 * IYKMAVIAN – Newsletter Routes
 *
 * POST   /api/newsletter           – Subscribe (public)
 * GET    /api/newsletter           – List subscribers (superintendent)
 * DELETE /api/newsletter/:id       – Unsubscribe / remove (superintendent)
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

// POST /api/newsletter
router.post(
  "/",
  [
    body("email")
      .isEmail()
      .withMessage("A valid email is required.")
      .normalizeEmail(),
  ],
  validate,
  (req, res, next) => {
    try {
      const { email } = req.body;

      const existing = db
        .prepare("SELECT id, is_active FROM newsletter WHERE email = ?")
        .get(email);

      if (existing) {
        if (existing.is_active) {
          return res.json({
            success: true,
            message: "You are already subscribed!",
          });
        }
        // Re-activate
        db.prepare("UPDATE newsletter SET is_active = 1 WHERE id = ?").run(
          existing.id,
        );
        return res.json({
          success: true,
          message: "Welcome back! You have been resubscribed.",
        });
      }

      const id = uuidv4();
      db.prepare("INSERT INTO newsletter (id, email) VALUES (?, ?)").run(
        id,
        email,
      );

      audit(req, "newsletter.subscribe", { email });

      res.status(201).json({
        success: true,
        message: "Thank you for subscribing to IYKMAVIAN updates!",
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/newsletter  (superintendent)
router.get("/", requireAuth, requireRole("superintendent"), (req, res) => {
  const { page = 1, pageSize = 50 } = req.query;
  const size = Math.min(Math.max(Number(pageSize), 1), 100);
  const offset = (Math.max(Number(page), 1) - 1) * size;
  const data = db
    .prepare(
      "SELECT id, email, is_active, created_at FROM newsletter ORDER BY created_at DESC LIMIT ? OFFSET ?",
    )
    .all(size, offset);
  const total = db.prepare("SELECT COUNT(*) AS n FROM newsletter").get().n;
  res.json({
    success: true,
    page: Number(page),
    pageSize: size,
    total,
    count: data.length,
    data,
  });
});

// DELETE /api/newsletter/:id  (superintendent)
router.delete(
  "/:id",
  requireAuth,
  requireRole("superintendent"),
  (req, res) => {
    const row = db
      .prepare("SELECT id FROM newsletter WHERE id = ?")
      .get(req.params.id);
    if (!row)
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found." });

    db.prepare("UPDATE newsletter SET is_active = 0 WHERE id = ?").run(row.id);

    audit(req, "newsletter.unsubscribe", { id: row.id });

    res.json({ success: true, message: "Subscriber removed." });
  },
);

module.exports = router;
