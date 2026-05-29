// Helpers para CRM Pós-venda / WhatsApp

export function onlyDigits(v?: string | null): string {
  return (v || "").replace(/\D+/g, "");
}

/**
 * Normaliza um telefone BR para o formato esperado por wa.me (E.164 sem '+').
 * Aceita: (51) 99999-9999, 51999999999, 5551999999999, +55 51 9 9999-9999.
 * Garante prefixo 55. Retorna string vazia se inválido.
 */
export function normalizeWhatsAppNumber(input?: string | null): string {
  const d = onlyDigits(input);
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  // Fallback: já tem DDI internacional?
  if (d.length >= 11 && d.length <= 15) return d;
  return "";
}

export function isValidBRPhone(input?: string | null): boolean {
  const d = onlyDigits(input);
  return d.length === 10 || d.length === 11 || (d.startsWith("55") && (d.length === 12 || d.length === 13));
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const num = normalizeWhatsAppNumber(phone);
  const text = encodeURIComponent(message || "");
  return `https://wa.me/${num}?text=${text}`;
}

export function openWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppLink(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function renderTemplate(tpl: string, vars: Record<string, string | undefined | null>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => {
    return acc.split(`{{${k}}}`).join(String(v ?? ""));
  }, tpl || "");
}

export const LEMBRETE_LABELS: Record<string, string> = {
  "30_dias": "30 dias",
  "60_dias": "60 dias",
  "90_dias": "90 dias",
  "6_meses": "6 meses",
  "1_ano": "1 ano",
  "manual": "Manual",
};

export const STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  pronto_para_envio: "Pronto p/ envio",
  enviado: "Enviado",
  respondeu: "Respondeu",
  agendou: "Agendou",
  nao_respondeu: "Não respondeu",
  erro: "Erro",
  cancelado: "Cancelado",
};

export const STATUS_COLORS: Record<string, string> = {
  aguardando: "bg-muted text-muted-foreground",
  pronto_para_envio: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  enviado: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  respondeu: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  agendou: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
  nao_respondeu: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  erro: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
  cancelado: "bg-muted text-muted-foreground line-through",
};