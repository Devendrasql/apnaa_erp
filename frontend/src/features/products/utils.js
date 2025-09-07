export function normalizeProductDetail(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  const base = data.product ? { ...data.product } : { ...data };
  const variants = Array.isArray(data.variants)
    ? data.variants
    : (Array.isArray(base.variants) ? base.variants : (Array.isArray(base.variant_list) ? base.variant_list : []));

  return {
    ...base,
    manufacturer_id: base.manufacturer_id ?? base.manufacturer?.id ?? null,
    category_id: base.category_id ?? base.category?.id ?? null,
    brand_id: base.brand_id ?? base.brand?.id ?? null,
    variants,
  };
}

