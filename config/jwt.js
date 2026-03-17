/**
 * KriloxHub – JWT helper utilities
 * Supports access tokens (short-lived) + refresh tokens (longer-lived)
 */

"use strict";

const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET = process.env.JWT_SECRET || "iykmavian_dev_secret";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "iykmavian_refresh_secret";
const EXPIRES = process.env.JWT_EXPIRES_IN || "8h";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  signToken,
  verifyToken,
  signRefreshToken,
  verifyRefreshToken,
};
