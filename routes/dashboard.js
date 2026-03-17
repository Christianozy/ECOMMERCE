/**
 * IYKMAVIAN – Dashboard / KPI Routes  (superintendent only)
 *
 * GET /api/dashboard/kpis        – High-level key performance indicators
 * GET /api/dashboard/trends      – Last 30 days revenue
 * GET /api/dashboard/expiry      – Upcoming expiries (6 months)
 * GET /api/dashboard/audit       – System audit logs
 * GET /api/dashboard/summary     – Full management summary
 */

"use strict";

const express = require("express");
const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/kpis
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/kpis",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    try {
      const totalStaff = db
        .prepare(
          `SELECT COUNT(*) AS n FROM users WHERE role != 'superintendent'`,
        )
        .get().n;
      const activeStaff = db
        .prepare(
          `SELECT COUNT(*) AS n FROM users WHERE role != 'superintendent' AND status = 'active'`,
        )
        .get().n;
      const totalOrders = db
        .prepare("SELECT COUNT(*) AS n FROM orders")
        .get().n;
      const pendingOrders = db
        .prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'`)
        .get().n;
      const revenueRow = db
        .prepare(
          `SELECT SUM(total) AS r FROM orders WHERE payment_status = 'paid'`,
        )
        .get();
      const totalRevenue = revenueRow.r ?? 0;
      const pendingPayments = db
        .prepare(`SELECT COUNT(*) AS n FROM payments WHERE status = 'pending'`)
        .get().n;
      const pendingConsults = db
        .prepare(
          `SELECT COUNT(*) AS n FROM consultations WHERE status = 'pending'`,
        )
        .get().n;
      const pendingApprovals = db
        .prepare(
          `SELECT COUNT(*) AS n FROM staff_requests WHERE status = 'pending'`,
        )
        .get().n;
      const lowStockProducts = db
        .prepare(
          "SELECT COUNT(*) AS n FROM products WHERE stock < 10 AND is_active = 1",
        )
        .get().n;
      const newsletterSubs = db
        .prepare("SELECT COUNT(*) AS n FROM newsletter WHERE is_active = 1")
        .get().n;

      res.json({
        success: true,
        data: {
          totalStaff,
          activeStaff,
          totalOrders,
          pendingOrders,
          totalRevenue,
          pendingPayments,
          pendingConsultations: pendingConsults,
          pendingApprovals,
          lowStockProducts,
          newsletterSubscribers: newsletterSubs,
        },
      });
    } catch (err) {
      console.error("KPIs Dashboard Error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/trends  (last 30 days)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/trends",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    try {
      // Daily revenue for the last 30 days using recursive CTE
      const revenueTrend = db
        .prepare(
          `
          WITH RECURSIVE dates(date) AS (
            SELECT date('now', '-29 days')
            UNION ALL
            SELECT date(date, '+1 day') FROM dates WHERE date < date('now')
          )
          SELECT 
            d.date, 
            COALESCE(SUM(o.total), 0) AS revenue,
            COUNT(o.id) AS orders
          FROM dates d
          LEFT JOIN orders o ON date(o.created_at) = d.date AND o.payment_status = 'paid'
          GROUP BY d.date
          ORDER BY d.date ASC
        `,
        )
        .all();

      res.json({ success: true, data: revenueTrend });
    } catch (err) {
      console.error("Trends Error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/expiry (staff – products expiring within 6 months)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/expiry",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  (req, res) => {
    try {
      const expiring = db
        .prepare(
          `
        SELECT 
          b.batch_number, 
          b.expiry_date, 
          b.quantity, 
          p.name as product_name,
          (julianday(b.expiry_date) - julianday('now')) as days_to_expiry
        FROM inventory_batches b
        JOIN products p ON b.product_id = p.id
        WHERE julianday(b.expiry_date) <= julianday('now', '+180 days')
        ORDER BY b.expiry_date ASC
      `,
        )
        .all();

      res.json({ success: true, data: expiring });
    } catch (err) {
      console.error("Expiry Dashboard Error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/audit (superintendent – system logs)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/audit", requireAuth, requireRole("superintendent"), (req, res) => {
  try {
    const logs = db
      .prepare("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100")
      .all();
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error("Audit Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/summary",
  requireAuth,
  requireRole("superintendent"),
  (req, res) => {
    try {
      // Recent orders (last 10)
      const recentOrders = db
        .prepare(
          "SELECT id, customer_name, total, status, payment_status, created_at FROM orders ORDER BY created_at DESC LIMIT 10",
        )
        .all();

      // Staff status breakdown
      const staffBreakdown = db
        .prepare(
          `SELECT status, COUNT(*) AS count FROM users WHERE role = 'staff' GROUP BY status`,
        )
        .all();

      // Top 5 pending supply requests
      const pendingRequests = db
        .prepare(
          `SELECT * FROM staff_requests WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 5`,
        )
        .all();

      // Unverified payments
      const unverifiedPayments = db
        .prepare(
          `SELECT p.id, p.amount, p.method, p.created_at, o.customer_name FROM payments p LEFT JOIN orders o ON p.order_id = o.id WHERE p.status = 'pending' ORDER BY p.created_at DESC LIMIT 5`,
        )
        .all();

      // Recent consultations
      const recentConsultations = db
        .prepare(
          "SELECT id, patient_name, symptoms, status, created_at FROM consultations ORDER BY created_at DESC LIMIT 5",
        )
        .all();

      // Low-stock alert
      const lowStock = db
        .prepare(
          "SELECT id, name, stock FROM products WHERE stock < 10 AND is_active = 1 ORDER BY stock ASC LIMIT 10",
        )
        .all();

      res.json({
        success: true,
        data: {
          recentOrders,
          staffBreakdown,
          pendingRequests,
          unverifiedPayments,
          recentConsultations,
          lowStockAlerts: lowStock,
        },
      });
    } catch (err) {
      console.error("Summary Dashboard Error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/export.csv  (superintendent)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/export.csv",
  requireAuth,
  requireRole("superintendent"),
  (req, res) => {
    try {
      const kpi = {
        totalStaff: db
          .prepare(
            `SELECT COUNT(*) AS n FROM users WHERE role != 'superintendent'`,
          )
          .get().n,
        activeStaff: db
          .prepare(
            `SELECT COUNT(*) AS n FROM users WHERE role != 'superintendent' AND status = 'active'`,
          )
          .get().n,
        totalOrders: db.prepare("SELECT COUNT(*) AS n FROM orders").get().n,
        pendingOrders: db
          .prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'`)
          .get().n,
        revenue:
          db
            .prepare(
              `SELECT SUM(total) AS r FROM orders WHERE payment_status = 'paid'`,
            )
            .get().r ?? 0,
      };
      const recent = db
        .prepare(
          "SELECT id, customer_name, total, status, payment_status, created_at FROM orders ORDER BY created_at DESC LIMIT 10",
        )
        .all();

      let lines = [];
      lines.push("Metric,Value");
      lines.push(`Total Staff,${kpi.totalStaff}`);
      lines.push(`Active Staff,${kpi.activeStaff}`);
      lines.push(`Total Orders,${kpi.totalOrders}`);
      lines.push(`Pending Orders,${kpi.pendingOrders}`);
      lines.push(`Total Revenue,${kpi.revenue}`);
      lines.push("");
      lines.push("Recent Orders");
      lines.push("ID,Customer,Total,Status,Payment Status,Created At");
      for (const r of recent) {
        lines.push(
          [
            r.id,
            `"${(r.customer_name || "").replaceAll('"', '""')}"`,
            r.total,
            r.status,
            r.payment_status,
            r.created_at,
          ].join(","),
        );
      }
      const csv = lines.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="dashboard-${Date.now()}.csv"`,
      );
      res.send(csv);
    } catch (err) {
      console.error("Export CSV Dashboard Error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

module.exports = router;
