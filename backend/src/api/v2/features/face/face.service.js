'use strict';

const axios = require('axios');
const path = require('path');
const fs = require('fs/promises');
const FormData = require('form-data');
const { executeQuery } = require('../../../../../utils/database');

const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8001/embed';
const BEST_THRESHOLD = parseFloat(process.env.FACE_THRESHOLD || '0.37');
const UPLOAD_ROOT = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '../../../../..', 'uploads');

function stripDataUrl(b64) { return b64 && b64.startsWith('data:') ? b64.slice(b64.indexOf(',') + 1) : b64; }
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
function float32ToBuffer(arr) { const buf = Buffer.alloc(arr.length * 4); for (let i=0;i<arr.length;i++) buf.writeFloatLE(arr[i], i*4); return buf; }
function bufferToFloat32(buf) { const out = new Float32Array(buf.length / 4); for (let i=0;i<out.length;i++) out[i] = buf.readFloatLE(i*4); return Array.from(out); }
function cosine(a, b) { let dot=0,na=0,nb=0; for (let i=0;i<a.length;i++){ const x=a[i],y=b[i]; dot+=x*y; na+=x*x; nb+=y*y; } return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9); }

async function getEmbeddingFromBase64(base64Jpeg) {
  const img = Buffer.from(stripDataUrl(base64Jpeg), 'base64');
  const form = new FormData();
  form.append('image', img, { filename: 'frame.jpg', contentType: 'image/jpeg' });
  const { data } = await axios.post(EMBED_URL, form, { headers: form.getHeaders(), timeout: 15_000 });
  if (!data?.ok || !Array.isArray(data.embedding)) throw new Error(data?.reason || 'embedding_failed');
  return data.embedding;
}

async function enrollForCustomer({ customerId, imageBase64, imageUrl, orgId }) {
  if (!imageBase64) throw new Error('imageBase64_required');
  if (orgId == null) {
    const rows = await executeQuery('SELECT org_id FROM customers WHERE id = ? AND is_deleted = FALSE', [customerId]);
    if (!rows?.length || rows[0].org_id == null) { const e = new Error('org_id_required'); e.status = 400; throw e; }
    orgId = rows[0].org_id;
  }
  const publicImageUrl = imageUrl || await persistBase64Image(imageBase64, orgId, customerId);
  const embedding = await getEmbeddingFromBase64(imageBase64);
  await executeQuery(
    `INSERT INTO customer_face_templates (org_id, customer_id, embedding, image_url) VALUES (?, ?, ?, ?)`,
    [orgId, customerId, float32ToBuffer(embedding), publicImageUrl]
  );
  await executeQuery(
    `UPDATE customers SET face_enrolled = 1, face_image_url = COALESCE(?, face_image_url) WHERE id = ? AND is_deleted = FALSE`,
    [publicImageUrl, customerId]
  );
  return { image_url: publicImageUrl };
}

async function identifyCustomer({ imageBase64, org_id, store_id }) {
  if (!imageBase64) { const e = new Error('imageBase64_required'); e.status = 400; throw e; }
  if (!org_id) { const e = new Error('org_id_required'); e.status = 400; throw e; }
  const probe = await getEmbeddingFromBase64(imageBase64);
  const rows = await executeQuery(`SELECT cft.id, cft.customer_id, cft.embedding FROM customer_face_templates cft WHERE cft.org_id = ?`, [org_id]);
  let best = { sim: -1, customer_id: null };
  for (const r of rows) { const emb = bufferToFloat32(r.embedding); const sim = cosine(probe, emb); if (sim > best.sim) best = { sim, customer_id: r.customer_id }; }
  const accept = best.customer_id && best.sim >= BEST_THRESHOLD;
  await executeQuery(
    `INSERT INTO face_recognition_logs (org_id, customer_id, similarity, decision, store_id) VALUES (?, ?, ?, ?, ?)`,
    [org_id, accept ? best.customer_id : null, best.sim, accept ? 'accept' : 'reject', store_id || null]
  );
  if (!accept) { const e = new Error('no_match'); e.status = 404; e.similarity = best.sim; throw e; }
  const [customer] = await executeQuery(`SELECT * FROM customers WHERE id = ? AND is_deleted = FALSE`, [best.customer_id]);
  return { similarity: best.sim, customer };
}

module.exports = { enrollForCustomer, identifyCustomer };

