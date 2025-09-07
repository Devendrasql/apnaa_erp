export const money = (n) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const dateTime = (d) => {
  const x = d ? new Date(d) : new Date();
  return x.toLocaleString();
};

