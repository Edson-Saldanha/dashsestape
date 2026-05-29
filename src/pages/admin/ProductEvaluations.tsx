import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Plus, Search, AlertTriangle, ListChecks, LayoutGrid, List, ShoppingBag, Wallet, Clock, PackageCheck, RotateCcw, UserCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";
import StatCard from "@/components/dashboard/StatCard";
import {
  EvaluationStatus,
  EVALUATION_STATUSES,
  EVAL_STATUS_LABEL,
  statusClasses,
  daysBetween,
} from "@/lib/evaluationStatus";
import { CATEGORY_OPTIONS, defectsFor } from "@/lib/evaluationCategories";
import { DefectChecklist } from "@/components/DefectChecklist";
import { formatCPF, formatPhoneBR } from "@/lib/cpf";

type Evaluation = {
  id: string;
  evaluation_number: number;
  status: EvaluationStatus;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_cpf: string | null;
  customer_notes: string | null;
  entry_date: string;
  received_by_id: string | null;
  received_by_name: string | null;
  store_unit: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  color: string | null;
  visual_condition: string | null;
  accessories: string | null;
  has_box: boolean;
  has_charger: boolean;
  client_reported_defects: string | null;
  apparent_defects: string | null;
  offered_value: number;
  final_value: number;
  status_changed_at: string;
  created_at: string;
};

const STAGNANT_DAYS = 7;

const emptyForm = {
  customer_name: "",
  customer_phone: "",
  customer_cpf: "",
  customer_notes: "",
  received_by_name: "",
  category: "",
  brand: "",
  model: "",
  serial_number: "",
  color: "",
  visual_condition: "",
  accessories: "",
  has_box: false,
  has_charger: false,
  client_reported_defects: "",
  apparent_defects: "",
};

export default function ProductEvaluations() {
  const { user } = useAuth();
  const [items, setItems] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // customer suggestion
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<any[]>([]);

  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("employees").select("id, name").eq("active", true).order("name").then(({ data }) => {
      setEmployeeOptions((data as any) || []);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_evaluations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar avaliações");
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Customer search
  useEffect(() => {
    const q = custQuery.trim();
    if (q.length < 2) { setCustResults([]); return; }
    let cancelled = false;
    supabase
      .from("customers")
      .select("id, name, phone, whatsapp, cpf_formatted")
      .or(`name.ilike.%${q}%,cpf_formatted.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(8)
      .then(({ data }) => { if (!cancelled) setCustResults(data || []); });
    return () => { cancelled = true; };
  }, [custQuery]);

  const employees = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.received_by_name) s.add(i.received_by_name); });
    return Array.from(s).sort();
  }, [items]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.category) s.add(i.category); });
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterEmployee !== "all" && i.received_by_name !== filterEmployee) return false;
      if (filterCategory !== "all" && i.category !== filterCategory) return false;
      if (filterDate) {
        const d = new Date(i.entry_date).toISOString().slice(0, 10);
        if (d !== filterDate) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const blob = `${i.evaluation_number} ${i.customer_name} ${i.brand || ""} ${i.model || ""} ${i.serial_number || ""} ${i.category || ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterStatus, filterEmployee, filterCategory, filterDate, search]);

  // Summary metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inEvaluation = items.filter(i => ["recebido", "aguardando_avaliacao", "em_avaliacao", "aguardando_aprovacao_cliente", "aprovado_compra"].includes(i.status)).length;
    const waitingTech = items.filter(i => ["recebido", "aguardando_avaliacao"].includes(i.status)).length;
    const waitingClient = items.filter(i => i.status === "aguardando_aprovacao_cliente").length;
    const purchasedMonth = items.filter(i => i.status === "comprado" && new Date(i.created_at) >= monthStart);
    const totalInvested = purchasedMonth.reduce((s, i) => s + (Number(i.final_value) || 0), 0);
    const readyResale = items.filter(i => i.status === "pronto_revenda").length;
    const returned = items.filter(i => i.status === "devolvido").length;
    const finalized = items.filter(i => ["comprado", "devolvido", "vendido", "recusado_loja", "cliente_recusou"].includes(i.status));
    const avgDays = finalized.length
      ? finalized.reduce((s, i) => s + daysBetween(i.created_at, new Date(i.status_changed_at)), 0) / finalized.length
      : 0;
    return {
      inEvaluation,
      waitingTech,
      waitingClient,
      purchasedMonth: purchasedMonth.length,
      totalInvested,
      readyResale,
      returned,
      avgDays: avgDays.toFixed(1),
    };
  }, [items]);

  const submit = async () => {
    if (!form.customer_name.trim()) { toast.error("Informe o nome do cliente"); return; }
    setSaving(true);
    const payload: any = {
      ...form,
      received_by_id: user?.id || null,
      received_by_name: form.received_by_name || user?.email || null,
      created_by: user?.id || null,
      created_by_email: user?.email || null,
    };
    const { error } = await supabase.from("product_evaluations").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Avaliação registrada");
    setOpen(false);
    setForm(emptyForm);
    setCustQuery("");
    load();
  };

  const pickCustomer = (c: any) => {
    setForm(f => ({
      ...f,
      customer_name: c.name || "",
      customer_phone: formatPhoneBR(c.whatsapp || c.phone || ""),
      customer_cpf: formatCPF(c.cpf_formatted || ""),
    }));
    setCustQuery("");
    setCustResults([]);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 lg:h-7 lg:w-7 text-primary" />
            Avaliação de Produtos
          </h1>
          <p className="text-sm text-muted-foreground">Controle de produtos usados recebidos para avaliação de compra.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova avaliação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar entrada de produto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Buscar cliente cadastrado</Label>
                <div className="relative">
                  <Input
                    placeholder="Nome, CPF ou telefone..."
                    value={custQuery}
                    onChange={(e) => setCustQuery(e.target.value)}
                  />
                  {custResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-56 overflow-y-auto">
                      {custResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.cpf_formatted || ""} · {c.whatsapp || c.phone || ""}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome do cliente *</Label>
                  <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone / WhatsApp</Label>
                  <Input
                    value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: formatPhoneBR(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={form.customer_cpf}
                    onChange={e => setForm({ ...form, customer_cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label>Funcionário que recebeu</Label>
                  <Select value={form.received_by_name} onValueChange={(v) => setForm({ ...form, received_by_name: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                    <SelectContent>
                      {employeeOptions.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Tipo de produto" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
                </div>
                <div>
                  <Label>Número de série</Label>
                  <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Estado visual</Label>
                  <Input value={form.visual_condition} onChange={e => setForm({ ...form, visual_condition: e.target.value })} placeholder="Excelente, bom, marcas de uso..." />
                </div>
                <div className="md:col-span-2">
                  <Label>Acessórios inclusos</Label>
                  <Input value={form.accessories} onChange={e => setForm({ ...form, accessories: e.target.value })} />
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.has_box} onCheckedChange={v => setForm({ ...form, has_box: v })} /><Label>Acompanha caixa</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.has_charger} onCheckedChange={v => setForm({ ...form, has_charger: v })} /><Label>Acompanha carregador</Label></div>
                <div className="md:col-span-2">
                  <Label>Defeitos informados pelo cliente</Label>
                  <DefectChecklist
                    options={defectsFor(form.category)}
                    value={form.client_reported_defects}
                    onChange={(v) => setForm({ ...form, client_reported_defects: v })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Defeitos aparentes identificados</Label>
                  <DefectChecklist
                    options={defectsFor(form.category)}
                    value={form.apparent_defects}
                    onChange={(v) => setForm({ ...form, apparent_defects: v })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Observações do cliente</Label>
                  <Textarea value={form.customer_notes} onChange={e => setForm({ ...form, customer_notes: e.target.value })} rows={2} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Registrar entrada"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard icon={ClipboardCheck} label="Em avaliação" value={String(metrics.inEvaluation)} accent="primary" />
        <StatCard icon={Wrench} label="Aguardando técnico" value={String(metrics.waitingTech)} accent="warning" />
        <StatCard icon={UserCheck} label="Aguardando cliente" value={String(metrics.waitingClient)} accent="warning" />
        <StatCard icon={ShoppingBag} label="Comprados no mês" value={String(metrics.purchasedMonth)} accent="success" />
        <StatCard icon={Wallet} label="Investido no mês" value={brl(metrics.totalInvested)} accent="success" />
        <StatCard icon={PackageCheck} label="Pronto p/ revenda" value={String(metrics.readyResale)} accent="success" />
        <StatCard icon={RotateCcw} label="Devolvidos" value={String(metrics.returned)} accent="warning" />
        <StatCard icon={Clock} label="Tempo médio (dias)" value={String(metrics.avgDays)} accent="primary" />
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {EVALUATION_STATUSES.map(s => <SelectItem key={s} value={s}>{EVAL_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger><SelectValue placeholder="Funcionário" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos funcionários</SelectItem>
              {employees.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{filtered.length} resultado(s)</div>
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="cards"><LayoutGrid className="h-3.5 w-3.5 mr-1" /> Cards</TabsTrigger>
              <TabsTrigger value="table"><List className="h-3.5 w-3.5 mr-1" /> Tabela</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">Nenhuma avaliação encontrada.</div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(it => <EvalCard key={it.id} it={it} />)}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Oferta / Final</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(it => {
                const cls = statusClasses(it.status);
                const days = daysBetween(it.status_changed_at);
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono">#{it.evaluation_number}</TableCell>
                    <TableCell>{it.customer_name}</TableCell>
                    <TableCell>{[it.brand, it.model].filter(Boolean).join(" ") || "-"}<div className="text-xs text-muted-foreground">{it.category || ""}</div></TableCell>
                    <TableCell className="text-sm">{new Date(it.entry_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">{it.received_by_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cls.badge}>{EVAL_STATUS_LABEL[it.status]}</Badge>
                      {days > STAGNANT_DAYS && <div className="text-[10px] text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {days} dias parado</div>}
                    </TableCell>
                    <TableCell className="text-right tabular text-sm">
                      {brl(it.offered_value)}{it.final_value ? <div className="text-xs text-emerald-600">{brl(it.final_value)}</div> : null}
                    </TableCell>
                    <TableCell><Link to={`/admin/product-evaluations/${it.id}`}><Button size="sm" variant="ghost">Abrir</Button></Link></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function EvalCard({ it }: { it: Evaluation }) {
  const cls = statusClasses(it.status);
  const days = daysBetween(it.status_changed_at);
  const stagnant = days > STAGNANT_DAYS;
  return (
    <Link to={`/admin/product-evaluations/${it.id}`}>
      <Card className={`p-4 hover:shadow-md transition-shadow ${cls.card}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="font-mono text-xs text-muted-foreground">#{it.evaluation_number}</div>
            <div className="font-semibold">{it.customer_name}</div>
          </div>
          <Badge variant="outline" className={cls.badge}>{EVAL_STATUS_LABEL[it.status]}</Badge>
        </div>
        <div className="text-sm">{[it.brand, it.model].filter(Boolean).join(" ") || "Produto sem detalhes"}</div>
        <div className="text-xs text-muted-foreground">{it.category || "—"} {it.serial_number ? `· SN ${it.serial_number}` : ""}</div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Entrada {new Date(it.entry_date).toLocaleDateString("pt-BR")}</span>
          <span className="tabular font-medium">{brl(it.final_value || it.offered_value)}</span>
        </div>
        {stagnant && (
          <div className="mt-2 text-xs text-destructive flex items-center gap-1 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" /> Parado há {days} dias
          </div>
        )}
      </Card>
    </Link>
  );
}