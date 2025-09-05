'use strict';

const axios = require('axios');
const path = require('path');
const fs = require('fs/promises');
const FormData = require('form-data');
const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');

const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8001/embed';
const BEST_THRESHOLD = parseFloat(process.env.FACE_THRESHOLD || '0.37');

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

function stripDataUrl(b64) {
  if (!b64) return b64;
  return b64.startsWith('data:') ? b64.slice(b64.indexOf(',') + 1) : b64;
}
async function persistBase64Image(base64, orgId, customerId) {
  const clean = stripDataUrl(base64);
  const buf = Buffer.from(clean, 'base64');
  const dir = path.join(UPLOAD_ROOT, 'faces', String(orgId));
  await fs.mkdir(dir, { recursive: true });
  const filename = `${customerId}-${Date.now()}.jpg`;
  const dest = path.join(dir, filename);
  await fs.writeFile(dest, buf);
  return `/uploads/faces/${orgId}/${filename}`;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { const x=a[i], y=b[i]; dot += x*y; na += x*x; nb += y*y; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
function float32ToBuffer(arr) {
  const buf = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) buf.writeFloatLE(arr[i], i*4);
  return buf;
}
function bufferToFloat32(buf) {
  const out = new Float32Array(buf.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i*4);
  return Array.from(out);
}

async function getEmbeddingFromBase64(base64Jpeg) {
  const img = Buffer.from(stripDataUrl(base64Jpeg), 'base64');
  const form = new FormData();
  form.append('image', img, { filename: 'frame.jpg', contentType: 'image/jpeg' });
  const { data } = await axios.post(EMBED_URL, form, { headers: form.getHeaders(), timeout: 15_000 });
  if (!data?.ok || !Array.isArray(data.embedding)) throw new Error(data?.reason || 'embedding_failed');
  return data.embedding;
}

/**
 * POST /api/face/customers/:id/enroll
 * Body: { imageBase64, imageUrl? , org_id? }
 */
exports.enrollForCustomer = async (req, res, next) => {
  try {
    const customerId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(customerId)) return res.status(400).json({ ok: false, error: 'invalid_customer_id' });

    const { imageBase64, imageUrl } = req.body || {};
    if (!imageBase64) return res.status(400).json({ ok: false, error: 'imageBase64_required' });

    let orgId = (req.user && req.user.org_id) ?? req.body?.org_id ?? null;
    if (orgId == null) {
      const rows = await executeQuery('SELECT org_id FROM customers WHERE id = ? AND is_deleted = FALSE', [customerId]);
      if (!rows?.length || rows[0].org_id == null) return res.status(400).json({ ok: false, error: 'org_id_required' });
      orgId = rows[0].org_id;
    }

    const publicImageUrl = imageUrl || await persistBase64Image(imageBase64, orgId, customerId);
    const embedding = await getEmbeddingFromBase64(imageBase64);

    await executeQuery(
      `INSERT INTO customer_face_templates (org_id, customer_id, embedding, image_url)
       VALUES (?, ?, ?, ?)`,
      [orgId, customerId, float32ToBuffer(embedding), publicImageUrl]
    );

    await executeQuery(
      `UPDATE customers
          SET face_enrolled = 1,
              face_image_url = COALESCE(?, face_image_url)
        WHERE id = ? AND is_deleted = FALSE`,
      [publicImageUrl, customerId]
    );

    logger.info(`Face enrolled for customer ${customerId} (org ${orgId})`);
    return res.json({ ok: true, image_url: publicImageUrl });
  } catch (e) { next(e); }
};

/**
 * POST /api/face/identify
 * Body: { imageBase64, org_id, store_id? }
 * Returns: { ok, similarity, customer, recognition_log_id }
 */
exports.identifyCustomer = async (req, res, next) => {
  try {
    const { imageBase64, store_id } = req.body || {};
    if (!imageBase64) return res.status(400).json({ ok: false, error: 'imageBase64_required' });

    const org_id = (req.user && req.user.org_id) ?? req.body?.org_id;
    if (!org_id) return res.status(400).json({ ok: false, error: 'org_id_required' });

    const probe = await getEmbeddingFromBase64(imageBase64);

    const rows = await executeQuery(
      `SELECT cft.id, cft.customer_id, cft.embedding
         FROM customer_face_templates cft
        WHERE cft.org_id = ?`,
      [org_id]
    );

    let best = { sim: -1, customer_id: null };
    for (const r of rows) {
      const emb = bufferToFloat32(r.embedding);
      const sim = cosine(probe, emb);
      if (sim > best.sim) best = { sim, customer_id: r.customer_id };
    }

    const accept = best.customer_id && best.sim >= BEST_THRESHOLD;

    const result = await executeQuery(
      `INSERT INTO face_recognition_logs (org_id, customer_id, similarity, decision, store_id, sale_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [org_id, accept ? best.customer_id : null, best.sim, accept ? 'accept' : 'reject', store_id || null, null]
    );

    const recognition_log_id = result.insertId;

    if (!accept) {
      return res.status(404).json({ ok: false, reason: 'no_match', similarity: best.sim, recognition_log_id });
    }

    const [customer] = await executeQuery(
      `SELECT * FROM customers WHERE id = ? AND is_deleted = FALSE`, [best.customer_id]
    );

    return res.json({ ok: true, similarity: best.sim, customer, recognition_log_id });
  } catch (e) { next(e); }
};






// 'use strict';

// /**
//  * Face enrollment + identification controller
//  * - Saves base64 snapshots to /uploads/faces/<org>/<customerId>-<ts>.jpg
//  * - Stores embeddings in customer_face_templates
//  * - Keeps customers.face_enrolled + customers.face_image_url in sync
//  */

// const axios = require('axios');
// const path = require('path');
// const fs = require('fs/promises');
// const FormData = require('form-data');
// const { executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');

// // External face embedding service (adjust to your service)
// const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8001/embed';

// // Similarity threshold — tune per your data
// const BEST_THRESHOLD = parseFloat(process.env.FACE_THRESHOLD || '0.37');

// // Where snapshots are persisted; served at /uploads by server.js
// const UPLOAD_ROOT = process.env.UPLOAD_DIR
//   ? path.resolve(process.env.UPLOAD_DIR)
//   : path.join(__dirname, '..', '..', 'uploads');

// /** Strip data URL prefix if present and return pure base64 string */
// function stripDataUrl(b64) {
//   if (!b64) return b64;
//   return b64.startsWith('data:') ? b64.slice(b64.indexOf(',') + 1) : b64;
// }

// /** Persist face snapshot (base64) to /uploads/faces/<org>/<customerId>-<ts>.jpg and return public URL */
// async function persistBase64Image(base64, orgId, customerId) {
//   const clean = stripDataUrl(base64);
//   const buf = Buffer.from(clean, 'base64');

//   const dir = path.join(UPLOAD_ROOT, 'faces', String(orgId));
//   await fs.mkdir(dir, { recursive: true });

//   const filename = `${customerId}-${Date.now()}.jpg`;
//   const dest = path.join(dir, filename);
//   await fs.writeFile(dest, buf);

//   // Public URL path (server.js statically serves "/uploads")
//   return `/uploads/faces/${orgId}/${filename}`;
// }

// function cosine(a, b) {
//   let dot = 0, na = 0, nb = 0;
//   for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; dot += x * y; na += x * x; nb += y * y; }
//   return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
// }

// function float32ToBuffer(arr) {
//   const buf = Buffer.alloc(arr.length * 4);
//   for (let i = 0; i < arr.length; i++) buf.writeFloatLE(arr[i], i * 4);
//   return buf;
// }
// function bufferToFloat32(buf) {
//   const out = new Float32Array(buf.length / 4);
//   for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
//   return Array.from(out);
// }

// /** Call the embedding service and return the embedding array */
// async function getEmbeddingFromBase64(base64Jpeg) {
//   const img = Buffer.from(stripDataUrl(base64Jpeg), 'base64');
//   const form = new FormData();
//   form.append('image', img, { filename: 'frame.jpg', contentType: 'image/jpeg' });
//   const { data } = await axios.post(EMBED_URL, form, { headers: form.getHeaders(), timeout: 15_000 });
//   if (!data?.ok || !Array.isArray(data.embedding)) throw new Error(data?.reason || 'embedding_failed');
//   return data.embedding;
// }

// /**
//  * POST /api/face/customers/:id/enroll
//  * Body: { imageBase64, imageUrl?, org_id? }
//  * - Persists the snapshot (unless imageUrl is provided)
//  * - Saves embedding in customer_face_templates
//  * - Updates customers.face_enrolled + customers.face_image_url
//  */
// exports.enrollForCustomer = async (req, res, next) => {
//   try {
//     const customerId = Number.parseInt(req.params.id, 10);
//     if (!Number.isFinite(customerId)) {
//       return res.status(400).json({ ok: false, error: 'invalid_customer_id' });
//     }

//     const { imageBase64, imageUrl } = req.body || {};
//     if (!imageBase64) {
//       return res.status(400).json({ ok: false, error: 'imageBase64_required' });
//     }

//     // Prefer org_id from auth; fallback to body; infer from DB as last resort
//     let orgId = (req.user && req.user.org_id) ?? req.body?.org_id ?? null;
//     if (orgId == null) {
//       const rows = await executeQuery(
//         'SELECT org_id FROM customers WHERE id = ? AND is_deleted = FALSE',
//         [customerId]
//       );
//       if (!rows?.length || rows[0].org_id == null) {
//         return res.status(400).json({ ok: false, error: 'org_id_required' });
//       }
//       orgId = rows[0].org_id;
//     }

//     // Save snapshot if caller didn't provide a URL
//     const publicImageUrl = imageUrl || await persistBase64Image(imageBase64, orgId, customerId);

//     // Get embedding
//     const embedding = await getEmbeddingFromBase64(imageBase64);

//     // Store template
//     await executeQuery(
//       `INSERT INTO customer_face_templates (org_id, customer_id, embedding, image_url)
//        VALUES (?, ?, ?, ?)`,
//       [orgId, customerId, float32ToBuffer(embedding), publicImageUrl]
//     );

//     // Mark enrolled + keep the latest image url
//     await executeQuery(
//       `UPDATE customers
//           SET face_enrolled = 1,
//               face_image_url = COALESCE(?, face_image_url)
//         WHERE id = ? AND is_deleted = FALSE`,
//       [publicImageUrl, customerId]
//     );

//     logger.info(`Face enrolled for customer ${customerId} (org ${orgId})`);
//     return res.json({ ok: true, image_url: publicImageUrl });
//   } catch (e) {
//     next(e);
//   }
// };

// // /**
// //  * POST /api/face/identify
// //  * Body: { imageBase64, org_id, store_id?, pos_id? }
// //  * - Returns { ok, similarity, customer } on match; 404 { reason: 'no_match' } on no match
// //  */
// exports.identifyCustomer = async (req, res, next) => {
//   try {
//     const { imageBase64, store_id, pos_id } = req.body || {};
//     if (!imageBase64) return res.status(400).json({ ok: false, error: 'imageBase64_required' });

//     let org_id = (req.user && req.user.org_id) ?? req.body?.org_id ?? null;

//     if (org_id == null) {
//       // infer if there's only one org enrolled in templates
//       const orgRows = await executeQuery(
//         `SELECT DISTINCT org_id FROM customer_face_templates LIMIT 2`
//       );
//       if (orgRows.length === 1 && orgRows[0].org_id != null) {
//         org_id = orgRows[0].org_id;
//         logger.warn(`identifyCustomer: inferred org_id=${org_id} from single-tenant templates`);
//       } else {
//         return res.status(400).json({ ok: false, error: 'org_id_required' });
//       }
//     }

//     const probe = await getEmbeddingFromBase64(imageBase64);

//     const rows = await executeQuery(
//       `SELECT cft.id, cft.customer_id, cft.embedding
//          FROM customer_face_templates cft
//         WHERE cft.org_id = ?`,
//       [org_id]
//     );

//     let best = { sim: -1, customer_id: null };
//     for (const r of rows) {
//       const emb = bufferToFloat32(r.embedding);
//       const sim = cosine(probe, emb);
//       if (sim > best.sim) best = { sim, customer_id: r.customer_id };
//     }

//     const accept = best.customer_id && best.sim >= BEST_THRESHOLD;

//     await executeQuery(
//       `INSERT INTO face_recognition_logs (org_id, customer_id, similarity, decision, store_id, pos_id)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [org_id, accept ? best.customer_id : null, best.sim, accept ? 'accept' : 'reject', store_id || null, pos_id || null]
//     );

//     if (!accept) return res.status(404).json({ ok: false, reason: 'no_match', similarity: best.sim });

//     const [customer] = await executeQuery(
//       `SELECT * FROM customers WHERE id = ? AND is_deleted = FALSE`, [best.customer_id]
//     );
//     return res.json({ ok: true, similarity: best.sim, customer });
//   } catch (e) { next(e); }
// };

