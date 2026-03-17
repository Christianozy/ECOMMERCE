/**
 * IYKMAVIAN – Auth Middleware
 * Protects routes by validating Bearer JWT tokens
 */

"use strict";

const { verifyToken } = require("../config/jwt");
const db = require("../config/database");

/**
 * Require a valid JWT.
 * Attaches `req.user` = { id, email, role, department, status }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided. Please log in." });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }

  // Fetch fresh user from DB (ensures revoked / suspended accounts are blocked)
  const user = db
    .prepare(
      "SELECT id, name, email, role, department, status FROM users WHERE id = ?",
    )
    .get(decoded.id);

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "User no longer exists." });
  }
  if (user.status === "suspended") {
    return res
      .status(403)
      .json({ success: false, message: "Your account is suspended." });
  }

  req.user = user;
  next();
}

/**
 * Role-based guard factory.
 * Usage: requireRole('superintendent') or requireRole(['superintendent', 'staff'])
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated." });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowed.join(", ")}.`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
