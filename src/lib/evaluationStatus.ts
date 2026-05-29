export type EvaluationStatus =
  | "recebido"
  | "aguardando_avaliacao"
  | "em_avaliacao"
  | "aguardando_aprovacao_cliente"
  | "aprovado_compra"
  | "recusado_loja"
  | "cliente_recusou"
  | "comprado"
  | "em_manutencao"
  | "pronto_revenda"
  | "vendido"
  | "devolvido";

export const EVALUATION_STATUSES: EvaluationStatus[] = [
  "recebido",
  "aguardando_avaliacao",
  "em_avaliacao",
  "aguardando_aprovacao_cliente",
  "aprovado_compra",
  "recusado_loja",
  "cliente_recusou",
  "comprado",
  "em_manutencao",
  "pronto_revenda",
  "vendido",
  "devolvido",
];

export const EVAL_STATUS_LABEL: Record<EvaluationStatus, string> = {
  recebido: "Produto recebido",
  aguardando_avaliacao: "Aguardando avaliação técnica",
  em_avaliacao: "Em avaliação",
  aguardando_aprovacao_cliente: "Aguardando aprovação do cliente",
  aprovado_compra: "Aprovado para compra",
  recusado_loja: "Recusado pela loja",
  cliente_recusou: "Cliente não aceitou proposta",
  comprado: "Comprado pela loja",
  em_manutencao: "Em manutenção / limpeza",
  pronto_revenda: "Pronto para revenda",
  vendido: "Vendido",
  devolvido: "Devolvido ao cliente",
};

// Cores semânticas: vermelho (problema), amarelo (aguardando), azul (em avaliação),
// verde (comprado/pronto), cinza (finalizado).
export type EvalGroup = "red" | "yellow" | "blue" | "green" | "gray";

export const EVAL_STATUS_GROUP: Record<EvaluationStatus, EvalGroup> = {
  recebido: "yellow",
  aguardando_avaliacao: "yellow",
  em_avaliacao: "blue",
  aguardando_aprovacao_cliente: "yellow",
  aprovado_compra: "green",
  recusado_loja: "red",
  cliente_recusou: "red",
  comprado: "green",
  em_manutencao: "blue",
  pronto_revenda: "green",
  vendido: "gray",
  devolvido: "gray",
};

export const EVAL_GROUP_CLASSES: Record<EvalGroup, { badge: string; card: string; dot: string }> = {
  red: {
    badge: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200 border-red-300/50",
    card: "border-l-4 border-l-red-500",
    dot: "bg-red-500",
  },
  yellow: {
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border-amber-300/50",
    card: "border-l-4 border-l-amber-500",
    dot: "bg-amber-500",
  },
  blue: {
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 border-blue-300/50",
    card: "border-l-4 border-l-blue-500",
    dot: "bg-blue-500",
  },
  green: {
    badge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200 border-emerald-300/50",
    card: "border-l-4 border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  gray: {
    badge: "bg-muted text-muted-foreground border-border",
    card: "border-l-4 border-l-muted-foreground/40",
    dot: "bg-muted-foreground",
  },
};

export function statusClasses(s: EvaluationStatus) {
  return EVAL_GROUP_CLASSES[EVAL_STATUS_GROUP[s]];
}

export function daysBetween(from: string | Date, to: Date = new Date()) {
  const d = typeof from === "string" ? new Date(from) : from;
  return Math.floor((to.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}