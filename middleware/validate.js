/**
 * IYKMAVIAN – Validation Helper
 * Wraps express-validator's validationResult into a consistent response
 */

"use strict";

const { validationResult } = require("express-validator");

/**
 * Call after express-validator chains.
 * Returns 422 with field-level errors if validation fails.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validate };
