/**
 * IYKMAVIAN – File Upload Middleware (Multer)
 *
 * Handles multipart/form-data uploads for:
 *   - Product images  (field: "image")
 *   - Payment proofs  (field: "receipt")
 *
 * Files are stored in: backend/uploads/<subfolder>/
 * Public URL:          http://localhost:5000/uploads/<subfolder>/<filename>
 */

"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

// ── Helper: ensure upload directory exists ────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Storage factory ───────────────────────────────────────────────────────────
function makeStorage(subfolder) {
  const dest = path.join(__dirname, "../../uploads", subfolder);
  ensureDir(dest);

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${subfolder}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, name);
    },
  });
}

// ── File-type filter factory ──────────────────────────────────────────────────
function makeFilter(allowedTypes) {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        Object.assign(
          new Error("Invalid file type. Allowed: " + allowedTypes.join(", ")),
          {
            status: 400,
          },
        ),
        false,
      );
    }
  };
}

// ── Multer instances ──────────────────────────────────────────────────────────

/** For product images (5 MB max) */
const uploadProductImage = multer({
  storage: makeStorage("products"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: makeFilter(ALLOWED_IMAGE_TYPES),
}).single("image");

/** For payment proof / receipt (10 MB max – allows PDF) */
const uploadReceipt = multer({
  storage: makeStorage("receipts"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: makeFilter(ALLOWED_DOC_TYPES),
}).single("receipt");

/** For prescription uploads (10 MB max) */
const uploadPrescription = multer({
  storage: makeStorage("prescriptions"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: makeFilter(ALLOWED_DOC_TYPES),
}).single("prescription");

// ── Wrapper that converts multer callback to middleware-compatible promise ────
function wrapUpload(uploadFn) {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ success: false, message: "File too large." });
      }
      return res
        .status(err.status || 400)
        .json({ success: false, message: err.message });
    });
  };
}

module.exports = {
  uploadProductImage: wrapUpload(uploadProductImage),
  uploadReceipt: wrapUpload(uploadReceipt),
  uploadPrescription: wrapUpload(uploadPrescription),
};
