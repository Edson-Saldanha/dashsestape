
// CNPJ mask: 00.000.000/0000-00
export function formatCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

// Auto CPF (<=11 digits) or CNPJ (>11)
export function formatDocBR(value: string): string {
  const d = onlyDigits(value);
  return d.length <= 11 ? formatCPF(value) : formatCNPJ(value);
}
// CPF utilities: mask, math validation, normalization and stub for future API check.

export const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");

export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

// Mathematical validation: structural + check digits + reject repeated patterns.
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  // reject 000.000.000-00 ... 999.999.999-99
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(cpf[i], 10) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9], 10) && calc(10) === parseInt(cpf[10], 10);
}

// Stub prepared for future external API integration.
export async function checkCPFExternal(_cpf: string): Promise<{ ok: boolean; name?: string; status?: string }> {
  return { ok: true };
}

// Brazilian phone mask: (00) 0000-0000 / (00) 00000-0000
export function formatPhoneBR(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length < 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}