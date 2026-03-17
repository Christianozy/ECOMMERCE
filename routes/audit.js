/**
 * IYKMAVIAN – Audit Logs Routes
 *
 * GET /api/audit         – List activity logs (superintendent)
 */

"use strict";

const express = require("express");
const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("superintendent"), (req, res) => {
  const { action, email, from, to, page = 1, pageSize = 50 } = req.query;
  let sql =
    "SELECT id, actor_id, actor_email, action, meta_json, ip, created_at FROM activity_logs WHERE 1=1";
  const args = [];

  if (action) {
    sql += " AND action LIKE ?";
    args.push(`%${action}%`);
  }
  if (email) {
    sql += " AND actor_email = ?";
    args.push(email);
  }
  if (from) {
    sql += " AND datetime(created_at) >= datetime(?)";
    args.push(from);
  }
  if (to) {
    sql += " AND datetime(created_at) <= datetime(?)";
    args.push(to);
  }

  const size = Math.min(Math.max(Number(pageSize), 1), 200);
  const offset = (Math.max(Number(page), 1) - 1) * size;
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  args.push(size, offset);

  const data = db.prepare(sql).all(...args);

  const total = db.prepare("SELECT COUNT(*) AS n FROM activity_logs").get().n;
  res.json({
    success: true,
    page: Number(page),
    pageSize: size,
    total,
    count: data.length,
    data,
  });
});

module.exports = router;

