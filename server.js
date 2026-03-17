/**
 * IYKMAVIAN Pharmaceuticals Backend – Main Server Entry Point
 * ─────────────────────────────────────────────
 * Base URL: http://localhost:5000
 *
 * API Routes:
 *   /api/auth           – Authentication
 *   /api/products       – Product catalogue
 *   /api/orders         – Customer orders
 *   /api/payments       – Payment logging & verification
 *   /api/consultations  – Telemedicine form submissions
 *   /api/staff          – Staff management & internal requests
 *   /api/newsletter     – Newsletter subscriptions
 *   /api/dashboard      – KPIs & management summary
 *   /api/health         – Health check
 */

"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payments");
const consultationRoutes = require("./routes/consultations");
const staffRoutes = require("./routes/staff");
const newsletterRoutes = require("./routes/newsletter");
const dashboardRoutes = require("./routes/dashboard");
const auditRoutes = require("./routes/audit");
const batchOrderRoutes = require("./routes/batchOrders");
const restockRoutes = require("./routes/restock");

const { errorHandler, notFound } = require("./middleware/errorHandler");

// ── Database (auto-creates schema on first run) ──────────────────────────────
require("./config/database");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & basic middleware ───────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:5500"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      // Allow requests from allowed origins OR no origin (e.g. direct API tools / same-origin / any local ports / file:// execution)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://localhost:") ||
        origin === "null"
      )
        return cb(null, true);
      cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
    fallthrough: true,
  }),
);

// ── Global Rate Limiter ───────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many login attempts. Please wait 15 minutes.",
  },
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/batch-orders", batchOrderRoutes);
app.use("/api/restock-requests", restockRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "IYKMAVIAN API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// ── Frontend Static Serving (Bypass Live Server) ──────────────────────────────
app.use(express.static(path.join(__dirname, "../../")));

// ── Fallback & Error Handling ─────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║      IYKMAVIAN Pharmaceutical API  –  Server Running      ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  🌐  http://localhost:${PORT}                         ║`);
  console.log(
    `║  📋  Environment : ${(process.env.NODE_ENV || "development").padEnd(28)} ║`,
  );
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  Routes available:                               ║");
  console.log(`║    POST   /api/auth/login                        ║`);
  console.log(`║    GET    /api/products                          ║`);
  console.log(`║    POST   /api/orders                            ║`);
  console.log(`║    POST   /api/payments                          ║`);
  console.log(`║    POST   /api/consultations                     ║`);
  console.log(`║    POST   /api/newsletter                        ║`);
  console.log(`║    GET    /api/dashboard/kpis                    ║`);
  console.log(`║    GET    /api/health                            ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
});

module.exports = app;
