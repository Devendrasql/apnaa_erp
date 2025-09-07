'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function listProducts({ page = 1, limit = 20, search }) {
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const offset = (p - 1) * l;

  let whereClause = 'WHERE p.is_deleted = FALSE';
  const params = [];
  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.generic_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const products = await executeQuery(
    `SELECT p.*, c.name AS category_name, m.name AS manufacturer_name
       FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      ${whereClause}
   ORDER BY p.name ASC
      LIMIT ${l} OFFSET ${offset}`,
    params
  );
  const [count] = await executeQuery(`SELECT COUNT(p.id) AS total FROM products p ${whereClause}`, params);
  return { rows: products, total: count.total || 0, page: p, limit: l };
}

async function getProductById(id) {
  const [product] = await executeQuery('SELECT * FROM products WHERE id = ? AND is_deleted = FALSE', [id]);
  if (!product) return null;
  const variants = await executeQuery(
    `SELECT pv.*,
            (SELECT pp.price FROM product_prices pp WHERE pp.variant_id = pv.id ORDER BY pp.effective_from DESC, pp.id DESC LIMIT 1) AS mrp
       FROM product_variants pv
      WHERE pv.product_id = ? AND pv.is_deleted = FALSE
      ORDER BY pv.id ASC`,
    [id]
  );
  if (product.product_type === 'PHARMA') {
    const DEFAULT_PRICE_LIST_ID = 1; // fallback price list
    for (const v of variants) {
      v.ingredients = await executeQuery(
        `SELECT i.name, vi.strength_value, vi.strength_uom
           FROM variant_ingredients vi
           JOIN ingredients i ON vi.ingredient_id = i.id
          WHERE vi.variant_id = ?`,
        [v.id]
      );
    }
  } else {
    for (const v of variants) v.ingredients = [];
  }
  return { product, variants };
}

async function getLookups({ org_id, branch_id }) {
  const categories = await executeQuery('SELECT id, name FROM categories WHERE is_deleted = FALSE ORDER BY name');
  const manufacturers = await executeQuery('SELECT id, name FROM manufacturers WHERE is_active = TRUE ORDER BY name');
  const brands = await executeQuery('SELECT id, name FROM brands ORDER BY name');
  const dosageForms = await executeQuery('SELECT id, name FROM dosage_forms ORDER BY name');
  const uoms = await executeQuery('SELECT id, name FROM uom ORDER BY name');
  const gstSlabs = await executeQuery('SELECT id, slab_name, percentage FROM gst_slabs ORDER BY percentage');

  let racksSql = 'SELECT id, org_id, branch_id, rack_code, rack_name, is_active FROM racks WHERE org_id = ? AND is_active = 1';
  const racksParams = [org_id];
  if (branch_id) { racksSql += ' AND branch_id = ?'; racksParams.push(branch_id); }
  racksSql += ' ORDER BY rack_code';
  const racks = await executeQuery(racksSql, racksParams);

  let stdSql = 'SELECT id, org_id, branch_id, name, percentage, is_active FROM std_discounts WHERE org_id = ? AND is_active = 1';
  const stdParams = [org_id];
  if (branch_id) { stdSql += ' AND branch_id = ?'; stdParams.push(branch_id); }
  stdSql += ' ORDER BY percentage, name';
  const stdDiscounts = await executeQuery(stdSql, stdParams);

  return { categories, manufacturers, brands, dosageForms, uoms, gstSlabs, racks, stdDiscounts };
}

async function searchIngredients(term) {
  const rows = await executeQuery('SELECT name FROM ingredients WHERE name LIKE ? ORDER BY name LIMIT 10', [`%${term}%`]);
  return rows.map(r => r.name);
}

module.exports = {
  listProducts,
  getProductById,
  getLookups,
  searchIngredients,
};

// Write operations
async function ensureIngredientId(name) {
  const [row] = await executeQuery('SELECT id FROM ingredients WHERE name = ? LIMIT 1', [name]);
  if (row) return row.id;
  const r = await executeQuery('INSERT INTO ingredients (name) VALUES (?)', [name]);
  return r.insertId || (await executeQuery('SELECT LAST_INSERT_ID() AS id')).id;
}

async function createProduct({ master = {}, variants = [] }) {
  if (!master?.name || !Array.isArray(variants) || variants.length === 0) {
    const err = new Error('Invalid payload: master.name and variants[] are required'); err.status = 400; throw err;
  }
  const conn = await require('../../../../../utils/database').getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.execute(
      `INSERT INTO products (
         name,
         generic_name,
         category_id,
         manufacturer_id,
         brand_id,
         hsn_code,
         product_type,
         is_active,
         is_deleted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        master.name,
        master.generic_name || null,
        master.category_id || null,
        master.manufacturer_id || null,
        master.brand_id || null,
        master.hsn_code || null,
        master.product_type || null,
        master.is_active === false ? 0 : 1,
      ]
    );
    const productId = ins.insertId;

    for (const v of variants) {
      const [vins] = await conn.execute(
        `INSERT INTO product_variants (
           product_id,
           sku,
           barcode,
           dosage_form_id,
           pack_qty,
           pack_uom_id,
           default_gst_slab_id,
           rack_id,
           std_disc_id,
           is_deleted,
           is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          productId,
          v.sku || null,
          v.barcode || null,
          v.dosage_form_id || null,
          v.pack_qty != null ? Number(v.pack_qty) : null,
          v.pack_uom_id || null,
          v.default_gst_slab_id || null,
          v.rack_id || null,
          v.std_disc_id || null,
          v.is_active === false ? 0 : 1,
        ]
      );
      const variantId = vins.insertId;

      if (master.product_type === 'PHARMA' && Array.isArray(v.ingredients)) {
        for (const ing of v.ingredients) {
          if (!ing?.name) continue;
          const ingId = await ensureIngredientId(String(ing.name).trim());
          await conn.execute(
            `INSERT INTO variant_ingredients (variant_id, ingredient_id, strength_value, strength_uom)
             VALUES (?, ?, ?, ?)`,
            [variantId, ingId, ing.strength_value || null, ing.strength_uom || null]
          );
        }
      }
      if (v.mrp != null) {
        await conn.execute(
          `INSERT INTO product_prices (variant_id, price_list_id, price, effective_from) VALUES (?, ?, ?, NOW())`,
          [variantId, DEFAULT_PRICE_LIST_ID, Number(v.mrp) || 0]
        );
      }
    }
    await conn.commit();
    return { id: productId };
  } catch (e) { try { await conn.rollback(); } catch {} throw e; } finally { try { conn.release(); } catch {} }
}

async function updateProductWrite(id, { master = {}, variants = [] }) {
  const conn = await require('../../../../../utils/database').getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE products SET 
         name = ?,
         generic_name = ?,
         category_id = ?,
         manufacturer_id = ?,
         brand_id = ?,
         hsn_code = ?,
         product_type = ?,
         is_active = ?
       WHERE id = ? AND is_deleted = FALSE`,
      [
        master.name,
        master.generic_name || null,
        master.category_id || null,
        master.manufacturer_id || null,
        master.brand_id || null,
        master.hsn_code || null,
        master.product_type || null,
        master.is_active === false ? 0 : 1,
        id,
      ]
    );

    // Existing variant ids
    const [rows] = await conn.execute('SELECT id FROM product_variants WHERE product_id = ? AND is_deleted = FALSE', [id]);
    const existing = new Set(rows.map(r => r.id));
    const seen = new Set();

    const DEFAULT_PRICE_LIST_ID = 1; // fallback price list
    for (const v of variants) {
      if (v.id && existing.has(v.id)) {
        seen.add(v.id);
        await conn.execute(
          `UPDATE product_variants SET 
             sku = ?,
             barcode = ?,
             dosage_form_id = ?,
             pack_qty = ?,
             pack_uom_id = ?,
             default_gst_slab_id = ?,
             rack_id = ?,
             std_disc_id = ?,
             is_active = ?
           WHERE id = ?`,
          [
            v.sku || null,
            v.barcode || null,
            v.dosage_form_id || null,
            v.pack_qty != null ? Number(v.pack_qty) : null,
            v.pack_uom_id || null,
            v.default_gst_slab_id || null,
            v.rack_id || null,
            v.std_disc_id || null,
            v.is_active === false ? 0 : 1,
            v.id,
          ]
        );
        // Replace ingredients if provided
        if (Array.isArray(v.ingredients)) {
          await conn.execute('DELETE FROM variant_ingredients WHERE variant_id = ?', [v.id]);
          for (const ing of v.ingredients) {
            if (!ing?.name) continue;
            const ingId = await ensureIngredientId(String(ing.name).trim());
            await conn.execute(
              `INSERT INTO variant_ingredients (variant_id, ingredient_id, strength_value, strength_uom) VALUES (?, ?, ?, ?)`,
              [v.id, ingId, ing.strength_value || null, ing.strength_uom || null]
            );
          }
        }
        if (v.mrp != null) {
          await conn.execute(`INSERT INTO product_prices (variant_id, price_list_id, price, effective_from) VALUES (?, ?, ?, NOW())`, [v.id, DEFAULT_PRICE_LIST_ID, Number(v.mrp) || 0]);
        }
      } else {
        const [vins] = await conn.execute(
          `INSERT INTO product_variants (
             product_id,
             sku,
             barcode,
             dosage_form_id,
             pack_qty,
             pack_uom_id,
             default_gst_slab_id,
             rack_id,
             std_disc_id,
             is_deleted,
             is_active
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [
            id,
            v.sku || null,
            v.barcode || null,
            v.dosage_form_id || null,
            v.pack_qty != null ? Number(v.pack_qty) : null,
            v.pack_uom_id || null,
            v.default_gst_slab_id || null,
            v.rack_id || null,
            v.std_disc_id || null,
            v.is_active === false ? 0 : 1,
          ]
        );
        const variantId = vins.insertId; seen.add(variantId);
        if (Array.isArray(v.ingredients)) {
          for (const ing of v.ingredients) {
            if (!ing?.name) continue;
            const ingId = await ensureIngredientId(String(ing.name).trim());
            await conn.execute(
              `INSERT INTO variant_ingredients (variant_id, ingredient_id, strength_value, strength_uom) VALUES (?, ?, ?, ?)`,
              [variantId, ingId, ing.strength_value || null, ing.strength_uom || null]
            );
          }
        }
        if (v.mrp != null) {
          await conn.execute(`INSERT INTO product_prices (variant_id, price_list_id, price, effective_from) VALUES (?, ?, ?, NOW())`, [variantId, DEFAULT_PRICE_LIST_ID, Number(v.mrp) || 0]);
        }
      }
    }

    // Soft delete removed variants
    for (const vid of existing) {
      if (!seen.has(vid)) {
        await conn.execute('UPDATE product_variants SET is_deleted = 1 WHERE id = ?', [vid]);
      }
    }

    await conn.commit();
  } catch (e) { try { await conn.rollback(); } catch {} throw e; } finally { try { conn.release(); } catch {} }
}

async function deleteProductWrite(id) {
  await executeQuery('UPDATE product_variants SET is_deleted = 1 WHERE product_id = ?', [id]);
  const r = await executeQuery('UPDATE products SET is_deleted = 1 WHERE id = ?', [id]);
  return r.affectedRows;
}

module.exports.createProduct = createProduct;
module.exports.updateProductWrite = updateProductWrite;
module.exports.deleteProductWrite = deleteProductWrite;
