/**
 * IYKMAVIAN – Audit Log Middleware & Helper
 *
 * Records every sensitive action to the activity_logs table.
 * Usage in a route:
 *   audit(req, 'order.status_changed', { orderId: id, from: old, to: newVal });
 */

"use strict";

const db = require("../config/database");

/**
 * Write an audit log entry synchronously.
 *
 * @param {import('express').Request} req  – Express request (for actor info)
 * @param {string}  action  – dot-namespaced event name, e.g. "order.cancelled"
 * @param {object}  [meta]  – arbitrary key/value context to store as JSON
 */
function audit(req, action, meta = {}) {
  try {
    const actor_id = req.user?.id || null;
    const actor_email = req.user?.email || "system";
    const ip = req.ip || req.connection?.remoteAddress || null;

    db.prepare(
      `INSERT INTO activity_logs (actor_id, actor_email, action, meta_json, ip)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(actor_id, actor_email, action, JSON.stringify(meta), ip);
  } catch (err) {
    // Audit logging should never crash the main request
    console.error("[AUDIT ERROR]", err.message);
  }
}

module.exports = { audit };
