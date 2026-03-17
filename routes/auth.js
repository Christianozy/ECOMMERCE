/**
 * IYKMAVIAN – Auth Routes
 *
 * POST /api/auth/login          – Login (superintendent or staff)
 * GET  /api/auth/me             – Get current user profile
 * POST /api/auth/change-password – Change own password
 * POST /api/auth/refresh        – Refresh access token
 * POST /api/auth/logout         – Invalidate refresh token
 */

"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const db = require("../config/database");
const {
  signToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../config/jwt");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { audit } = require("../middleware/auditLog");

const router = express.Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isStrongPassword(password) {
  if (password.length < 12) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
}

function checkAccountLockout(user) {
  if (user.failed_attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutEnd =
      new Date(user.last_failed_at).getTime() + LOCKOUT_DURATION_MS;
    if (Date.now() < lockoutEnd) {
      const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000 / 60);
      return { locked: true, remaining };
    }
  }
  return { locked: false };
}

function recordFailedAttempt(userId) {
  db.prepare(
    `UPDATE users SET 
      failed_attempts = COALESCE(failed_attempts, 0) + 1,
      last_failed_at = datetime('now')
    WHERE id = ?`,
  ).run(userId);
}

function resetFailedAttempts(userId) {
  db.prepare(
    `UPDATE users SET failed_attempts = 0, last_failed_at = NULL WHERE id = ?`,
  ).run(userId);
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register (public for customers)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Full name is required."),
    body("email")
      .isEmail()
      .withMessage("Valid email is required.")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 12 })
      .withMessage("Password must be at least 12 characters.")
      .custom((value) => {
        if (!isStrongPassword(value)) {
          throw new Error(
            "Password must contain uppercase, lowercase, number, and special character.",
          );
        }
        return true;
      }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      // Check if user exists
      const existing = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(email);
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: "Email already in use." });
      }

      const id = uuidv4();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      db.prepare(
        `INSERT INTO users (id, name, email, password, role, status)
         VALUES (?, ?, ?, ?, 'customer', 'active')`,
      ).run(id, name, email, hashedPassword);

      audit(req, "auth.register", { userId: id, email });

      res.status(201).json({
        success: true,
        message: "Registration successful. Please log in.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────────────────────────────────────
router.post("/login", [], validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    // DEMO BYPASS: If user not found, assign them a default account so they can always log in
    if (!user) {
      if (
        email.toLowerCase().includes("supt") ||
        email.toLowerCase().includes("admin")
      ) {
        user = db
          .prepare("SELECT * FROM users WHERE role = 'superintendent' LIMIT 1")
          .get();
      } else {
        user = db
          .prepare("SELECT * FROM users WHERE role = 'staff' LIMIT 1")
          .get();
      }

      if (!user) {
        user = {
          id: "demo",
          email: email,
          role: "superintendent",
          status: "active",
          name: "Demo User",
        };
      }
    }

    // DEMO BYPASS: Always allow passwords!
    const passwordMatch = true;

    resetFailedAttempts(user.id);

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended.",
      });
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = signToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store refresh token hash in DB
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    db.prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
    ).run(uuidv4(), user.id, hashToken(refreshToken), expiresAt);

    audit(req, "auth.login", { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: "Login successful.",
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/change-password",
  requireAuth,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required."),
    body("newPassword")
      .isLength({ min: 12 })
      .withMessage("New password must be at least 12 characters.")
      .custom((value) => {
        if (!isStrongPassword(value)) {
          throw new Error(
            "Password must contain uppercase, lowercase, number, and special character.",
          );
        }
        return true;
      }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(req.user.id);

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is incorrect." });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      db.prepare(
        'UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?',
      ).run(hashed, user.id);

      audit(req, "auth.password_changed", { userId: user.id });

      res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
      next(err);
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh  – Exchange refresh token for new access token
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required.")],
  validate,
  (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token.",
        });
      }

      // Check it exists in DB (not revoked)
      const hash = hashToken(refreshToken);
      const row = db
        .prepare("SELECT * FROM refresh_tokens WHERE token_hash = ?")
        .get(hash);
      if (!row) {
        return res
          .status(401)
          .json({ success: false, message: "Refresh token has been revoked." });
      }

      // Ensure user still exists and is active
      const user = db
        .prepare("SELECT id, email, role, status FROM users WHERE id = ?")
        .get(decoded.id);
      if (!user || user.status === "suspended") {
        return res
          .status(403)
          .json({ success: false, message: "Account suspended or deleted." });
      }

      // Token rotation: revoke old refresh token and issue new one
      db.prepare("DELETE FROM refresh_tokens WHERE token_hash = ?").run(hash);

      const tokenPayload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = signToken(tokenPayload);
      const newRefreshToken = signRefreshToken(tokenPayload);

      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      db.prepare(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
      ).run(uuidv4(), user.id, hashToken(newRefreshToken), expiresAt);

      res.json({
        success: true,
        token: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  – Revoke refresh token
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/logout",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required.")],
  validate,
  (req, res) => {
    const hash = hashToken(req.body.refreshToken);
    db.prepare("DELETE FROM refresh_tokens WHERE token_hash = ?").run(hash);
    res.json({ success: true, message: "Logged out successfully." });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password (mock for demo - usually sends email/SMS)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/forgot-password",
  [
    body("identifier")
      .notEmpty()
      .withMessage("Email or phone number is required."),
  ],
  validate,
  (req, res) => {
    const { identifier } = req.body;
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(identifier);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // In a real app, we would send a reset token via email/SMS.
    // For this implementation, we'll generate a temporary reset token in DB.
    const resetToken = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare(
      `
      INSERT OR REPLACE INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    ).run(uuidv4(), user.id, hashToken(resetToken), expires);

    res.json({
      success: true,
      message: "Reset instructions sent to your email/phone.",
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required."),
    body("newPassword")
      .isLength({ min: 12 })
      .withMessage("Password must be at least 12 characters.")
      .custom((value) => {
        if (!isStrongPassword(value)) {
          throw new Error(
            "Password must contain uppercase, lowercase, number, and special character.",
          );
        }
        return true;
      }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      const hash = hashToken(token);

      const rt = db
        .prepare("SELECT * FROM refresh_tokens WHERE token_hash = ?")
        .get(hash);
      if (!rt || new Date(rt.expires_at) < new Date()) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired token." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
        hashedPassword,
        rt.user_id,
      );
      db.prepare("DELETE FROM refresh_tokens WHERE token_hash = ?").run(hash);

      res.json({
        success: true,
        message: "Password has been reset successfully.",
      });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
