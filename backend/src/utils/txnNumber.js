'use strict';

const { executeQuery } = require('./database');

/**
 * Resolve prefix tokens:
 * {ORG}, {BR}, {YYYY}, {YY}, {MM}, {DD}
 */
function expandPrefix(prefix, { orgId, branchId, now = new Date() }) {
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  return String(prefix || '')
    .replaceAll('{ORG}', String(orgId))
    .replaceAll('{BR}', String(branchId))
    .replaceAll('{YYYY}', yyyy)
    .replaceAll('{YY}', yy)
    .replaceAll('{MM}', mm)
    .replaceAll('{DD}', dd);
}

/**
 * Ensure a counter row exists (defaults if missing).
 */
async function ensureCounterRow(docType, orgId, branchId, defaults = {}) {
  // Choose a sensible default prefix by docType
  const defaultPrefix =
    defaults.prefix ??
    (docType === 'sale' ? 'INV-{BR}-' : `${docType.toUpperCase()}-{BR}-`);

  const defaultPad = defaults.pad_width ?? 4;

  await executeQuery(
    `INSERT IGNORE INTO txn_counters (org_id, branch_id, doc_type, prefix, pad_width, next_seq)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [orgId, branchId || 0, docType, defaultPrefix, defaultPad]
  );
}

/**
 * Atomically increment and return a formatted transaction number.
 * Uses MySQL's LAST_INSERT_ID trick to avoid race conditions without a manual transaction.
 */
async function nextTxnNumber(docType, orgId, branchId) {
  await ensureCounterRow(docType, orgId, branchId);

  // Atomically bump the sequence and expose the new value via LAST_INSERT_ID()
  await executeQuery(
    `UPDATE txn_counters
        SET next_seq = LAST_INSERT_ID(next_seq + 1)
      WHERE org_id = ? AND branch_id = ? AND doc_type = ?`,
    [orgId, branchId || 0, docType]
  );

  const [seqRow] = await executeQuery(`SELECT LAST_INSERT_ID() AS seq`);
  const seq = Number(seqRow.seq || 1);

  const [cfg] = await executeQuery(
    `SELECT prefix, pad_width FROM txn_counters WHERE org_id = ? AND branch_id = ? AND doc_type = ?`,
    [orgId, branchId || 0, docType]
  );

  const prefixExpanded = expandPrefix(cfg.prefix, { orgId, branchId });
  const number = `${prefixExpanded}${String(seq).padStart(Number(cfg.pad_width || 4), '0')}`;
  return { number, seq, prefix: cfg.prefix, pad_width: cfg.pad_width };
}

module.exports = { nextTxnNumber, expandPrefix };
