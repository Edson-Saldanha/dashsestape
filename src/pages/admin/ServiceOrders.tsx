import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Pencil, Printer, FileText, History, Search,
  ClipboardList, Stethoscope, Package, Wrench, CheckCircle2, Image as ImageIcon, MoreHorizontal, DollarSign,
  ChevronDown, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";
import { formatPhoneBR } from "@/lib/cpf";
import { toast } from "sonner";
import { printChecklist as printChecklistPage } from "./Checklist";
import sestapeLogo from "@/assets/sestape-logo.png";
const LOGO_URL = `${window.location.origin}${sestapeLogo}`;

type OSStatus =
  | "aberta" | "em_analise" | "aguardando_peca"
  | "em_manutencao" | "finalizada" | "entregue" | "cancelada";

const STATUS_LABEL: Record<OSStatus, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  aguardando_peca: "Aguardando peça",
  em_manutencao: "Em manutenção",
  finalizada: "Finalizada",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

const STATUS_CLASS: Record<OSStatus, string> = {
  aberta: "bg-sky-500/15 text-sky-600",
  em_analise: "bg-indigo-500/15 text-indigo-600",
  aguardando_peca: "bg-amber-500/15 text-amber-600",
  em_manutencao: "bg-violet-500/15 text-violet-600",
  finalizada: "bg-emerald-500/15 text-emerald-600",
  entregue: "bg-emerald-600/20 text-emerald-700",
  cancelada: "bg-red-500/15 text-red-600",
};

interface OS {
  id: string;
  os_number: number;
  client_name: string;
  client_phone: string | null;
  product: string | null;
  defect: string | null;
  technician_id: string | null;
  technician_name: string | null;
  entry_date: string;
  deadline_date: string | null;
  status: OSStatus;
  service_type: string | null;
  service_value: number;
  parts_cost: number;
  discount: number;
  payment_method: string | null;
  amount_paid: number;
  technician_notes: string | null;
  created_by_email: string | null;
  finalized_by_email: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  details?: OSDetails | null;
}

interface OSProductLine { id: string; name: string; qty: string; price: string }
interface OSServiceLine { id: string; name: string; price: string }
interface OSImage { id: string; url: string; caption: string }
interface OSChecklistItem { desc: string; cod: string }
interface OSChecklist {
  cliente?: string; os?: string; numero_orcamento?: string; cpf_cnpj?: string;
  data?: string; nro_venda?: string;
  itens?: Record<string, OSChecklistItem>;
  valor_total?: string; garantia?: string; sistema?: string;
  forma_pagamento?: string; obs?: string;
  data_entrega?: string; horario_entrega?: string;
}
interface OSDetails {
  occurrence?: string;
  occurrence_at?: string;
  report?: string;
  diagnosis?: string;
  tested_at?: string;
  products?: OSProductLine[];
  services?: OSServiceLine[];
  solution?: string;
  solved_at?: string;
  warranty_days?: string;
  images?: OSImage[];
  other_notes?: string;
  reference?: string;
  responsible_seller?: string;
  responsible_sector?: string;
  responsible_technician?: string;
  checklist?: OSChecklist;
}

interface Employee { id: string; name: string; role: string; active: boolean; sector?: string | null }
interface ProductCatalog { id: string; name: string; sale_price: number; sku: string | null }
interface CustomerLite {
  id: string; name: string;
  cpf_formatted: string | null; phone: string | null;
  email?: string | null; city?: string | null; state?: string | null;
  origin?: string | null; status?: string | null; notes?: string | null;
  created_at?: string;
}
interface HistoryRow {
  id: string; action: string;
  from_status: OSStatus | null; to_status: OSStatus | null;
  user_email: string | null; notes: string | null; created_at: string;
}

const emptyDetails: OSDetails = {
  occurrence: "", occurrence_at: "",
  report: "", diagnosis: "", tested_at: "",
  products: [], services: [],
  solution: "", solved_at: "", warranty_days: "90",
  images: [],
  other_notes: "", reference: "",
};

const emptyForm = {
  client_name: "", client_phone: "", product: "", defect: "",
  technician_id: "", entry_date: "", deadline_date: "",
  status: "aberta" as OSStatus,
  service_type: "",
  service_value: "", parts_cost: "", discount: "", payment_method: "",
  amount_paid: "", technician_notes: "",
  details: { ...emptyDetails } as OSDetails,
};

const uid = () => Math.random().toString(36).slice(2, 10);

function diffOS(prev: OS, payload: any): string[] {
  const changes: string[] = [];
  const fmtMoney = (v: any) => brl(Number(v||0));
  const fmtDate = (v: any) => v ? new Date(v).toLocaleString("pt-BR") : "—";
  const cmp = (label: string, a: any, b: any, fmt:(x:any)=>string = (x)=>String(x ?? "—")) => {
    const av = a ?? null, bv = b ?? null;
    if ((av||"") !== (bv||"")) changes.push(`${label}: ${fmt(av) || "—"} → ${fmt(bv) || "—"}`);
  };
  cmp("Cliente", prev.client_name, payload.client_name);
  cmp("Telefone", prev.client_phone, payload.client_phone);
  cmp("Produto", prev.product, payload.product);
  cmp("Defeito", prev.defect, payload.defect);
  cmp("Técnico", prev.technician_name, payload.technician_name);
  cmp("Tipo de atendimento", prev.service_type, payload.service_type);
  cmp("Forma de pagamento", prev.payment_method, payload.payment_method);
  cmp("Obs. técnico", prev.technician_notes, payload.technician_notes);
  if (Number(prev.service_value)!==Number(payload.service_value)) changes.push(`Valor do serviço: ${fmtMoney(prev.service_value)} → ${fmtMoney(payload.service_value)}`);
  if (Number(prev.parts_cost)!==Number(payload.parts_cost)) changes.push(`Custo de peças: ${fmtMoney(prev.parts_cost)} → ${fmtMoney(payload.parts_cost)}`);
  if (Number(prev.discount)!==Number(payload.discount)) changes.push(`Desconto: ${fmtMoney(prev.discount)} → ${fmtMoney(payload.discount)}`);
  if (Number(prev.amount_paid)!==Number(payload.amount_paid)) changes.push(`Valor recebido: ${fmtMoney(prev.amount_paid)} → ${fmtMoney(payload.amount_paid)}`);
  if (new Date(prev.entry_date).getTime() !== new Date(payload.entry_date).getTime()) changes.push(`Data entrada: ${fmtDate(prev.entry_date)} → ${fmtDate(payload.entry_date)}`);
  if ((prev.deadline_date||"") !== (payload.deadline_date||"")) changes.push(`Prazo: ${fmtDate(prev.deadline_date)} → ${fmtDate(payload.deadline_date)}`);

  const pd = (prev.details || {}) as OSDetails;
  const nd = (payload.details || {}) as OSDetails;
  cmp("Ocorrência", pd.occurrence, nd.occurrence);
  cmp("Laudo", pd.report, nd.report);
  cmp("Diagnóstico", pd.diagnosis, nd.diagnosis);
  cmp("Solução", pd.solution, nd.solution);
  cmp("Garantia (dias)", pd.warranty_days, nd.warranty_days);
  cmp("Referência", pd.reference, nd.reference);
  cmp("Outras informações", pd.other_notes, nd.other_notes);
  cmp("Vendedor responsável", pd.responsible_seller, nd.responsible_seller);
  cmp("Setor responsável", pd.responsible_sector, nd.responsible_sector);
  cmp("Técnico responsável", pd.responsible_technician, nd.responsible_technician);

  const diffList = (label: string, a: any[] = [], b: any[] = [], key: (x:any)=>string) => {
    const ak = a.map(key), bk = b.map(key);
    const added = b.filter(x => !ak.includes(key(x)));
    const removed = a.filter(x => !bk.includes(key(x)));
    added.forEach(x => changes.push(`+ ${label}: ${key(x)}`));
    removed.forEach(x => changes.push(`− ${label}: ${key(x)}`));
  };
  diffList("Produto adicionado/removido", pd.products || [], nd.products || [], (p:OSProductLine) => `${p.name || "(sem nome)"} (qtd ${p.qty}, ${brl(Number(p.price||0))})`);
  diffList("Serviço adicionado/removido", pd.services || [], nd.services || [], (s:OSServiceLine) => `${s.name || "(sem nome)"} (${brl(Number(s.price||0))})`);
  diffList("Imagem adicionada/removida", pd.images || [], nd.images || [], (i:OSImage) => i.caption || i.url || "(imagem)");
  return changes;
}

const SERVICE_TYPES = [
  "ACESSO REMOTO","BALCÃO","CORRETIVA","EXTERNO","GARANTIA","INSTALAÇÃO",
  "INTERNO","ON-SITE","ORÇAMENTO","OUTROS","PREVENTIVA","TELEFONE",
];

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "notebook", label: "Notebook" },
  { key: "impressora", label: "Impressora" },
  { key: "processador", label: "Processador" },
  { key: "placa_mae", label: "Placa Mãe" },
  { key: "memoria_ram", label: "Memória RAM" },
  { key: "hd_ssd", label: "HD/SSD" },
  { key: "fonte", label: "Fonte" },
  { key: "cooler", label: "Cooler" },
  { key: "placa_video", label: "Placa de Vídeo" },
  { key: "gabinete", label: "Gabinete" },
  { key: "teclado_mouse", label: "Teclado/Mouse" },
  { key: "caixa_som", label: "Caixa de Som" },
  { key: "cabo_energia", label: "Cabo Energia" },
  { key: "filt_estab_nobk", label: "Filt/Estab/Nobreak" },
  { key: "cabo_rede", label: "Cabo de Rede" },
  { key: "monitor", label: "Monitor" },
  { key: "acessorio_1", label: "Acessório 1" },
  { key: "acessorio_2", label: "Acessório 2" },
  { key: "acessorio_3", label: "Acessório 3" },
];

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ServiceOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OS[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [catalog, setCatalog] = useState<ProductCatalog[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OS | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OSStatus | "all">("all");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyOS, setHistoryOS] = useState<OS | null>(null);
  const [laudoHistory, setLaudoHistory] = useState<HistoryRow[]>([]);

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [pickerSelected, setPickerSelected] = useState<CustomerLite | null>(null);
  const [pickerSales, setPickerSales] = useState<any[]>([]);
  const [pickerOSCount, setPickerOSCount] = useState<number>(0);

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistOS, setChecklistOS] = useState<OS | null>(null);
  const [checklist, setChecklist] = useState<OSChecklist>({});

  const refresh = async () => {
    const [o, e, p, c] = await Promise.all([
      supabase.from("service_orders").select("*").order("os_number", { ascending: false }),
      supabase.from("employees").select("*").eq("active", true).order("name"),
      supabase.from("products").select("id,name,sale_price,sku").eq("status","ativo").order("name"),
      supabase.from("customers").select("id,name,cpf_formatted,phone,email,city,state,origin,status,notes,created_at").order("name"),
    ]);
    setOrders((o.data as any) || []);
    setEmployees((e.data as any) || []);
    setCatalog((p.data as any) || []);
    setCustomers((c.data as any) || []);
  };

  useEffect(() => {
    refresh();
    const ch = supabase.channel("rt-os")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(o.os_number).includes(q) ||
        o.client_name.toLowerCase().includes(q) ||
        (o.product || "").toLowerCase().includes(q) ||
        (o.client_phone || "").toLowerCase().includes(q) ||
        (o.technician_name || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, entry_date: toLocalInput(new Date().toISOString()) });
    setOpen(true);
    setLaudoHistory([]);
  };

  const openEdit = (o: OS) => {
    setEditing(o);
    setForm({
      client_name: o.client_name,
      client_phone: o.client_phone || "",
      product: o.product || "",
      defect: o.defect || "",
      technician_id: o.technician_id || "",
      entry_date: toLocalInput(o.entry_date),
      deadline_date: o.deadline_date ? toLocalInput(o.deadline_date) : "",
      status: o.status,
      service_type: o.service_type || "",
      service_value: String(o.service_value ?? ""),
      parts_cost: String(o.parts_cost ?? ""),
      discount: String(o.discount ?? ""),
      payment_method: o.payment_method || "",
      amount_paid: String(o.amount_paid ?? ""),
      technician_notes: o.technician_notes || "",
      details: { ...emptyDetails, ...(o.details || {}) },
    });
    setOpen(true);
    supabase
      .from("service_order_history")
      .select("*")
      .eq("service_order_id", o.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = ((data as any[]) || []) as HistoryRow[];
        setLaudoHistory(rows.filter((r) => /Laudo|Diagn[óo]stico|Data dos testes/i.test(r.notes || "")));
      });
  };

  const calc = useMemo(() => {
    const sv = parseFloat(form.service_value || "0") || 0;
    const pc = parseFloat(form.parts_cost || "0") || 0;
    const dc = parseFloat(form.discount || "0") || 0;
    const ap = parseFloat(form.amount_paid || "0") || 0;
    const total = Math.max(0, sv - dc);
    const profit = sv - pc - dc;
    const open_balance = Math.max(0, total - ap);
    return { total, profit, open_balance };
  }, [form]);

  const save = async () => {
    if (!form.client_name.trim()) return toast.error("Informe o nome do cliente");
    const tech = employees.find(e => e.id === form.technician_id);

    const payload: any = {
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || null,
      product: form.product.trim() || null,
      defect: form.defect.trim() || null,
      technician_id: tech?.id || null,
      technician_name: tech?.name || null,
      entry_date: form.entry_date ? new Date(form.entry_date).toISOString() : new Date().toISOString(),
      deadline_date: form.deadline_date ? new Date(form.deadline_date).toISOString() : null,
      status: form.status,
      service_type: form.service_type || null,
      service_value: parseFloat(form.service_value || "0") || 0,
      parts_cost: parseFloat(form.parts_cost || "0") || 0,
      discount: parseFloat(form.discount || "0") || 0,
      payment_method: form.payment_method.trim() || null,
      amount_paid: parseFloat(form.amount_paid || "0") || 0,
      technician_notes: form.technician_notes.trim() || null,
      details: form.details || {},
    };

    if (editing) {
      const changed = editing.status !== form.status;
      const diffs = diffOS(editing, payload);
      if (form.status === "finalizada" && editing.status !== "finalizada") {
        payload.finalized_by = user?.id || null;
        payload.finalized_by_email = user?.email || null;
        payload.finalized_at = new Date().toISOString();
      }
      // Optimistic UI: update list immediately and close the dialog
      const editingId = editing.id;
      const prevStatus = editing.status;
      setOrders(curr => curr.map(o => o.id === editingId ? { ...o, ...payload } as OS : o));
      setOpen(false); setEditing(null); setForm(emptyForm);
      toast.success("OS atualizada!");
      const { error } = await supabase.from("service_orders").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); refresh(); return; }
      // Fire-and-forget history insert (does not block UI)
      supabase.from("service_order_history").insert({
        service_order_id: editingId,
        action: changed ? "status_changed" : "updated",
        from_status: changed ? prevStatus : null,
        to_status: changed ? form.status : null,
        user_id: user?.id || null,
        user_email: user?.email || null,
        notes: diffs.length ? diffs.join("\n") : null,
      }).then(() => {});
      return;
    } else {
      payload.created_by = user?.id || null;
      payload.created_by_email = user?.email || null;
      setOpen(false); setEditing(null); setForm(emptyForm);
      const { data, error } = await supabase.from("service_orders").insert(payload).select().single();
      if (error) return toast.error(error.message);
      setOrders(curr => [data as OS, ...curr]);
      toast.success(`OS #${data.os_number} criada!`);
      supabase.from("service_order_history").insert({
        service_order_id: data.id,
        action: "created",
        to_status: form.status,
        user_id: user?.id || null,
        user_email: user?.email || null,
      }).then(() => {});
      return;
    }
  };

  const remove = async (o: OS) => {
    if (!confirm(`Excluir OS #${o.os_number}?`)) return;
    setOrders(curr => curr.filter(x => x.id !== o.id));
    toast.success("OS excluída");
    const { error } = await supabase.from("service_orders").delete().eq("id", o.id);
    if (error) { toast.error(error.message); refresh(); }
  };

  const showHistory = async (o: OS) => {
    setHistoryOS(o);
    setHistoryOpen(true);
    const { data } = await supabase
      .from("service_order_history")
      .select("*")
      .eq("service_order_id", o.id)
      .order("created_at", { ascending: false });
    setHistory((data as any) || []);
  };

  const printOS = (o: OS) => {
    const fmt = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR") : "—";
    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>OS #${o.os_number}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:0;padding:32px;}
  h1{font-size:22px;margin:0}
  .muted{color:#666;font-size:12px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
  .head img.logo{height:56px;object-fit:contain}
  .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#eef;font-size:12px;font-weight:600}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin:14px 0}
  .row{padding:6px 0;border-bottom:1px dashed #ddd}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666}
  .value{font-size:14px;font-weight:500}
  .section{margin-top:18px}
  .section h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#444;border-bottom:1px solid #ccc;padding-bottom:6px;margin:0 0 10px}
  .term{font-size:11px;color:#444;border:1px solid #ddd;padding:10px;border-radius:8px;margin-top:18px;line-height:1.5}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:60px}
  .sign div{border-top:1px solid #111;padding-top:6px;text-align:center;font-size:12px}
  @media print{ body{padding:18px} .noprint{display:none} button{display:none} }
</style></head><body>
<div class="head">
  <div style="display:flex;align-items:center;gap:14px">
    <img class="logo" src="${LOGO_URL}" alt="Sestape Store"/>
    <div>
    <h1>Ordem de Serviço</h1>
    <div class="muted">Emitida em ${new Date().toLocaleString("pt-BR")}</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:28px;font-weight:800">#${o.os_number}</div>
    <span class="badge">${STATUS_LABEL[o.status]}</span>
  </div>
</div>

<div class="section"><h2>Cliente</h2>
  <div class="grid">
    <div class="row"><div class="label">Nome</div><div class="value">${o.client_name}</div></div>
    <div class="row"><div class="label">Telefone</div><div class="value">${o.client_phone || "—"}</div></div>
    <div class="row"><div class="label">Produto / Equipamento</div><div class="value">${o.product || "—"}</div></div>
    <div class="row"><div class="label">Técnico responsável</div><div class="value">${o.technician_name || "—"}</div></div>
  </div>
</div>

<div class="section"><h2>Serviço</h2>
  <div class="grid">
    <div class="row"><div class="label">Defeito relatado</div><div class="value">${o.defect || "—"}</div></div>
    <div class="row"><div class="label">Observações do técnico</div><div class="value">${o.technician_notes || "—"}</div></div>
    <div class="row"><div class="label">Data de entrada</div><div class="value">${fmt(o.entry_date)}</div></div>
    <div class="row"><div class="label">Prazo de entrega</div><div class="value">${fmt(o.deadline_date)}</div></div>
  </div>
</div>

<div class="term">
  <b>Termo de responsabilidade:</b> O cliente declara estar ciente que a empresa não se responsabiliza por dados, arquivos ou acessórios não relacionados ao serviço.
  Produtos não retirados em até 90 dias após o aviso de finalização poderão ser descartados conforme legislação vigente.
  A garantia do serviço é de 90 dias sobre o defeito reparado.
</div>

<div class="sign">
  <div>Assinatura do Cliente</div>
  <div>Assinatura da Empresa</div>
</div>

<div class="noprint" style="text-align:center;margin-top:30px">
  <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer">Imprimir / Salvar PDF</button>
</div>
<script>setTimeout(()=>window.print(), 300);</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita pop-ups para imprimir");
    w.document.write(html); w.document.close();
  };

  const openChecklist = (o: OS) => {
    setChecklistOS(o);
    const existing = (o.details?.checklist || {}) as OSChecklist;
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setChecklist({
      cliente: existing.cliente ?? o.client_name ?? "",
      os: existing.os ?? String(o.os_number ?? ""),
      numero_orcamento: existing.numero_orcamento ?? "",
      cpf_cnpj: existing.cpf_cnpj ?? "",
      data: existing.data ?? `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`,
      nro_venda: existing.nro_venda ?? "",
      itens: existing.itens ?? {},
      valor_total: existing.valor_total ?? "",
      garantia: existing.garantia ?? "",
      sistema: existing.sistema ?? "",
      forma_pagamento: existing.forma_pagamento ?? "",
      obs: existing.obs ?? "",
      data_entrega: existing.data_entrega ?? "",
      horario_entrega: existing.horario_entrega ?? "",
    });
    setChecklistOpen(true);
  };

  const setChkItem = (key: string, field: "desc" | "cod", value: string) => {
    setChecklist(c => {
      const itens = { ...(c.itens || {}) };
      const cur = itens[key] || { desc: "", cod: "" };
      itens[key] = { ...cur, [field]: value };
      return { ...c, itens };
    });
  };

  const saveChecklist = async () => {
    if (!checklistOS) return;
    const newDetails = { ...(checklistOS.details || {}), checklist };
    setOrders(curr => curr.map(o => o.id === checklistOS.id ? { ...o, details: newDetails } as OS : o));
    setChecklistOpen(false);
    toast.success("Checklist salvo!");
    const { error } = await supabase.from("service_orders").update({ details: newDetails as any }).eq("id", checklistOS.id);
    if (error) { toast.error(error.message); refresh(); }
  };

  const printChecklist = (o?: OS | null, data?: OSChecklist) => {
    const c = data || checklist;
    const os = o || checklistOS;
    const itens = c.itens || {};
    const fmtData = c.data ? (() => {
      const [y,m,d] = c.data!.split("-");
      return d && m && y ? `${d}/${m}/${y}` : c.data!;
    })() : "___/___/______";
    const row = (label: string, key: string) => {
      const it = itens[key] || { desc: "", cod: "" };
      return `<tr>
        <td class="lbl">${label}:</td>
        <td class="desc"><span class="filled">${it.desc || ""}</span></td>
        <td class="cod-lbl">COD:</td>
        <td class="cod"><span class="filled">${it.cod || ""}</span></td>
      </tr>`;
    };
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Checklist OS ${os?.os_number ?? ""}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:24px;font-size:12px}
  h1{text-align:center;font-size:16px;text-decoration:underline;margin:0 0 18px}
  .top{margin-bottom:14px;line-height:2.1}
  .top .lbl{font-weight:bold;text-transform:uppercase}
  .filled{border-bottom:1px solid #000;display:inline-block;min-width:120px;padding:0 6px;font-weight:600}
  .top .filled{min-width:160px}
  table.items{width:100%;border-collapse:collapse;margin-top:6px}
  table.items td{padding:6px 4px;vertical-align:bottom}
  table.items td.lbl{font-weight:bold;text-transform:uppercase;white-space:nowrap;width:1%}
  table.items td.desc{width:60%}
  table.items td.cod-lbl{font-weight:bold;white-space:nowrap;width:1%;padding-left:8px}
  table.items td.cod{width:25%}
  table.items td .filled{width:100%;min-width:0;display:block}
  .totais{margin-top:14px;line-height:2.2}
  .totais .lbl{font-weight:bold;text-transform:uppercase}
  .obs{margin-top:10px;color:#c00;font-weight:bold}
  .obs .filled{color:#000;font-weight:600;min-width:380px}
  .signs{margin-top:16px;line-height:2.2}
  .signs .row{display:flex;gap:14px;align-items:center}
  .signs .check{font-weight:bold}
  .signs .nm{font-weight:bold;text-transform:uppercase;width:110px}
  .signs .filled{flex:1;min-width:80px}
  .signs .small{width:90px}
  @media print{ body{padding:14px} .noprint{display:none} }
</style></head><body>
<h1>CHECKLIST – NOTEBOOK/COMPUTADOR</h1>
<div style="text-align:center;margin-bottom:12px"><img src="${LOGO_URL}" alt="Sestape Store" style="height:56px;object-fit:contain"/></div>
<div class="top">
  <span class="lbl">CLIENTE:</span> <span class="filled">${c.cliente || ""}</span>
  &nbsp;&nbsp;<span class="lbl">O.S.:</span> <span class="filled">${c.os || ""}</span><br/>
  <span class="lbl">Número do Orçamento</span> <span class="filled">${c.numero_orcamento || ""}</span>
  &nbsp;&nbsp;<span class="lbl">CPF/CNPJ:</span> <span class="filled">${c.cpf_cnpj || ""}</span><br/>
  <span class="lbl">Data:</span> <span class="filled">${fmtData}</span>
  &nbsp;&nbsp;<span class="lbl">Nº Venda:</span> <span class="filled">${c.nro_venda || ""}</span>
</div>
<table class="items">
  ${CHECKLIST_ITEMS.map(it => row(it.label, it.key)).join("")}
</table>
<div class="totais">
  <span class="lbl">Valor Total:</span> <span class="filled">${c.valor_total || ""}</span>
  &nbsp;<span class="lbl">Garantia:</span> <span class="filled">${c.garantia || ""}</span>
  &nbsp;<span class="lbl">Sistema:</span> <span class="filled">${c.sistema || ""}</span><br/>
  <span class="lbl">Forma de Pagamento:</span> <span class="filled" style="min-width:320px">${c.forma_pagamento || ""}</span>
</div>
<div class="obs"><span>OBS:</span> <span class="filled">${c.obs || ""}</span></div>
<div class="signs">
  <div class="row"><span class="check">✓</span><span class="nm">Vendedor:</span><span class="filled"></span><span class="nm small">Data: __/__/__</span><span class="nm small">Horário:</span><span class="filled small"></span></div>
  <div class="row"><span class="check">✓</span><span class="nm">Expeditor:</span><span class="filled"></span><span class="nm small">Data: __/__/__</span><span class="nm small">Horário:</span><span class="filled small"></span></div>
  <div class="row"><span class="check">✓</span><span class="nm">Técnico:</span><span class="filled"></span><span class="nm small">Data: __/__/__</span><span class="nm small">Horário:</span><span class="filled small"></span></div>
  <div class="row"><span class="check">✓</span><span class="nm">Caixa:</span><span class="filled"></span><span class="nm small">Data: __/__/__</span><span class="nm small">Horário:</span><span class="filled small"></span></div>
  <div class="row"><span class="check">✓</span><span class="nm">Data da Entrega:</span><span class="filled">${c.data_entrega || ""}</span><span class="nm small">Horário:</span><span class="filled small">${c.horario_entrega || ""}</span></div>
</div>
<script>setTimeout(()=>window.print(),300);</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita pop-ups para imprimir");
    w.document.write(html); w.document.close();
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Operação</div>
          <h1 className="font-display text-3xl font-bold">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Cadastre, acompanhe e emita OS em PDF</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-white shadow-glow">
          <Plus className="h-4 w-4 mr-2" />Nova OS
        </Button>
      </header>

      <div className="bg-card rounded-2xl p-4 border shadow-elegant flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[240px]">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" list="os-customers-search"
              placeholder="Nº OS, cliente, telefone, produto, técnico..."
              value={search} onChange={e=>setSearch(e.target.value)} />
            <datalist id="os-customers-search">
              {customers.map(c => (
                <option key={c.id} value={c.name}>
                  {c.cpf_formatted ? `${c.cpf_formatted} • ` : ""}{c.phone || ""}
                </option>
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={v=>setStatusFilter(v as any)}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(STATUS_LABEL) as OSStatus[]).map(k => (
                <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {filtered.length} OS
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Nº</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Produto</th>
              <th className="p-4">Técnico</th>
              <th className="p-4">Entrada</th>
              <th className="p-4">Prazo</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-right">Em aberto</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((o,i) => {
              const total = Math.max(0, Number(o.service_value) - Number(o.discount));
              const balance = Math.max(0, total - Number(o.amount_paid));
              return (
                <motion.tr key={o.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                  className="hover:bg-muted/20">
                  <td className="p-4 font-display font-bold tabular text-primary">#{o.os_number}</td>
                  <td className="p-4">
                    <div className="font-medium">{o.client_name}</div>
                    <div className="text-xs text-muted-foreground">{o.client_phone || "—"}</div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{o.product || "—"}</td>
                  <td className="p-4 text-sm">{o.technician_name || "—"}</td>
                  <td className="p-4 text-xs text-muted-foreground">{new Date(o.entry_date).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4 text-xs text-muted-foreground">{o.deadline_date ? new Date(o.deadline_date).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="p-4 text-right tabular font-medium">{brl(total)}</td>
                  <td className="p-4 text-right tabular text-amber-600">{brl(balance)}</td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={()=>printOS(o)} title="Imprimir / PDF" className="text-muted-foreground hover:text-primary"><Printer className="h-4 w-4" /></button>
                      <button onClick={()=>showHistory(o)} title="Histórico" className="text-muted-foreground hover:text-primary"><History className="h-4 w-4" /></button>
                      <button onClick={()=>openEdit(o)} title="Editar" className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={()=>remove(o)} title="Excluir" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={10} className="p-12 text-center text-muted-foreground">Nenhuma OS encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if(!v){ setEditing(null); setForm(emptyForm);} }}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editing ? `Editar OS #${editing.os_number}` : "Nova Ordem de Serviço"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <Tabs defaultValue="cadastro" className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto justify-start gap-1 bg-muted/40 p-1">
                <TabsTrigger value="cadastro" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Cadastro</TabsTrigger>
                <TabsTrigger value="ocorrencia" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Ocorrência</TabsTrigger>
                <TabsTrigger value="laudo" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" />Laudo</TabsTrigger>
                <TabsTrigger value="produtos" className="gap-1.5"><Package className="h-3.5 w-3.5" />Produtos</TabsTrigger>
                <TabsTrigger value="servicos" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Serviços</TabsTrigger>
                <TabsTrigger value="solucao" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Solução</TabsTrigger>
                <TabsTrigger value="imagens" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Imagens</TabsTrigger>
                <TabsTrigger value="checklist" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" />Checklist</TabsTrigger>
                <TabsTrigger value="outros" className="gap-1.5"><MoreHorizontal className="h-3.5 w-3.5" />Outros</TabsTrigger>
              </TabsList>

            <TabsContent value="cadastro" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cliente *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.client_name}
                      onChange={e=>setForm(f => ({ ...f, client_name: e.target.value }))}
                      placeholder="Nome do cliente"
                    />
                    <Button type="button" variant="outline" onClick={()=>{
                      setCustomerQuery("");
                      setPickerSelected(null);
                      setPickerSales([]);
                      setPickerOSCount(0);
                      setCustomerPickerOpen(true);
                    }}>
                      <Search className="h-4 w-4 mr-1" /> Selecionar
                    </Button>
                  </div>
                </div>
                <div><Label>Telefone</Label><Input value={form.client_phone} maxLength={15}
                  onChange={e=>setForm({...form, client_phone: formatPhoneBR(e.target.value)})}
                  placeholder="(00) 00000-0000" /></div>
                <div><Label>Produto / Equipamento</Label><Input value={form.product} onChange={e=>setForm({...form, product:e.target.value})} /></div>
                <div>
                  <Label>Técnico responsável</Label>
                  <Select value={form.technician_id} onValueChange={v=>setForm({...form, technician_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Defeito relatado</Label><Textarea value={form.defect} onChange={e=>setForm({...form, defect:e.target.value})} /></div>
                <div><Label>Data de entrada</Label><Input type="datetime-local" value={form.entry_date} onChange={e=>setForm({...form, entry_date:e.target.value})} /></div>
                <div><Label>Prazo de entrega</Label><Input type="datetime-local" value={form.deadline_date} onChange={e=>setForm({...form, deadline_date:e.target.value})} /></div>
                <div>
                  <Label>Tipo de atendimento</Label>
                  <Select value={form.service_type} onValueChange={v=>setForm({...form, service_type:v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v=>setForm({...form, status:v as OSStatus})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as OSStatus[]).map(k => (
                        <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.status === "finalizada" && (
                <>
                  <h3 className="text-xs uppercase tracking-widest text-emerald-600 font-semibold pt-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Responsáveis pela finalização
                  </h3>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700/80 dark:text-emerald-300/80 mb-1">
                    Preencha quem foi responsável por esta OS finalizada. As informações ficam salvas no histórico.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Vendedor responsável</Label>
                      <Select
                        value={form.details?.responsible_seller || ""}
                        onValueChange={v => setForm({ ...form, details: { ...form.details, responsible_seller: v } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o vendedor..." /></SelectTrigger>
                        <SelectContent>
                          {employees
                            .filter(e => e.role === "vendedor" || e.sector === "vendas")
                            .map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Setor responsável</Label>
                      <Select
                        value={form.details?.responsible_sector || ""}
                        onValueChange={v => setForm({ ...form, details: { ...form.details, responsible_sector: v } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o setor..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vendas">Vendas</SelectItem>
                          <SelectItem value="TI Interno">TI Interno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Técnico responsável</Label>
                      <Select
                        value={form.details?.responsible_technician || ""}
                        onValueChange={v => setForm({ ...form, details: { ...form.details, responsible_technician: v } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o técnico..." /></SelectTrigger>
                        <SelectContent>
                          {employees
                            .filter(e => e.role === "tecnico" || e.sector === "ti_interno")
                            .map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="ocorrencia" className="space-y-3 mt-4">
              <div className="rounded-lg bg-gradient-to-br from-sky-500/5 to-transparent border border-sky-500/20 p-3 text-xs text-sky-700/80 dark:text-sky-300/80">
                Registre o relato do cliente, observações de atendimento e detalhes do que foi acordado.
              </div>
              <div>
                <Label>Data/Hora da ocorrência</Label>
                <Input type="datetime-local"
                  value={form.details?.occurrence_at || ""}
                  onChange={e=>setForm({...form, details:{...form.details, occurrence_at:e.target.value}})} />
              </div>
              <div>
                <Label>Ocorrência / Observações</Label>
                <Textarea rows={8} placeholder="Descreva o relato do cliente, contexto do atendimento..."
                  value={form.details?.occurrence || ""}
                  onChange={e=>setForm({...form, details:{...form.details, occurrence:e.target.value}})} />
              </div>
              <div>
                <Label>Observações do técnico (controle interno)</Label>
                <Textarea rows={4} value={form.technician_notes} onChange={e=>setForm({...form, technician_notes:e.target.value})} />
              </div>
            </TabsContent>

            <TabsContent value="laudo" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data dos testes</Label>
                  <Input type="datetime-local"
                    value={form.details?.tested_at || ""}
                    onChange={e=>setForm({...form, details:{...form.details, tested_at:e.target.value}})} />
                </div>
                <div>
                  <Label>Diagnóstico</Label>
                  <Input placeholder="Resumo do diagnóstico"
                    value={form.details?.diagnosis || ""}
                    onChange={e=>setForm({...form, details:{...form.details, diagnosis:e.target.value}})} />
                </div>
              </div>
              <div>
                <Label>Laudo técnico completo</Label>
                <Textarea rows={10} placeholder="Resultado dos testes, peças avaliadas, condições do equipamento..."
                  value={form.details?.report || ""}
                  onChange={e=>setForm({...form, details:{...form.details, report:e.target.value}})} />
              </div>
              {editing && (
                <div className="mt-3 rounded-xl border bg-muted/20 overflow-hidden">
                  <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2 text-sm font-semibold">
                    <History className="h-4 w-4 text-primary" />
                    Histórico do laudo
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {laudoHistory.length} {laudoHistory.length === 1 ? "alteração" : "alterações"}
                    </span>
                  </div>
                  {laudoHistory.length === 0 ? (
                    <div className="p-4 text-xs text-center text-muted-foreground">
                      Nenhuma alteração no laudo registrada ainda.
                    </div>
                  ) : (
                    <ul className="divide-y max-h-64 overflow-auto">
                      {laudoHistory.map((h) => {
                        const lines = (h.notes || "")
                          .split("\n")
                          .filter((l) => /Laudo|Diagn[óo]stico|Data dos testes/i.test(l));
                        return (
                          <li key={h.id} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                              <span>{h.user_email || "—"}</span>
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {lines.map((l, i) => (
                                <li key={i} className="text-foreground">• {l}</li>
                              ))}
                            </ul>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="produtos" className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Produtos / Peças utilizadas</h4>
                  <p className="text-xs text-muted-foreground">Selecione um produto cadastrado ou digite um novo nome.</p>
                </div>
                <Button size="sm" variant="outline" onClick={()=>{
                  const list = form.details?.products || [];
                  setForm({...form, details:{...form.details, products:[...list, { id: uid(), name:"", qty:"1", price:"0" }]}});
                }}><Plus className="h-3.5 w-3.5 mr-1"/>Adicionar item</Button>
              </div>
              <datalist id="os-catalog-products">
                {catalog.map(c => (
                  <option key={c.id} value={c.name}>{c.sku ? `${c.sku} • ` : ""}{brl(Number(c.sale_price))}</option>
                ))}
              </datalist>
              <div className="space-y-2">
                {(form.details?.products || []).length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
                    Nenhum produto adicionado.
                  </div>
                )}
                {(form.details?.products || []).map((p, idx) => (
                  <div key={p.id} className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-2 rounded-lg">
                    <div className="col-span-6"><Label className="text-xs">Produto</Label>
                      <Input list="os-catalog-products" placeholder="Buscar cadastro ou digitar..."
                        value={p.name} onChange={e=>{
                        const name = e.target.value;
                        const match = catalog.find(c => c.name.toLowerCase() === name.toLowerCase());
                        const list=[...(form.details?.products||[])];
                        list[idx] = {
                          ...p,
                          name,
                          price: match && (!p.price || p.price === "0") ? String(match.sale_price) : p.price,
                        };
                        setForm({...form, details:{...form.details, products:list}});
                      }}/></div>
                    <div className="col-span-2"><Label className="text-xs">Qtd</Label>
                      <Input type="number" value={p.qty} onChange={e=>{
                        const list=[...(form.details?.products||[])]; list[idx]={...p, qty:e.target.value};
                        setForm({...form, details:{...form.details, products:list}});
                      }}/></div>
                    <div className="col-span-3"><Label className="text-xs">Preço unit. (R$)</Label>
                      <CurrencyInput value={p.price} onValueChange={v=>{
                        const list=[...(form.details?.products||[])]; list[idx]={...p, price:String(v)};
                        setForm({...form, details:{...form.details, products:list}});
                      }}/></div>
                    <div className="col-span-1">
                      <button type="button" onClick={()=>{
                        const list=(form.details?.products||[]).filter(x=>x.id!==p.id);
                        setForm({...form, details:{...form.details, products:list}});
                      }} className="h-10 w-full flex items-center justify-center text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </div>
                ))}
                {(form.details?.products || []).length > 0 && (
                  <div className="text-right text-sm pt-2">
                    Subtotal de produtos: <b>{brl((form.details?.products||[]).reduce((s,p)=>s + (parseFloat(p.qty||"0")*parseFloat(p.price||"0")),0))}</b>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="servicos" className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Serviços adicionais</h4>
                <Button size="sm" variant="outline" onClick={()=>{
                  const list = form.details?.services || [];
                  setForm({...form, details:{...form.details, services:[...list, { id: uid(), name:"", price:"0" }]}});
                }}><Plus className="h-3.5 w-3.5 mr-1"/>Adicionar serviço</Button>
              </div>
              <div className="space-y-2">
                {(form.details?.services || []).length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
                    Nenhum serviço adicional.
                  </div>
                )}
                {(form.details?.services || []).map((s, idx) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-2 rounded-lg">
                    <div className="col-span-8"><Label className="text-xs">Serviço</Label>
                      <Input value={s.name} onChange={e=>{
                        const list=[...(form.details?.services||[])]; list[idx]={...s, name:e.target.value};
                        setForm({...form, details:{...form.details, services:list}});
                      }}/></div>
                    <div className="col-span-3"><Label className="text-xs">Valor (R$)</Label>
                      <CurrencyInput value={s.price} onValueChange={v=>{
                        const list=[...(form.details?.services||[])]; list[idx]={...s, price:String(v)};
                        setForm({...form, details:{...form.details, services:list}});
                      }}/></div>
                    <div className="col-span-1">
                      <button type="button" onClick={()=>{
                        const list=(form.details?.services||[]).filter(x=>x.id!==s.id);
                        setForm({...form, details:{...form.details, services:list}});
                      }} className="h-10 w-full flex items-center justify-center text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="solucao" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data da solução</Label>
                  <Input type="datetime-local"
                    value={form.details?.solved_at || ""}
                    onChange={e=>setForm({...form, details:{...form.details, solved_at:e.target.value}})} />
                </div>
                <div>
                  <Label>Garantia (dias)</Label>
                  <Input type="number" value={form.details?.warranty_days || ""}
                    onChange={e=>setForm({...form, details:{...form.details, warranty_days:e.target.value}})} />
                </div>
              </div>
              <div>
                <Label>Solução aplicada</Label>
                <Textarea rows={10} placeholder="Descreva o que foi feito, peças trocadas, ajustes realizados..."
                  value={form.details?.solution || ""}
                  onChange={e=>setForm({...form, details:{...form.details, solution:e.target.value}})} />
              </div>
            </TabsContent>

            <TabsContent value="imagens" className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Imagens (URLs)</h4>
                <Button size="sm" variant="outline" onClick={()=>{
                  const list = form.details?.images || [];
                  setForm({...form, details:{...form.details, images:[...list, { id: uid(), url:"", caption:"" }]}});
                }}><Plus className="h-3.5 w-3.5 mr-1"/>Adicionar imagem</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(form.details?.images || []).length === 0 && (
                  <div className="col-span-2 text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
                    Nenhuma imagem. Cole o link de uma imagem (ex.: do Drive, Imgur).
                  </div>
                )}
                {(form.details?.images || []).map((img, idx) => (
                  <div key={img.id} className="bg-muted/30 p-2 rounded-lg space-y-2">
                    {img.url && (
                      <div className="aspect-video bg-background rounded overflow-hidden flex items-center justify-center">
                        <img src={img.url} alt={img.caption||"OS"} className="max-w-full max-h-full object-contain" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>
                      </div>
                    )}
                    <Input placeholder="URL da imagem" value={img.url} onChange={e=>{
                      const list=[...(form.details?.images||[])]; list[idx]={...img, url:e.target.value};
                      setForm({...form, details:{...form.details, images:list}});
                    }}/>
                    <div className="flex gap-2">
                      <Input placeholder="Legenda" value={img.caption} onChange={e=>{
                        const list=[...(form.details?.images||[])]; list[idx]={...img, caption:e.target.value};
                        setForm({...form, details:{...form.details, images:list}});
                      }}/>
                      <button type="button" onClick={()=>{
                        const list=(form.details?.images||[]).filter(x=>x.id!==img.id);
                        setForm({...form, details:{...form.details, images:list}});
                      }} className="px-3 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-3 mt-4">
              <ChecklistPicker
                osNumber={editing?.os_number}
                hasProducts={(form.details?.products || []).length > 0}
                onApplyProducts={(items) => {
                  if (items.length === 0) { toast.info("Este checklist não tem itens preenchidos."); return; }
                  const existing = form.details?.products || [];
                  const newLines = items.map(it => ({
                    id: uid(),
                    name: it.cod ? `${it.label} — ${it.desc} (${it.cod})` : `${it.label} — ${it.desc}`,
                    qty: "1",
                    price: "0",
                  }));
                  setForm({ ...form, details: { ...form.details, products: [...existing, ...newLines] } });
                  toast.success(`${newLines.length} ite${newLines.length === 1 ? "m" : "ns"} do checklist adicionado${newLines.length === 1 ? "" : "s"} aos produtos.`);
                }}
                onOpen={(query) => {
                  setOpen(false);
                  navigate(`/admin/checklist${query}`);
                }}
              />
            </TabsContent>

            <TabsContent value="outros" className="space-y-3 mt-4">
              <div>
                <Label>Referência externa</Label>
                <Input placeholder="Nº de pedido, NF, chamado externo..."
                  value={form.details?.reference || ""}
                  onChange={e=>setForm({...form, details:{...form.details, reference:e.target.value}})}/>
              </div>
              <div>
                <Label>Outras informações</Label>
                <Textarea rows={8} placeholder="Qualquer informação adicional relevante para esta OS..."
                  value={form.details?.other_notes || ""}
                  onChange={e=>setForm({...form, details:{...form.details, other_notes:e.target.value}})}/>
              </div>
              {editing && (
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                  <div>Aberta por: <b>{editing.created_by_email || "—"}</b></div>
                  <div>Criada em: <b>{new Date(editing.created_at).toLocaleString("pt-BR")}</b></div>
                  <div>Finalizada por: <b>{editing.finalized_by_email || "—"}</b></div>
                  <div>Finalizada em: <b>{editing.finalized_at ? new Date(editing.finalized_at).toLocaleString("pt-BR") : "—"}</b></div>
                </div>
              )}
            </TabsContent>
            </Tabs>

            <Button onClick={save} className="w-full bg-gradient-primary text-white">
              {editing ? "Salvar alterações" : "Criar OS"}
            </Button>
            {editing && form.status === "finalizada" && (
              <Button
                onClick={() => {
                  const total = Math.max(0, (parseFloat(form.service_value || "0") || 0) - (parseFloat(form.discount || "0") || 0));
                  const productLabel = form.product?.trim() || `OS #${editing.os_number}`;
                  sessionStorage.setItem("sale_prefill", JSON.stringify({
                    customer_name: form.client_name,
                    customer_phone: form.client_phone,
                    amount: total || (parseFloat(form.amount_paid || "0") || 0),
                    profit: Math.max(0, total - (parseFloat(form.parts_cost || "0") || 0)),
                    product: `Serviço — ${productLabel}`,
                    notes: `Origem: OS #${editing.os_number}`,
                    type: "servico",
                  }));
                  setOpen(false);
                  navigate("/admin/sales");
                }}
                variant="outline"
                className="w-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Lançar venda
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer picker (fullscreen) */}
      <Dialog open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
        <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0 gap-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="font-display flex items-center gap-2">
              <Search className="h-5 w-5" /> Selecionar cliente
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden">
            {/* List */}
            <div className="border-r flex flex-col overflow-hidden">
              <div className="p-3 border-b">
                <Input
                  placeholder="Buscar por nome, CPF, telefone, e-mail..."
                  value={customerQuery}
                  onChange={e => setCustomerQuery(e.target.value)}
                  autoFocus
                />
                <div className="text-xs text-muted-foreground mt-2">
                  {customers.length} clientes cadastrados
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {customers
                  .filter(c => {
                    const q = customerQuery.trim().toLowerCase();
                    if (!q) return true;
                    return c.name.toLowerCase().includes(q)
                      || (c.cpf_formatted || "").toLowerCase().includes(q)
                      || (c.phone || "").toLowerCase().includes(q)
                      || (c.email || "").toLowerCase().includes(q);
                  })
                  .map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={async () => {
                        setPickerSelected(c);
                        const [{ data: salesData }, { count: osCount }] = await Promise.all([
                          supabase.from("sales").select("*").eq("customer_id", c.id).order("sale_date", { ascending: false }),
                          supabase.from("service_orders").select("*", { count: "exact", head: true }).ilike("client_name", c.name),
                        ]);
                        setPickerSales((salesData as any) || []);
                        setPickerOSCount(osCount || 0);
                      }}
                      className={`w-full text-left p-3 border-b hover:bg-muted/40 transition ${pickerSelected?.id === c.id ? "bg-primary/10" : ""}`}
                    >
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.cpf_formatted || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.phone || "Sem telefone"}</div>
                    </button>
                  ))}
                {customers.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum cliente cadastrado ainda.
                  </div>
                )}
              </div>
            </div>

            {/* Detail */}
            <div className="overflow-y-auto p-6 bg-muted/20">
              {!pickerSelected ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Selecione um cliente à esquerda para ver os detalhes e o histórico.
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-5">
                  <div className="bg-card rounded-2xl border shadow-elegant p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Cliente</div>
                        <h2 className="font-display text-2xl font-bold">{pickerSelected.name}</h2>
                        <div className="text-sm text-muted-foreground font-mono mt-1">{pickerSelected.cpf_formatted || "Sem CPF"}</div>
                      </div>
                      <Button
                        className="bg-gradient-primary text-white"
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            client_name: pickerSelected!.name,
                            client_phone: pickerSelected!.phone || f.client_phone,
                          }));
                          setCustomerPickerOpen(false);
                          toast.success("Cliente selecionado");
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Usar este cliente
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 text-sm">
                      <Info label="Telefone" value={pickerSelected.phone} />
                      <Info label="E-mail" value={pickerSelected.email} />
                      <Info label="Cidade / UF" value={[pickerSelected.city, pickerSelected.state].filter(Boolean).join(" / ")} />
                      <Info label="Origem" value={pickerSelected.origin} />
                      <Info label="Status" value={pickerSelected.status} />
                      <Info label="Cadastrado em" value={pickerSelected.created_at ? new Date(pickerSelected.created_at).toLocaleDateString("pt-BR") : null} />
                    </div>
                    {pickerSelected.notes && (
                      <div className="mt-4 text-sm">
                        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Observações</div>
                        <div className="bg-muted/40 rounded-lg p-3">{pickerSelected.notes}</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Vendas registradas" value={pickerSales.length} />
                    <Stat label="Total comprado" value={brl(pickerSales.reduce((a, s) => a + Number(s.amount || 0), 0))} />
                    <Stat label="OS vinculadas" value={pickerOSCount} />
                  </div>

                  <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
                    <div className="p-4 border-b">
                      <h3 className="font-display font-semibold">Histórico de compras</h3>
                    </div>
                    {pickerSales.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Este cliente ainda não possui compras registradas.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left p-3">Data</th>
                            <th className="text-left p-3">Tipo</th>
                            <th className="text-left p-3">Produto</th>
                            <th className="text-left p-3">Vendedor</th>
                            <th className="text-right p-3">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pickerSales.map(s => (
                            <tr key={s.id} className="border-t">
                              <td className="p-3">{new Date(s.sale_date).toLocaleDateString("pt-BR")}</td>
                              <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary uppercase tracking-wider">{s.type}</span></td>
                              <td className="p-3 text-muted-foreground">{s.product || "—"}</td>
                              <td className="p-3">{s.employee_name}</td>
                              <td className="p-3 text-right font-medium text-primary">{brl(Number(s.amount))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist dialog */}
      <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Checklist — Notebook/Computador {checklistOS ? `· OS #${checklistOS.os_number}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>Cliente</Label><Input value={checklist.cliente || ""} onChange={e=>setChecklist(c=>({...c, cliente:e.target.value}))}/></div>
              <div><Label>O.S.</Label><Input value={checklist.os || ""} onChange={e=>setChecklist(c=>({...c, os:e.target.value}))}/></div>
              <div><Label>Nº Orçamento</Label><Input value={checklist.numero_orcamento || ""} onChange={e=>setChecklist(c=>({...c, numero_orcamento:e.target.value}))}/></div>
              <div><Label>CPF/CNPJ</Label><Input value={checklist.cpf_cnpj || ""} onChange={e=>setChecklist(c=>({...c, cpf_cnpj:e.target.value}))}/></div>
              <div><Label>Data</Label><Input type="date" value={checklist.data || ""} onChange={e=>setChecklist(c=>({...c, data:e.target.value}))}/></div>
              <div><Label>Nº Venda</Label><Input value={checklist.nro_venda || ""} onChange={e=>setChecklist(c=>({...c, nro_venda:e.target.value}))}/></div>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-[160px_1fr_140px] gap-0 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="p-2">Item</div>
                <div className="p-2">Descrição</div>
                <div className="p-2">Código</div>
              </div>
              {CHECKLIST_ITEMS.map(it => {
                const cur = checklist.itens?.[it.key] || { desc: "", cod: "" };
                return (
                  <div key={it.key} className="grid grid-cols-[160px_1fr_140px] items-center border-t">
                    <div className="p-2 text-sm font-medium">{it.label}</div>
                    <div className="p-1.5"><Input className="h-8" value={cur.desc} onChange={e=>setChkItem(it.key,"desc",e.target.value)} placeholder="—"/></div>
                    <div className="p-1.5"><Input className="h-8" value={cur.cod} onChange={e=>setChkItem(it.key,"cod",e.target.value)} placeholder="COD"/></div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>Valor Total</Label><Input value={checklist.valor_total || ""} onChange={e=>setChecklist(c=>({...c, valor_total:e.target.value}))}/></div>
              <div><Label>Garantia</Label><Input value={checklist.garantia || ""} onChange={e=>setChecklist(c=>({...c, garantia:e.target.value}))}/></div>
              <div><Label>Sistema</Label><Input value={checklist.sistema || ""} onChange={e=>setChecklist(c=>({...c, sistema:e.target.value}))}/></div>
              <div className="md:col-span-3"><Label>Forma de Pagamento</Label><Input value={checklist.forma_pagamento || ""} onChange={e=>setChecklist(c=>({...c, forma_pagamento:e.target.value}))}/></div>
              <div className="md:col-span-3"><Label>OBS</Label><Textarea rows={2} value={checklist.obs || ""} onChange={e=>setChecklist(c=>({...c, obs:e.target.value}))}/></div>
              <div><Label>Data da Entrega</Label><Input type="date" value={checklist.data_entrega || ""} onChange={e=>setChecklist(c=>({...c, data_entrega:e.target.value}))}/></div>
              <div><Label>Horário</Label><Input value={checklist.horario_entrega || ""} onChange={e=>setChecklist(c=>({...c, horario_entrega:e.target.value}))} placeholder="00:00"/></div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveChecklist} className="flex-1 bg-gradient-primary text-white">Salvar Checklist</Button>
              <Button type="button" variant="outline" onClick={()=>printChecklist()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              Histórico — OS #{historyOS?.os_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {history.length === 0 && <div className="text-center text-muted-foreground py-8 text-sm">Sem histórico ainda.</div>}
            {history.map(h => (
              <div key={h.id} className="border rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">
                    {h.action === "created" ? "OS criada" :
                     h.action === "status_changed" ? "Status alterado" : "Atualizada"}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                </div>
                {h.from_status && h.to_status && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {STATUS_LABEL[h.from_status]} → <b>{STATUS_LABEL[h.to_status]}</b>
                  </div>
                )}
                {h.to_status && !h.from_status && (
                  <div className="text-xs text-muted-foreground mt-1">Status: <b>{STATUS_LABEL[h.to_status]}</b></div>
                )}
                {h.notes && (
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {h.notes.split("\n").map((line, i) => (
                      <li key={i} className="text-foreground/80">• {line}</li>
                    ))}
                  </ul>
                )}
                <div className="text-xs text-muted-foreground mt-1">por {h.user_email || "—"}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CHK_STORAGE_KEY = "sestape_checklists_v1";

const CHECKLIST_LABELS: Record<string, string> = {
  notebook: "Notebook", impressora: "Impressora", processador: "Processador",
  placa_mae: "Placa Mãe", memoria_ram: "Memória RAM", hd_ssd: "HD/SSD",
  fonte: "Fonte", cooler: "Cooler", placa_video: "Placa de Vídeo",
  gabinete: "Gabinete", teclado_mouse: "Teclado/Mouse", caixa_som: "Caixa de Som",
  cabo_energia: "Cabo Energia", filt_estab_nobk: "Filt/Estab/Nobreak",
  cabo_rede: "Cabo de Rede", monitor: "Monitor",
  acessorio_1: "Acessório 1", acessorio_2: "Acessório 2", acessorio_3: "Acessório 3",
};
function buildChecklistItems(c: any): { label: string; desc: string; cod: string }[] {
  const itens = c?.itens || {};
  return Object.keys(itens).map(k => {
    const it = itens[k] || {};
    return { label: CHECKLIST_LABELS[k] || k, desc: String(it.desc || "").trim(), cod: String(it.cod || "").trim() };
  }).filter(x => x.desc || x.cod);
}

function ChecklistPicker({ osNumber, onOpen, onApplyProducts, hasProducts }: {
  osNumber?: string | number | null;
  onOpen: (query: string) => void;
  onApplyProducts?: (items: { label: string; desc: string; cod: string }[]) => void;
  hasProducts?: boolean;
}) {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const autoAppliedRef = (typeof window !== "undefined") ? (window as any) : {};

  useEffect(() => {
    try { setList(JSON.parse(localStorage.getItem(CHK_STORAGE_KEY) || "[]")); } catch { setList([]); }
  }, []);

  const linked = useMemo(() => {
    if (!osNumber) return null;
    return list.find(c => String(c.os || "").trim() === String(osNumber).trim()) || null;
  }, [list, osNumber]);

  // Auto-importa produtos do checklist vinculado quando a aba de produtos ainda está vazia
  useEffect(() => {
    if (!linked || !onApplyProducts || hasProducts) return;
    const k = `__os_chk_applied_${osNumber}_${linked.id}`;
    if ((autoAppliedRef as any)[k]) return;
    (autoAppliedRef as any)[k] = true;
    const items = buildChecklistItems(linked);
    if (items.length > 0) onApplyProducts(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, hasProducts]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sorted = [...list].sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
    if (!s) return sorted;
    return sorted.filter(c =>
      String(c.cliente || "").toLowerCase().includes(s) ||
      String(c.os || "").toLowerCase().includes(s) ||
      String(c.cpf_cnpj || "").toLowerCase().includes(s) ||
      String(c.numero_orcamento || "").toLowerCase().includes(s)
    );
  }, [list, q]);

  const fmt = (iso?: string) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return d && m && y ? `${d}/${m}/${y}` : iso;
  };

  return (
    <div className="space-y-3">
      <div className="bg-muted/30 rounded-lg p-3 flex items-start gap-2">
        <ListChecks className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Checklist desta OS</div>
          <div className="text-xs text-muted-foreground">
            {linked
              ? `Existe um checklist vinculado à OS #${osNumber}.`
              : osNumber
                ? "Nenhum checklist vinculado a esta OS — você pode criar um novo pré-preenchido."
                : "Salve a OS para vincular ou criar um checklist."}
          </div>
        </div>
        {osNumber ? (
          <div className="flex gap-2 flex-wrap justify-end">
            {linked && onApplyProducts && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onApplyProducts(buildChecklistItems(linked))}
                title="Adicionar os itens do checklist na aba Produtos"
              >
                Importar produtos
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="bg-gradient-primary text-white"
              onClick={() => onOpen(`?os=${osNumber}`)}
            >
              {linked ? "Abrir vinculado" : "Criar para esta OS"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pesquisar checklist (cliente, OS, CPF/CNPJ, orçamento)..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="rounded-lg border divide-y max-h-[340px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {list.length === 0 ? "Nenhum checklist salvo ainda." : "Nenhum checklist encontrado."}
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{c.cliente || "(sem cliente)"}</div>
              <div className="text-xs text-muted-foreground truncate">
                OS {c.os || "—"} · {fmt(c.data)} {c.numero_orcamento ? `· Orç. ${c.numero_orcamento}` : ""}
              </div>
            </div>
            {onApplyProducts && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onApplyProducts(buildChecklistItems(c))}
                title="Importar itens deste checklist para a aba Produtos"
              >
                Importar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => printChecklistPage(c)}
              title="Imprimir"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpen(`?id=${c.id}`)}
            >
              Abrir
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-elegant">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="text-xl font-display font-bold">{value}</div>
    </div>
  );
}