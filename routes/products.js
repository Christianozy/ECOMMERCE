/**
 * IYKMAVIAN – Products Routes
 *
 * GET    /api/products            – List all active products (public)
 * GET    /api/products/:id        – Get single product (public)
 * POST   /api/products            – Create product (superintendent)
 * PUT    /api/products/:id        – Update product (superintendent or staff)
 * DELETE /api/products/:id        – Soft-delete product (superintendent)
 * PATCH  /api/products/:id/stock  – Adjust stock (staff inventory)
 * POST   /api/products/:id/batches – Add an inventory batch with expiry
 */

"use strict";

const express = require("express");
const { body, query, param } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadProductImage } = require("../middleware/upload");
const { audit } = require("../middleware/auditLog");

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/products  (public)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    page = 1,
    pageSize = 50,
  } = req.query;

  let sql = "SELECT * FROM products WHERE is_active = 1";
  const args = [];

  if (category) {
    sql += " AND category = ?";
    args.push(category);
  }
  if (search) {
    sql += " AND name LIKE ?";
    args.push(`%${search}%`);
  }
  if (minPrice) {
    sql += " AND price >= ?";
    args.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    sql += " AND price <= ?";
    args.push(parseFloat(maxPrice));
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  const size = Math.min(Math.max(Number(pageSize), 1), 100);
  const offset = (Math.max(Number(page), 1) - 1) * size;
  args.push(size, offset);

  const products = db.prepare(sql).all(...args);
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM products WHERE is_active = 1")
    .get().n;
  res.json({
    success: true,
    page: Number(page),
    pageSize: size,
    total,
    count: products.length,
    data: products,
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/products/:id  (public)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE id = ? AND is_active = 1")
    .get(req.params.id);

  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found." });
  res.json({ success: true, data: product });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/products  (superintendent only)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole("superintendent"),
  [
    body("name").notEmpty().withMessage("Product name is required."),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number."),
    body("stock")
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer."),
  ],
  validate,
  (req, res) => {
    const {
      name,
      description,
      price,
      stock,
      category,
      image_url,
      requires_cold_chain,
    } = req.body;
    const id = uuidv4();

    db.prepare(
      `INSERT INTO products (id, name, description, price, stock, category, image_url, requires_cold_chain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      name,
      description || null,
      price,
      stock || 0,
      category || null,
      image_url || null,
      requires_cold_chain ? 1 : 0,
    );

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);

    audit(req, "product.create", { productId: id, name, price });

    res
      .status(201)
      .json({ success: true, message: "Product created.", data: product });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/products/:id/image  (upload image)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/image",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  uploadProductImage,
  (req, res) => {
    const product = db
      .prepare("SELECT * FROM products WHERE id = ? AND is_active = 1")
      .get(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No image file provided." });

    const url = `/uploads/products/${req.file.filename}`;
    db.prepare(
      `UPDATE products SET image_url = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(url, product.id);

    audit(req, "product.upload_image", {
      productId: product.id,
      imageUrl: url,
    });

    const updated = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(product.id);
    res.json({
      success: true,
      message: "Image uploaded.",
      data: updated,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/products/:id  (superintendent or staff)
// ──────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number."),
    body("stock")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer."),
  ],
  validate,
  (req, res) => {
    const product = db
      .prepare("SELECT * FROM products WHERE id = ? AND is_active = 1")
      .get(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    const { name, description, price, stock, category, image_url } = req.body;

    db.prepare(
      `UPDATE products
       SET name = ?, description = ?, price = ?, stock = ?, category = ?, image_url = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(
      name ?? product.name,
      description ?? product.description,
      price ?? product.price,
      stock ?? product.stock,
      category ?? product.category,
      image_url ?? product.image_url,
      product.id,
    );

    const updated = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(product.id);

    audit(req, "product.update", { productId: product.id, name: updated.name });

    res.json({ success: true, message: "Product updated.", data: updated });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id  (superintendent only – soft delete)
// ──────────────────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  requireAuth,
  requireRole("superintendent"),
  (req, res) => {
    const product = db
      .prepare("SELECT id FROM products WHERE id = ? AND is_active = 1")
      .get(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    db.prepare(
      `UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
    ).run(product.id);

    audit(req, "product.delete", { productId: product.id });

    res.json({ success: true, message: "Product removed from catalogue." });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/products/:id/stock  (staff – inventory adjustment)
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/stock",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("delta")
      .isInt()
      .withMessage(
        "delta must be an integer (positive to add, negative to deduct).",
      ),
  ],
  validate,
  (req, res) => {
    const product = db
      .prepare("SELECT * FROM products WHERE id = ? AND is_active = 1")
      .get(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    const newStock = Math.max(0, product.stock + Number(req.body.delta));
    db.prepare(
      `UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(newStock, product.id);

    audit(req, "product.stock_adjust", {
      productId: product.id,
      delta: req.body.delta,
      newStock,
    });

    res.json({
      success: true,
      message: "Stock adjusted.",
      data: { id: product.id, stock: newStock },
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/products/:id/batches (staff – add inventory batch with expiry)
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/:id/batches",
  requireAuth,
  requireRole(["superintendent", "staff"]),
  [
    body("batch_number").notEmpty().withMessage("Batch number is required."),
    body("expiry_date").isDate().withMessage("Valid expiry date is required."),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1."),
  ],
  validate,
  (req, res) => {
    const { id } = req.params;
    const { batch_number, expiry_date, quantity } = req.body;

    const product = db
      .prepare("SELECT id, stock FROM products WHERE id = ?")
      .get(id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    const batchId = uuidv4();
    db.prepare(
      `
      INSERT INTO inventory_batches (id, product_id, batch_number, expiry_date, quantity)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(batchId, id, batch_number, expiry_date, quantity);

    // Update main product stock
    const newStock = product.stock + Number(quantity);
    db.prepare(
      `UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(newStock, id);

    audit(req, "product.add_batch", {
      productId: id,
      batchNumber: batch_number,
      quantity,
    });

    res.status(201).json({
      success: true,
      message: "Inventory batch added.",
      data: { batchId, newStock },
    });
  },
);

module.exports = router;
