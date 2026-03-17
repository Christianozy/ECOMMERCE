/**
 * IYKMAVIAN – Consultations (Telemedicine) Routes
 *
 * POST  /api/consultations           – Submit a new consultation (public)
 * GET   /api/consultations           – List consultations (staff+)
 * GET   /api/consultations/:id       – Get one consultation (staff+)
 * PATCH /api/consultations/:id/status – Update status (staff+)
 * DELETE /api/consultations/:id      – Dismiss (superintendent)
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

const STATUSES = ["pending", "in_review", "completed", "rejected"];

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/consultations  (public – telemedicine form submission)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  [
    body("patient_name").notEmpty().withMessage("Patient name is required."),
    body("age")
      .optional()
      .isInt({ min: 0, max: 150 })
      .withMessage("Age must be a number 0–150."),
    body("gender")
      .optional()
      .isIn(["Male", "Female", "Other"])
      .withMessage("Invalid gender value."),
    body("symptoms").notEmpty().withMessage("Symptoms / reason is required."),
  ],
  validate,
  (req, res, next) => {
    try {
      const { patient_name, age, gender, symptoms, medical_history } = req.body;
      const id = uuidv4();

      db.prepare(
        `INSERT INTO consultations (id, patient_name, age, gender, symptoms, medical_history)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        patient_name,
        age || null,
        gender || null,
        symptoms,
        medical_history || null,
      );

      const consultation = db
        .prepare("SELECT * FROM consultations WHERE id = ?")
        .get(id);

      // Build WhatsApp deep-link for convenience (staff can use it)
      const waNumber = process.env.WA_NUMBER || "2349030067130";
      const text = encodeURIComponent(
        `*IYKMAVIAN Telemedicine Consultation*\n\n` +
          `*Patient:* ${patient_name}\n` +
          `*Age:* ${age || "N/A"}\n` +
          `*Gender:* ${gender || "N/A"}\n` +
          `*Symptoms:* ${symptoms}\n` +
          `*Medical History:* ${medical_history || "None reported"}\n\n` +
          `_Submitted via IYKMAVIAN. Consultation ID: ${id}_`,
      );
      const waLink = `https://wa.me/${waNumber}?text=${text}`;

      audit(req, "consultation.create", {
        consultationId: id,
        patientName: patient_name,
      });

      res.status(201).json({
        success: true,
        message:
          "Consultation submitted. Our pharmacist will contact you shortly.",
        data: consultation,
        whatsapp_link: waLink,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/consultations  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const { status, page = 1, pageSize = 50 } = req.query;
    let sql = "SELECT * FROM consultations WHERE 1=1";
    const args = [];

    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const size = Math.min(Math.max(Number(pageSize), 1), 100);
    const offset = (Math.max(Number(page), 1) - 1) * size;
    args.push(size, offset);

    const data = db.prepare(sql).all(...args);
    const total = db.prepare("SELECT COUNT(*) AS n FROM consultations").get().n;
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
// GET /api/consultations/:id  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/:id",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const row = db
      .prepare("SELECT * FROM consultations WHERE id = ?")
      .get(req.params.id);
    if (!row)
      return res
        .status(404)
        .json({ success: false, message: "Consultation not found." });
    res.json({ success: true, data: row });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/consultations/:id/status  (staff+)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("status")
      .isIn(STATUSES)
      .withMessage(`Status must be one of: ${STATUSES.join(", ")}`),
  ],
  validate,
  (req, res) => {
    const row = db
      .prepare("SELECT id FROM consultations WHERE id = ?")
      .get(req.params.id);
    if (!row)
      return res
        .status(404)
        .json({ success: false, message: "Consultation not found." });

    const { status, assigned_to } = req.body;

    db.prepare(
      `UPDATE consultations
       SET status = ?, assigned_to = COALESCE(?, assigned_to), updated_at = datetime('now')
       WHERE id = ?`,
    ).run(status, assigned_to || null, row.id);

    audit(req, "consultation.update_status", {
      consultationId: row.id,
      status,
    });

    res.json({
      success: true,
      message: "Consultation status updated.",
      data: { id: row.id, status },
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/consultations/:id  (superintendent)
// ──────────────────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  requireAuth,
  requireRole("superintendent"),
  (req, res) => {
    const row = db
      .prepare("SELECT id FROM consultations WHERE id = ?")
      .get(req.params.id);
    if (!row)
      return res
        .status(404)
        .json({ success: false, message: "Consultation not found." });

    db.prepare("DELETE FROM consultations WHERE id = ?").run(row.id);

    audit(req, "consultation.delete", { consultationId: row.id });

    res.json({ success: true, message: "Consultation record deleted." });
  },
);

module.exports = router;
