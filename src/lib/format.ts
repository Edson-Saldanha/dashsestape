export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
export const num = (v: number) =>
  new Intl.NumberFormat("pt-BR").format(v || 0);
export const pct = (v: number) => `${(v || 0).toFixed(1)}%`;
