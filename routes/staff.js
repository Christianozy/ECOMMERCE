/**
 * IYKMAVIAN – Staff Management Routes
 *
 * GET    /api/staff                    – List all staff (superintendent)
 * GET    /api/staff/:id                – Staff profile detail (superintendent)
 * POST   /api/staff                    – Create staff account (superintendent)
 * PATCH  /api/staff/:id/status         – Toggle status (superintendent)
 * DELETE /api/staff/:id                – Remove staff (superintendent)
 *
 * -- Staff internal requests / approvals --
 * POST   /api/staff/requests           – Submit a supply request (staff)
 * GET    /api/staff/requests           – List requests (staff+)
 * PATCH  /api/staff/requests/:id       – Approve / Deny (superintendent)
 */

"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { audit } = require("../middleware/auditLog");

const router = express.Router();

const STAFF_STATUSES = ["active", "on_leave", "suspended"];
const REQUEST_STATUSES = ["pending", "approved", "denied", "active"];
const DEPARTMENTS = [
  "Pharmacy",
  "Logistics",
  "Procurement",
  "Quality Control",
  "Inventory",
  "Finance",
  "Sales",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAFF CRUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/staff
router.get("/", requireAuth, requireRole("superintendent"), (req, res) => {
  const { status, department, search, page = 1, pageSize = 50 } = req.query;

  let sql = `SELECT id, name, email, role, department, status, created_at FROM users WHERE role != 'superintendent'`;
  const args = [];

  if (status) {
    sql += " AND status = ?";
    args.push(status);
  }
  if (department) {
    sql += " AND department = ?";
    args.push(department);
  }
  if (search) {
    sql += " AND (name LIKE ? OR email LIKE ?)";
    args.push(`%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  const size = Math.min(Math.max(Number(pageSize), 1), 100);
  const offset = (Math.max(Number(page), 1) - 1) * size;
  args.push(size, offset);

  const data = db.prepare(sql).all(...args);
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role != 'superintendent'")
    .get().n;
  res.json({
    success: true,
    page: Number(page),
    pageSize: size,
    total,
    count: data.length,
    data,
  });
});

// GET /api/staff/:id
router.get("/:id", requireAuth, requireRole("superintendent"), (req, res) => {
  const user = db
    .prepare(
      "SELECT id, name, email, role, department, status, created_at FROM users WHERE id = ?",
    )
    .get(req.params.id);
  if (!user)
    return res
      .status(404)
      .json({ success: false, message: "Staff not found." });
  res.json({ success: true, data: user });
});

// POST /api/staff  – create a new staff account
router.post(
  "/",
  requireAuth,
  requireRole("superintendent"),
  [
    body("name").notEmpty().withMessage("Name is required."),
    body("email")
      .isEmail()
      .withMessage("Valid email is required.")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("department").optional().isString(),
    body("role")
      .optional()
      .isIn(["staff", "superintendent"])
      .withMessage("Role must be staff or superintendent."),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, department, role = "staff" } = req.body;

      const existing = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(email);
      if (existing)
        return res
          .status(409)
          .json({ success: false, message: "Email already registered." });

      const hashed = await bcrypt.hash(password, 12);
      const id = uuidv4();

      db.prepare(
        `INSERT INTO users (id, name, email, password, role, department)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, name, email, hashed, role, department || null);

      const user = db
        .prepare(
          "SELECT id, name, email, role, department, status FROM users WHERE id = ?",
        )
        .get(id);

      audit(req, "staff.create", { staffId: id, email, role });

      res
        .status(201)
        .json({ success: true, message: "Staff account created.", data: user });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/staff/:id/status
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("superintendent"),
  [
    body("status")
      .isIn(STAFF_STATUSES)
      .withMessage(`Status must be: ${STAFF_STATUSES.join(", ")}`),
  ],
  validate,
  (req, res) => {
    const user = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    db.prepare(
      `UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(req.body.status, user.id);

    audit(req, "staff.update_status", {
      staffId: user.id,
      status: req.body.status,
    });

    res.json({
      success: true,
      message: "Staff status updated.",
      data: { id: user.id, status: req.body.status },
    });
  },
);

// DELETE /api/staff/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("superintendent"),
  (req, res) => {
    const user = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

    audit(req, "staff.delete", { staffId: user.id });

    res.json({ success: true, message: "Staff account deleted." });
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPPLY REQUESTS  (internal procurement / approvals)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/staff/requests
router.post(
  "/requests",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("department").notEmpty().withMessage("Department is required."),
    body("item").notEmpty().withMessage("Item name is required."),
    body("priority")
      .optional()
      .isIn(["normal", "high"])
      .withMessage("Priority must be normal or high."),
  ],
  validate,
  (req, res, next) => {
    try {
      const { department, item, priority = "normal", notes } = req.body;
      const id = uuidv4();

      db.prepare(
        `INSERT INTO staff_requests (id, department, item, priority, requested_by, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, department, item, priority, req.user.name, notes || null);

      const request = db
        .prepare("SELECT * FROM staff_requests WHERE id = ?")
        .get(id);
      res.status(201).json({
        success: true,
        message: "Request submitted for approval.",
        data: request,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/staff/requests
router.get(
  "/requests",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    const { status, department, page = 1, pageSize = 50 } = req.query;
    let sql = "SELECT * FROM staff_requests WHERE 1=1";
    const args = [];

    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }
    if (department) {
      sql += " AND department = ?";
      args.push(department);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const size = Math.min(Math.max(Number(pageSize), 1), 100);
    const offset = (Math.max(Number(page), 1) - 1) * size;
    args.push(size, offset);
    const data = db.prepare(sql).all(...args);
    const total = db
      .prepare("SELECT COUNT(*) AS n FROM staff_requests")
      .get().n;
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

// PATCH /api/staff/requests/:id  (approve / deny)
router.patch(
  "/requests/:id",
  requireAuth,
  requireRole("superintendent"),
  [
    body("status")
      .isIn(REQUEST_STATUSES)
      .withMessage(`Status must be one of: ${REQUEST_STATUSES.join(", ")}`),
  ],
  validate,
  (req, res) => {
    const request = db
      .prepare("SELECT id FROM staff_requests WHERE id = ?")
      .get(req.params.id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found." });

    db.prepare(
      `UPDATE staff_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(req.body.status, request.id);

    audit(req, "staff.update_request", {
      requestId: request.id,
      status: req.body.status,
    });

    res.json({
      success: true,
      message: `Request ${req.body.status}.`,
      data: { id: request.id, status: req.body.status },
    });
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELIVERY LOGS  (staff updates order location/status)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/staff/deliveries
router.post(
  "/deliveries",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("order_id").notEmpty().withMessage("Order ID is required."),
    body("status").notEmpty().withMessage("Status is required."),
  ],
  validate,
  (req, res) => {
    const { order_id, status, location, notes } = req.body;
    const id = uuidv4();

    db.prepare(
      `
      INSERT INTO delivery_logs (id, order_id, staff_name, status, location, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, order_id, req.user.name, status, location || null, notes || null);

    // Update main order status if applicable
    if (status === "delivered") {
      db.prepare(
        "UPDATE orders SET status = 'delivered', updated_at = datetime('now') WHERE id = ?",
      ).run(order_id);
    } else if (
      ["picked_up", "in_transit", "out_for_delivery"].includes(status)
    ) {
      db.prepare(
        "UPDATE orders SET status = 'processing', updated_at = datetime('now') WHERE id = ?",
      ).run(order_id);
    }

    audit(req, "delivery.log_update", { orderId: order_id, status, location });

    res.status(201).json({ success: true, message: "Delivery update logged." });
  },
);

// GET /api/staff/deliveries/:order_id
router.get("/deliveries/:order_id", (req, res) => {
  const logs = db
    .prepare(
      "SELECT * FROM delivery_logs WHERE order_id = ? ORDER BY created_at DESC",
    )
    .all(req.params.order_id);
  res.json({ success: true, data: logs });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAFF TASKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/staff/tasks
router.get("/tasks", requireAuth, (req, res) => {
  const tasks = db
    .prepare("SELECT * FROM staff_tasks ORDER BY created_at DESC")
    .all();
  res.json({ success: true, data: tasks });
});

// POST /api/staff/tasks
router.post(
  "/tasks",
  requireAuth,
  requireRole("superintendent"),
  [
    body("title").notEmpty().withMessage("Title is required."),
    body("priority")
      .isIn(["low", "medium", "high"])
      .withMessage("Invalid priority."),
  ],
  validate,
  (req, res) => {
    const { title, priority, assigned_to } = req.body;
    const id = uuidv4();
    db.prepare(
      `
      INSERT INTO staff_tasks (id, title, priority, assigned_to)
      VALUES (?, ?, ?, ?)
    `,
    ).run(id, title, priority, assigned_to || null);

    audit(req, "staff.create_task", {
      taskId: id,
      title,
      priority,
      assigned_to,
    });

    res.status(201).json({ success: true, message: "Task created." });
  },
);

// PATCH /api/staff/tasks/:id
router.patch(
  "/tasks/:id",
  requireAuth,
  [
    body("status")
      .isIn(["pending", "in_progress", "completed"])
      .withMessage("Invalid status."),
  ],
  validate,
  (req, res) => {
    const { status } = req.body;
    db.prepare(
      "UPDATE staff_tasks SET status = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(status, req.params.id);

    audit(req, "staff.update_task_status", { taskId: req.params.id, status });

    res.json({ success: true, message: "Task status updated." });
  },
);

module.exports = router;
