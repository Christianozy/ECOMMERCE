/**
 * IYKMAVIAN – Error Handler Middleware
 * Catches all errors passed via next(err) and returns a consistent JSON shape
 */

"use strict";

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== "production";
  const status = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected server error occurred.";

  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err);

  res.status(status).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
}

/**
 * 404 Catch-all – place AFTER all routes
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFound };
