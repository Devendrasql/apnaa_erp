// Menu utilities to normalize, merge, and flatten menu definitions

export function normalizeMenuItem(m) {
  if (!m) return null;
  const key = m.key || m.id || String(m.label || m.name || m.title || '').toLowerCase().replace(/\s+/g, '_');
  return {
    key,
    label: m.label || m.name || m.title || m.key || '',
    path: m.path || m.url || m.route || '',
    perm: m.perm || m.permission || m.rbac || null,
    icon: m.icon,
    group: m.group || m.section || 'MAIN',
    order: typeof m.order === 'number' ? m.order : 0,
    children: Array.isArray(m.children) ? m.children : [],
  };
}

// Merge server menus with local base menus; prefer items that have a non-empty path
export function mergeMenus(base = [], server = []) {
  const map = new Map();
  const put = (item) => {
    if (!item) return;
    const k = item.key;
    if (!k) return;
    const existing = map.get(k);
    if (!existing) { map.set(k, item); return; }
    const hasPath = !!String(item.path || '').trim();
    const existingHasPath = !!String(existing.path || '').trim();
    if (hasPath && !existingHasPath) map.set(k, item);
  };
  server.map(normalizeMenuItem).forEach(put);
  base.forEach(put);
  return Array.from(map.values());
}

// Flatten nested menus to a list (key/label/path)
export function flattenMenus(nodes = []) {
  const acc = [];
  const walk = (list, parentKey = null) => {
    list.forEach((n) => {
      const it = normalizeMenuItem(n);
      if (!it) return;
      acc.push({ key: it.key, label: it.label, path: it.path, perm: it.perm, group: it.group, order: it.order, parent_key: parentKey });
      if (Array.isArray(n.children) && n.children.length) walk(n.children, it.key);
    });
  };
  walk(nodes, null);
  // unique by key
  const seen = new Set();
  return acc.filter((m) => (m.key && !seen.has(m.key) ? (seen.add(m.key), true) : false));
}

// Build tree from flat list with parent_key
export function buildTreeFromFlat(items = []) {
  const map = new Map();
  items.forEach((i) => map.set(i.key, { ...i, children: [] }));
  const roots = [];
  items.forEach((i) => {
    if (i.parent_key && map.has(i.parent_key) && i.key !== i.parent_key) {
      map.get(i.parent_key).children.push(map.get(i.key));
    } else {
      roots.push(map.get(i.key));
    }
  });
  // sort by order within siblings
  const sortTree = (nodes) => {
    nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
    nodes.forEach((n) => n.children && sortTree(n.children));
  };
  sortTree(roots);
  return roots;
}
