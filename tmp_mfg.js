const { validationResult } = require('express-validator');
const { executeQuery, getConnection } = require('../utils/database');
const logger = require('../utils/logger');

/** Utilities for brand code generation **/
const baseBrandCode = (name) => {
  const letters = (name || '').replace(/[^A-Za-z]/g, '');
  const base = (letters || name || 'BRD').slice(0, 3).toUpperCase().padEnd(3, 'X');
  return base;
};
async function ensureUniqueBrandCode(conn, orgId, requestedBase) {
  const base = (requestedBase || 'BRD').toUpperCase();
  const [row] = await conn.execute(
    `SELECT id FROM brands WHERE org_id = ? AND code = ? LIMIT 1`,
    [orgId, base]
  );
  if (!row.length) return base;

  for (let i = 1; i < 1000; i++) {
    const code = `${base}${String(i).padStart(3, '0')}`;
    const [r] = await conn.execute(
      `SELECT id FROM brands WHERE org_id = ? AND code = ? LIMIT 1`,
      [orgId, code]
    );
    if (!r.length) return code;
  }
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}

/** GET /api/mfg-brands */
exports.listMfgWithBrands = async (req, res, next) => {
  try {
    const orgId = req.user?.org_id || 1;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const includeInactive = String(req.query.include_inactive || 'false') === 'true';

    const where = ['m.org_id = ?'];
    const params = [orgId];

    if (!includeInactive) {
      where.push('m.is_active = 1');
    }
    if (search) {
      where.push('(m.name LIKE ? OR EXISTS (SELECT 1 FROM brands b WHERE b.manufacturer_id = m.id AND b.name LIKE ?))');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await executeQuery(
      `SELECT m.id, m.name, m.category, m.is_active
         FROM manufacturers m
       ${whereSql}
       ORDER BY m.name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [{ total }] = await executeQuery(
      `SELECT COUNT(*) AS total
         FROM manufacturers m
       ${whereSql}`,
      params
    );

    const ids = rows.map(r => r.id);
    let brandsByMfg = {};
    if (ids.length) {
      const brands = await executeQuery(
        `SELECT id, name, is_active, manufacturer_id
           FROM brands
          WHERE manufacturer_id IN (${ids.map(() => '?').join(',')})
            AND (is_deleted IS NULL OR is_deleted = 0)
          ORDER BY name ASC`,
        ids
      );
      brandsByMfg = brands.reduce((acc, b) => {
        (acc[b.manufacturer_id] = acc[b.manufacturer_id] || []).push({
          id: b.id,
          name: b.name,
          is_active: !!b.is_active
        });
        return acc;
      }, {});
    }

    const data = rows.map(r => ({ ...r, brands: brandsByMfg[r.id] || [] }));

    res.json({
      success: true,
      data,
      pagination: {
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/mfg-brands/:id */
exports.getMfgWithBrandsById = async (req, res, next) => {
  try {
    const orgId = req.user?.org_id || 1;
    const id = parseInt(req.params.id, 10);
    const [mfg] = await executeQuery(
      `SELECT id, name, category, is_active
         FROM manufacturers
        WHERE id = ? AND org_id = ?`,
      [id, orgId]
    );
    if (!mfg) return res.status(404).json({ success: false, message: 'Not found' });

    const brands = await executeQuery(
      `SELECT id, name, is_active
         FROM brands
        WHERE manufacturer_id = ? AND (is_deleted IS NULL OR is_deleted = 0)
        ORDER BY name ASC`,
      [id]
    );

    res.json({ success: true, data: { ...mfg, brands } });
  } catch (err) {
    next(err);
  }
};

/** POST /api/mfg-brands */
exports.createMfgWithBrands = async (req, res, next) => {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await conn.rollback();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const orgId = req.user?.org_id || 1;
    const { name, category = null, is_active = true, brands = [] } = req.body;

    const [existing] = await conn.execute(
      `SELECT id FROM manufacturers WHERE org_id = ? AND name = ? LIMIT 1`,
      [orgId, name.trim()]
    );
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Manufacturer already exists' });
    }

    const [ins] = await conn.execute(
      `INSERT INTO manufacturers (org_id, name, category, is_active)
       VALUES (?, ?, ?, ?)`,
      [orgId, name.trim(), category, is_active ? 1 : 0]
    );
    const mfgId = ins.insertId;

    for (const b of brands) {
      const bName = (b.name || '').trim();
      if (!bName) continue;

      const [dup] = await conn.execute(
        `SELECT id FROM brands WHERE org_id = ? AND manufacturer_id = ? AND name = ? LIMIT 1`,
        [orgId, mfgId, bName]
      );
      if (dup.length) continue;

      const code = await ensureUniqueBrandCode(conn, orgId, baseBrandCode(bName));
      await conn.execute(
        `INSERT INTO brands (org_id, code, name, manufacturer_id, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [orgId, code, bName, mfgId, b.is_active === false ? 0 : 1]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Created', data: { id: mfgId } });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    next(err);
  } finally {
    try { conn.release(); } catch {}
  }
};

/** PUT /api/mfg-brands/:id */
exports.updateMfgWithBrands = async (req, res, next) => {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await conn.rollback();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const orgId = req.user?.org_id || 1;
    const id = parseInt(req.params.id, 10);
    const { name, category = null, is_active, brands = [] } = req.body;

    await conn.execute(
      `UPDATE manufacturers SET name = ?, category = ?, is_active = ? WHERE id = ? AND org_id = ?`,
      [name.trim(), category, is_active ? 1 : 0, id, orgId]
    );

    // cascade to brands & products
    await conn.execute(`UPDATE brands SET is_active = ? WHERE manufacturer_id = ?`, [
      is_active ? 1 : 0, id
    ]);
    await conn.execute(`UPDATE products SET is_active = ? WHERE manufacturer_id = ?`, [
      is_active ? 1 : 0, id
    ]);
    await conn.execute(
      `UPDATE product_variants
         SET is_active = ?
       WHERE product_id IN (SELECT id FROM products WHERE manufacturer_id = ?)`,
      [is_active ? 1 : 0, id]
    );

    // upsert brands
    for (const b of brands) {
      const bName = (b.name || '').trim();
      const bActive = b.is_active === false ? 0 : 1;
      if (!bName) continue;

      if (b.id) {
        await conn.execute(
          `UPDATE brands SET name = ?, is_active = ? WHERE id = ? AND manufacturer_id = ?`,
          [bName, bActive, b.id, id]
        );
      } else {
        const [dup] = await conn.execute(
          `SELECT id FROM brands WHERE org_id = ? AND manufacturer_id = ? AND name = ? LIMIT 1`,
          [orgId, id, bName]
        );
        if (!dup.length) {
          const code = await ensureUniqueBrandCode(conn, orgId, baseBrandCode(bName));
          await conn.execute(
            `INSERT INTO brands (org_id, code, name, manufacturer_id, is_active)
             VALUES (?, ?, ?, ?, ?)`,
            [orgId, code, bName, id, bActive]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Updated (cascaded to brands & products)' });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    next(err);
  } finally {
    try { conn.release(); } catch {}
  }
};

/** PATCH /api/mfg-brands/:id/active */
exports.toggleManufacturerActive = async (req, res, next) => {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const orgId = req.user?.org_id || 1;
    const id = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    await conn.execute(
      `UPDATE manufacturers SET is_active = ? WHERE id = ? AND org_id = ?`,
      [is_active ? 1 : 0, id, orgId]
    );
    await conn.execute(`UPDATE brands SET is_active = ? WHERE manufacturer_id = ?`, [
      is_active ? 1 : 0, id
    ]);
    await conn.execute(`UPDATE products SET is_active = ? WHERE manufacturer_id = ?`, [
      is_active ? 1 : 0, id
    ]);
    await conn.execute(
      `UPDATE product_variants
         SET is_active = ?
       WHERE product_id IN (SELECT id FROM products WHERE manufacturer_id = ?)`,
      [is_active ? 1 : 0, id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Status updated (cascaded to brands & products)' });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    next(err);
  } finally {
    try { conn.release(); } catch {}
  }
};

/** POST /api/mfg-brands/import */
exports.importManufacturers = async (req, res, next) => {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const orgId = req.user?.org_id || 1;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    const summary = {
      processed: rows.length,
      manufacturers_created: 0,
      manufacturers_updated: 0,
      brands_created: 0,
      details: []
    };

    for (const [idx, r] of rows.entries()) {
      const name = (r.manufacturer || '').trim();
      const category = (r.category || '').trim() || null;
      const brandStr = (r.key_brands || '').trim();

      if (!name) {
        summary.details.push({ row: idx + 2, manufacturer: '', action: 'skipped', reason: 'Missing manufacturer' });
        continue;
      }

      // upsert manufacturer by (org_id, name)
      const [mRows] = await conn.execute(
        `SELECT id, name, category FROM manufacturers WHERE org_id = ? AND name = ? LIMIT 1`,
        [orgId, name]
      );

      let mfgId;
      if (mRows.length) {
        mfgId = mRows[0].id;
        if (category && category !== mRows[0].category) {
          await conn.execute(
            `UPDATE manufacturers SET category = ? WHERE id = ?`,
            [category, mfgId]
          );
          summary.manufacturers_updated++;
        }
        summary.details.push({ row: idx + 2, manufacturer: name, action: 'exists/updated' });
      } else {
        const [ins] = await conn.execute(
          `INSERT INTO manufacturers (org_id, name, category, is_active) VALUES (?, ?, ?, 1)`,
          [orgId, name, category]
        );
        mfgId = ins.insertId;
        summary.manufacturers_created++;
        summary.details.push({ row: idx + 2, manufacturer: name, action: 'created' });
      }

      // split brands by comma/semicolon
      const brandNames = brandStr
        ? brandStr.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        : [];

      for (const bName of brandNames) {
        const [dup] = await conn.execute(
          `SELECT id FROM brands WHERE org_id = ? AND manufacturer_id = ? AND name = ? LIMIT 1`,
          [orgId, mfgId, bName]
        );
        if (dup.length) continue;

        const code = await ensureUniqueBrandCode(conn, orgId, baseBrandCode(bName));
        await conn.execute(
          `INSERT INTO brands (org_id, code, name, manufacturer_id, is_active) VALUES (?, ?, ?, ?, 1)`,
          [orgId, code, bName, mfgId]
        );
        summary.brands_created++;
      }
    }

    await conn.commit();
    return res.status(201).json({ success: true, summary });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    next(err);
  } finally {
    try { conn.release(); } catch {}
  }
};
