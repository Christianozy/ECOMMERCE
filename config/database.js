/**
 * KriloxHub – SQLite Database Setup & Schema
 * Uses better-sqlite3 (synchronous, no extra process needed)
 */

"use strict";

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "../../data/kriloxhub.db");

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ──────────────────────────────────────────────
// SCHEMA
// ──────────────────────────────────────────────
db.exec(`
  /* ── Users / Auth ─────────────────────────── */
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'staff',
    department  TEXT,
    status      TEXT NOT NULL DEFAULT 'active',    -- active | on_leave | suspended
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Products / Catalogue ──────────────────── */
  CREATE TABLE IF NOT EXISTS products (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    description         TEXT,
    price               REAL NOT NULL DEFAULT 0,
    stock               INTEGER NOT NULL DEFAULT 0,
    category            TEXT,
    image_url           TEXT,
    requires_cold_chain INTEGER NOT NULL DEFAULT 0,
    is_active           INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Orders ────────────────────────────────── */
  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    customer_name   TEXT NOT NULL,
    customer_email  TEXT,
    customer_phone  TEXT,
    items_json      TEXT NOT NULL,   -- JSON array of {id,name,price,quantity}
    total           REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',   -- pending | confirmed | processing | delivered | cancelled
    payment_status  TEXT NOT NULL DEFAULT 'unpaid',   -- unpaid | pending_verify | paid | refunded
    notes           TEXT,
    user_id         TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Payments ──────────────────────────────── */
  CREATE TABLE IF NOT EXISTS payments (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL REFERENCES orders(id),
    amount      REAL NOT NULL,
    method      TEXT NOT NULL DEFAULT 'bank_transfer',  -- bank_transfer | paystack | flutterwave
    reference   TEXT,
    receipt_url TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',        -- pending | verified | failed
    logged_by   TEXT REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Consultations (Telemedicine) ──────────── */
  CREATE TABLE IF NOT EXISTS consultations (
    id              TEXT PRIMARY KEY,
    patient_name    TEXT NOT NULL,
    age             INTEGER,
    gender          TEXT,
    symptoms        TEXT NOT NULL,
    medical_history TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',   -- pending | in_review | completed | rejected
    assigned_to     TEXT,
    wa_sent         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Newsletter Subscribers ────────────────── */
  CREATE TABLE IF NOT EXISTS newsletter (
    id         TEXT PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Staff Approvals (internal orders/requests) */
  CREATE TABLE IF NOT EXISTS staff_requests (
    id           TEXT PRIMARY KEY,
    department   TEXT NOT NULL,
    item         TEXT NOT NULL,
    priority     TEXT NOT NULL DEFAULT 'normal',   -- normal | high
    requested_by TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | denied | active
    notes        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Batch Orders (B2B) ────────────────────── */
  CREATE TABLE IF NOT EXISTS batch_orders (
    id              TEXT PRIMARY KEY,
    organization    TEXT NOT NULL,
    org_type        TEXT,
    reg_no          TEXT,
    contact_person  TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    items_json      TEXT NOT NULL,   -- can be a JSON array or raw string of requirements
    notes           TEXT,
    total           REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Prescriptions ─────────────────────────── */
  CREATE TABLE IF NOT EXISTS prescriptions (
    id              TEXT PRIMARY KEY,
    order_id        TEXT NOT NULL REFERENCES orders(id),
    patient_name    TEXT NOT NULL,
    doctor_name     TEXT NOT NULL,
    image_url       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Expiry Tracking ───────────────────────── */
  CREATE TABLE IF NOT EXISTS inventory_batches (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL REFERENCES products(id),
    batch_number    TEXT NOT NULL,
    expiry_date     TEXT NOT NULL,
    quantity        INTEGER NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Restock Requests ──────────────────────── */
  CREATE TABLE IF NOT EXISTS restock_requests (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL REFERENCES products(id),
    requested_by    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | ordered | received
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Refresh Tokens (for logout / token invalidation) ── */
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Staff Tasks ──────────────────────────── */
  CREATE TABLE IF NOT EXISTS staff_tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    priority    TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
    status      TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | completed
    assigned_to TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Activity / Audit Logs ──────────────────────────── */
  CREATE TABLE IF NOT EXISTS activity_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id    TEXT,
    actor_email TEXT,
    action      TEXT NOT NULL,
    meta_json   TEXT,
    ip          TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── Delivery Logs ─────────────────────────────────── */
  CREATE TABLE IF NOT EXISTS delivery_logs (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL REFERENCES orders(id),
    staff_name  TEXT NOT NULL,
    status      TEXT NOT NULL, -- picked_up | in_transit | out_for_delivery | delivered
    location    TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Migrations ───────────────────────────────────────────────────────────────
// Use try-catch for ALTER TABLE to handle cases where columns might already exist
function safeAddColumn(tableName, columnName, columnDef) {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!tableInfo.some((col) => col.name === columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`[DB MIGRATION] Added column ${columnName} to ${tableName}`);
    }
  } catch (e) {
    console.error(
      `[DB MIGRATION ERROR] ${tableName}.${columnName}:`,
      e.message,
    );
  }
}

safeAddColumn("orders", "user_id", "TEXT REFERENCES users(id)");
safeAddColumn("payments", "receipt_url", "TEXT");
safeAddColumn("products", "requires_cold_chain", "INTEGER NOT NULL DEFAULT 0");
safeAddColumn("users", "failed_attempts", "INTEGER NOT NULL DEFAULT 0");
safeAddColumn("users", "last_failed_at", "TEXT");

module.exports = db;
