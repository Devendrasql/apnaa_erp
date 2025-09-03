/**
 * Products Controller - Industry grade
 * - FMCG: strength_label is NOT stored (NULL)
 * - SKU, BARCODE (optional) supported
 * - NEW: rack_id & std_disc_id persisted and returned
 * - Strong validation & soft-deletes to avoid FK issues
 * - Update flow updates existing variants and soft-deletes removed ones
 */

const { executeQuery, getConnection } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/* ---------------------- Helpers ---------------------- */

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function requireNumber(val, message, { min = null, max = null } = {}) {
  const n = Number(val);
  if (!Number.isFinite(n)) throw httpError(message, 400);
  if (min !== null && n < min) throw httpError(message, 400);
  if (max !== null && n > max) throw httpError(message, 400);
  return n;
}

function optionalNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function sanitizeStr(s) {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

/* ---------------------- Queries ---------------------- */

const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const offset = (p - 1) * l;

    let whereClause = 'WHERE p.is_deleted = FALSE';
    const params = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.generic_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const productsQuery = `
      SELECT p.*, c.name AS category_name, m.name AS manufacturer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT ${l} OFFSET ${offset};
    `;
    const countQuery = `SELECT COUNT(p.id) AS total FROM products p ${whereClause};`;

    const products = await executeQuery(productsQuery, params);
    const [count] = await executeQuery(countQuery, params);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total: count.total,
        page: p,
        limit: l,
        totalPages: Math.ceil(count.total / l)
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const productQuery = `SELECT * FROM products WHERE id = ? AND is_deleted = FALSE;`;
    const [product] = await executeQuery(productQuery, [id]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // include latest MRP and all variant columns (pv.* includes rack_id,std_disc_id if present)
    const variantsQuery = `
      SELECT
        pv.*,
        (
          SELECT pp.price
          FROM product_prices pp
          WHERE pp.variant_id = pv.id
          ORDER BY pp.effective_from DESC, pp.id DESC
          LIMIT 1
        ) AS mrp
      FROM product_variants pv
      WHERE pv.product_id = ? AND pv.is_deleted = FALSE
      ORDER BY pv.id ASC;
    `;
    const variants = await executeQuery(variantsQuery, [id]);

    if (product.product_type === 'PHARMA') {
      for (const v of variants) {
        const ingredientsQuery = `
          SELECT i.name, vi.strength_value, vi.strength_uom
          FROM variant_ingredients vi
          JOIN ingredients i ON vi.ingredient_id = i.id
          WHERE vi.variant_id = ?;
        `;
        v.ingredients = await executeQuery(ingredientsQuery, [v.id]);
      }
    } else {
      for (const v of variants) v.ingredients = [];
    }

    product.variants = variants;
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    logger.error(`Error fetching product with ID ${req.params.id}:`, error);
    next(error);
  }
};

/* ---------------------- Create ---------------------- */

const createProduct = async (req, res, next) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw httpError('Validation failed', 400);
    }

    const { master, variants } = req.body;
    const orgId = req.user?.org_id || 1;

    // High-level rules
    if (!master?.product_type || !['PHARMA', 'GENERAL'].includes(master.product_type)) {
      throw httpError('Product Type must be PHARMA or GENERAL', 400);
    }
    if (!Array.isArray(variants) || variants.length < 1) {
      throw httpError('At least one product variant is required.', 400);
    }
    if (!master.name || !master.category_id || !master.manufacturer_id) {
      throw httpError('Master fields missing: name, category_id, manufacturer_id are required.', 400);
    }

    // Pharma-specific: must have at least one ingredient across all variants
    if (master.product_type === 'PHARMA') {
      const totalIngs = variants.reduce((n, v) => n + (Array.isArray(v.ingredients) ? v.ingredients.length : 0), 0);
      if (totalIngs < 1) throw httpError('At least one composition is required for Pharma.', 400);
    }

    // Insert product
    const productSql = `
      INSERT INTO products
      (org_id, product_type, name, generic_name, brand_id, category_id, manufacturer_id, hsn_code, is_active, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
    `;
    const [prodRes] = await connection.execute(productSql, [
      orgId,
      master.product_type,
      sanitizeStr(master.name),
      sanitizeStr(master.generic_name),
      master.brand_id || null,
      master.category_id,
      master.manufacturer_id,
      sanitizeStr(master.hsn_code),
      master.is_active ? 1 : 0
    ]);
    const newProductId = prodRes.insertId;

    // Price list id for "Retail"
    const [retailPL] = await connection.execute(
      `SELECT id FROM price_lists WHERE name = 'Retail' AND org_id = ? LIMIT 1;`,
      [orgId]
    );
    if (!retailPL.length) throw httpError('Retail price list not found for org.', 500);
    const retailPriceListId = retailPL[0].id;

    // Insert variants (including rack_id & std_disc_id)
    for (const raw of variants) {
      const qty = requireNumber(raw.pack_qty, 'Variant pack_qty must be a number > 0.', { min: 1 });
      const uomId = requireNumber(raw.pack_uom_id, 'Variant pack_uom_id is required.', { min: 1 });
      const mrp = requireNumber(raw.mrp, 'Variant mrp must be a number > 0.', { min: 0.01 });
      const gstId = requireNumber(raw.default_gst_slab_id, 'Variant default_gst_slab_id (GST Slab) is required.', { min: 1 });

      let dosageFormId = null;
      if (master.product_type === 'PHARMA') {
        if (!raw.dosage_form_id) throw httpError('Dosage Form is required for Pharma products.', 400);
        dosageFormId = raw.dosage_form_id;
      }

      const sku = sanitizeStr(raw.sku);
      const barcode = sanitizeStr(raw.barcode);
      const rackId = optionalNumber(raw.rack_id);
      const stdDiscId = optionalNumber(raw.std_disc_id);

      const strengthLabel = master.product_type === 'GENERAL'
        ? null
        : sanitizeStr(raw.strength_label);

      const [vRes] = await connection.execute(
        `INSERT INTO product_variants
         (org_id, product_id, sku, barcode, dosage_form_id, strength_label,
          pack_qty, pack_uom_id, default_gst_slab_id, rack_id, std_disc_id,
          is_active, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [
          orgId, newProductId, sku, barcode, dosageFormId, strengthLabel,
          qty, uomId, gstId, rackId, stdDiscId,
          raw.is_active ? 1 : 0
        ]
      );
      const variantId = vRes.insertId;

      // Price
      await connection.execute(
        `INSERT INTO product_prices (variant_id, price_list_id, price, effective_from)
         VALUES (?, ?, ?, NOW());`,
        [variantId, retailPriceListId, mrp]
      );

      // Ingredients (Pharma only)
      if (master.product_type === 'PHARMA' && Array.isArray(raw.ingredients) && raw.ingredients.length) {
        for (const ing of raw.ingredients) {
          if (!sanitizeStr(ing.name) || !sanitizeStr(ing.strength_value) || !sanitizeStr(ing.strength_uom)) {
            throw httpError('Each ingredient requires name, strength_value, strength_uom.', 400);
          }
          await connection.execute(`INSERT IGNORE INTO ingredients (name) VALUES (?);`, [sanitizeStr(ing.name)]);
          const [ingIdRows] = await connection.execute(`SELECT id FROM ingredients WHERE name = ? LIMIT 1;`, [sanitizeStr(ing.name)]);
          const ingredientId = ingIdRows[0].id;
          await connection.execute(
            `INSERT INTO variant_ingredients (variant_id, ingredient_id, strength_value, strength_uom)
             VALUES (?, ?, ?, ?);`,
            [variantId, ingredientId, sanitizeStr(ing.strength_value), sanitizeStr(ing.strength_uom)]
          );
        }
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Product created successfully!' });
  } catch (error) {
    try { await (await getConnection()).rollback(); } catch (_) {}
    logger.error('Error creating product:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'An unexpected error occurred.' });
  }
};

/* ---------------------- Update ---------------------- */

const updateProduct = async (req, res, next) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { master, variants } = req.body;
    const orgId = req.user?.org_id || 1;

    if (!master?.product_type || !['PHARMA', 'GENERAL'].includes(master.product_type)) {
      throw httpError('Product Type must be PHARMA or GENERAL', 400);
    }
    if (!Array.isArray(variants) || variants.length < 1) {
      throw httpError('At least one product variant is required.', 400);
    }
    if (!master.name || !master.category_id || !master.manufacturer_id) {
      throw httpError('Master fields missing: name, category_id, manufacturer_id are required.', 400);
    }
    if (master.product_type === 'PHARMA') {
      const totalIngs = variants.reduce((n, v) => n + (Array.isArray(v.ingredients) ? v.ingredients.length : 0), 0);
      if (totalIngs < 1) throw httpError('At least one composition is required for Pharma.', 400);
    }

    // Update product
    await connection.execute(
      `UPDATE products
       SET name = ?, generic_name = ?, brand_id = ?, category_id = ?, manufacturer_id = ?, hsn_code = ?, is_active = ?, product_type = ?
       WHERE id = ?;`,
      [
        sanitizeStr(master.name),
        sanitizeStr(master.generic_name),
        master.brand_id || null,
        master.category_id,
        master.manufacturer_id,
        sanitizeStr(master.hsn_code),
        master.is_active ? 1 : 0,
        master.product_type,
        id
      ]
    );

    // Existing variants for this product
    const existingVariants = await executeQuery(
      `SELECT id FROM product_variants WHERE product_id = ? AND is_deleted = FALSE;`,
      [id]
    );
    const existingIds = new Set(existingVariants.map(v => v.id));
    const incomingIds = new Set(
      variants.filter(v => v.id != null).map(v => Number(v.id))
    );

    // Soft delete variants that were removed from payload
    const toSoftDelete = [...existingIds].filter(x => !incomingIds.has(x));
    if (toSoftDelete.length) {
      await connection.execute(
        `DELETE FROM variant_ingredients WHERE variant_id IN (${toSoftDelete.map(() => '?').join(',')});`,
        toSoftDelete
      );
      await connection.execute(
        `UPDATE product_variants SET is_deleted = TRUE, is_active = FALSE WHERE id IN (${toSoftDelete.map(() => '?').join(',')});`,
        toSoftDelete
      );
      // Prices remain as history
    }

    // Price list id for "Retail"
    const [retailPL] = await connection.execute(
      `SELECT id FROM price_lists WHERE name = 'Retail' AND org_id = ? LIMIT 1;`,
      [orgId]
    );
    if (!retailPL.length) throw httpError('Retail price list not found for org.', 500);
    const retailPriceListId = retailPL[0].id;

    // Upsert variants (including rack_id & std_disc_id)
    for (const raw of variants) {
      const qty = requireNumber(raw.pack_qty, 'Variant pack_qty must be a number > 0.', { min: 1 });
      const uomId = requireNumber(raw.pack_uom_id, 'Variant pack_uom_id is required.', { min: 1 });
      const mrp = requireNumber(raw.mrp, 'Variant mrp must be a number > 0.', { min: 0.01 });
      const gstId = requireNumber(raw.default_gst_slab_id, 'Variant default_gst_slab_id (GST Slab) is required.', { min: 1 });

      let dosageFormId = null;
      if (master.product_type === 'PHARMA') {
        if (!raw.dosage_form_id) throw httpError('Dosage Form is required for Pharma products.', 400);
        dosageFormId = raw.dosage_form_id;
      }

      const sku = sanitizeStr(raw.sku);
      const barcode = sanitizeStr(raw.barcode);
      const rackId = optionalNumber(raw.rack_id);
      const stdDiscId = optionalNumber(raw.std_disc_id);

      const strengthLabel = master.product_type === 'GENERAL'
        ? null
        : sanitizeStr(raw.strength_label);

      if (raw.id && existingIds.has(Number(raw.id))) {
        // Update existing variant
        await connection.execute(
          `UPDATE product_variants
           SET sku = ?, barcode = ?, dosage_form_id = ?, strength_label = ?,
               pack_qty = ?, pack_uom_id = ?, default_gst_slab_id = ?,
               rack_id = ?, std_disc_id = ?,
               is_active = ?, is_deleted = FALSE
           WHERE id = ?;`,
          [sku, barcode, dosageFormId, strengthLabel,
           qty, uomId, gstId,
           rackId, stdDiscId,
           raw.is_active ? 1 : 0, raw.id]
        );

        // New price row
        await connection.execute(
          `INSERT INTO product_prices (variant_id, price_list_id, price, effective_from)
           VALUES (?, ?, ?, NOW());`,
          [raw.id, retailPriceListId, mrp]
        );

        // Ingredients (Pharma only)
        if (master.product_type === 'PHARMA') {
          await connection.execute(`DELETE FROM variant_ingredients WHERE variant_id = ?;`, [raw.id]);
          if (Array.isArray(raw.ingredients) && raw.ingredients.length) {
            for (const ing of raw.ingredients) {
              if (!sanitizeStr(ing.name) || !sanitizeStr(ing.strength_value) || !sanitizeStr(ing.strength_uom)) {
                throw httpError('Each ingredient requires name, strength_value, strength_uom.', 400);
              }
              await connection.execute(`INSERT IGNORE INTO ingredients (name) VALUES (?);`, [sanitizeStr(ing.name)]);
              const [ingIdRows] = await connection.execute(`SELECT id FROM ingredients WHERE name = ? LIMIT 1;`, [sanitizeStr(ing.name)]);
              const ingredientId = ingIdRows[0].id;
              await connection.execute(
                `INSERT INTO variant_ingredients (variant_id, ingredient_id, strength_value, strength_uom)
                 VALUES (?, ?, ?, ?);`,
                [raw.id, ingredientId, sanitizeStr(ing.strength_value), sanitizeStr(ing.strength_uom)]
              );
            }
          }
        } else {
          await connection.execute(`DELETE FROM variant_ingredients WHERE variant_id = ?;`, [raw.id]);
        }
      } else {
        // Insert new variant
        const [vRes] = await connection.execute(
          `INSERT INTO product_variants
           (org_id, product_id, sku, barcode, dosage_form_id, strength_label,
            pack_qty, pack_uom_id, default_gst_slab_id, rack_id, std_disc_id,
            is_active, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
          [orgId, id, sku, barcode, dosageFormId, strengthLabel,
           qty, uomId, gstId, rackId, stdDiscId,
           raw.is_active ? 1 : 0]
        );
        const newVariantId = vRes.insertId;

        await connection.execute(
          `INSERT INTO product_prices (variant_id, price_list_id, price, effective_from)
           VALUES (?, ?, ?, NOW());`,
          [newVariantId, retailPriceListId, mrp]
        );

        if (master.product_type === 'PHARMA' && Array.isArray(raw.ingredients) && raw.ingredients.length) {
          for (const ing of raw.ingredients) {
            if (!sanitizeStr(ing.name) || !sanitizeStr(ing.strength_value) || !sanitizeStr(ing.strength_uom)) {
              throw httpError('Each ingredient requires name, strength_value, strength_uom.', 400);
            }
            await connection.execute(`INSERT IGNORE INTO ingredients (name) VALUES (?);`, [sanitizeStr(ing.name)]);
            const [ingIdRows] = await connection.execute(`SELECT id FROM ingredients WHERE name = ? LIMIT 1;`, [sanitizeStr(ing.name)]);
            const ingredientId = ingIdRows[0].id;
            await connection.execute(
              `INSERT INTO variant_ingredients (variant_id, ingredient_id, strength_value, strength_uom)
               VALUES (?, ?, ?, ?);`,
              [newVariantId, ingredientId, sanitizeStr(ing.strength_value), sanitizeStr(ing.strength_uom)]
            );
          }
        }
      }
    }

    await connection.commit();
    res.status(200).json({ success: true, message: 'Product updated successfully.' });
  } catch (error) {
    try { await (await getConnection()).rollback(); } catch (_) {}
    logger.error(`Error updating product with ID ${req.params.id}:`, error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'An unexpected error occurred.' });
  }
};

/* ---------------------- Delete (soft) ---------------------- */

const deleteProduct = async (req, res, next) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    await connection.execute(
      'UPDATE product_variants SET is_deleted = TRUE, is_active = FALSE WHERE product_id = ?;',
      [id]
    );
    await connection.execute(
      'UPDATE products SET is_deleted = TRUE, is_active = FALSE WHERE id = ?;',
      [id]
    );

    await connection.commit();
    logger.info(`Product ${id} soft-deleted.`);
    res.status(200).json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    try { await (await getConnection()).rollback(); } catch (_) {}
    logger.error(`Error deleting product ${req.params.id}:`, error);
    next(error);
  }
};

/* ---------------------- Lookups & Ingredient search ---------------------- */

const getProductLookups = async (req, res, next) => {
  try {
    const orgId = req.user?.org_id || 1;
    const branchId = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;

    const categories = await executeQuery('SELECT id, name FROM categories WHERE is_deleted = FALSE ORDER BY name');
    const manufacturers = await executeQuery('SELECT id, name FROM manufacturers WHERE is_active = TRUE ORDER BY name');
    const brands = await executeQuery('SELECT id, name FROM brands ORDER BY name' );
    const dosageForms = await executeQuery('SELECT id, name FROM dosage_forms ORDER BY name');
    const uoms = await executeQuery('SELECT id, name FROM uom ORDER BY name');
    const gstSlabs = await executeQuery('SELECT id, slab_name, percentage FROM gst_slabs ORDER BY percentage');

    // racks (active only), optional branch filter
    let racksSql =
      'SELECT id, org_id, branch_id, rack_code, rack_name, is_active ' +
      'FROM racks WHERE org_id = ? AND is_active = 1';
    const racksParams = [orgId];
    if (branchId) { racksSql += ' AND branch_id = ?'; racksParams.push(branchId); }
    racksSql += ' ORDER BY rack_code';
    const racks = await executeQuery(racksSql, racksParams);

    // std_discounts (active only), optional branch filter
    let stdSql =
      'SELECT id, org_id, branch_id, name, percentage, is_active ' +
      'FROM std_discounts WHERE org_id = ? AND is_active = 1';
    const stdParams = [orgId];
    if (branchId) { stdSql += ' AND branch_id = ?'; stdParams.push(branchId); }
    stdSql += ' ORDER BY percentage, name';
    const stdDiscounts = await executeQuery(stdSql, stdParams);

    res.status(200).json({
      success: true,
      data: {
        categories,
        manufacturers,
        brands,
        dosageForms,
        uoms,
        gstSlabs,
        racks,
        stdDiscounts
      }
    });
  } catch (error) {
    logger.error('Error fetching product lookups:', error);
    next(error);
  }
};

const searchIngredients = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const rows = await executeQuery(
      `SELECT name FROM ingredients WHERE name LIKE ? ORDER BY name LIMIT 10;`,
      [`%${search}%`]
    );
    res.status(200).json({ success: true, data: rows.map(r => r.name) });
  } catch (error) {
    logger.error('Error searching ingredients:', error);
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductLookups,
  searchIngredients
};
