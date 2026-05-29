import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, UserSquare, AlertCircle, ShieldAlert, UserCheck, UserPlus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/useRole";
import { logActivity } from "@/lib/activity";
import { formatCPF, isValidCPF, onlyDigits, formatPhoneBR } from "@/lib/cpf";
import { brl } from "@/lib/format";
import CollaboratorWallet from "@/components/CollaboratorWallet";

interface Customer {
  id: string;
  name: string;
  cpf: string;
  cpf_formatted: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  origin: string | null;
  status: string;
  notes: string | null;
  is_collaborator?: boolean;
  created_at: string;
}

const ORIGINS = ["Indicação", "Instagram", "Facebook", "Google", "WhatsApp", "Loja física", "Site", "Outros"];
const STATUSES = [
  { v: "ativo", l: "Ativo" },
  { v: "inativo", l: "Inativo" },
];
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const empty = {
  name: "", cpf: "", phone: "", email: "", address: "", city: "", state: "",
  origin: "", status: "ativo", notes: "", is_collaborator: false,
};

export default function Customers() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [list, setList] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [dup, setDup] = useState<Customer | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [customerSales, setCustomerSales] = useState<any[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailSales, setDetailSales] = useState<any[]>([]);
  const [detailOSCount, setDetailOSCount] = useState(0);

  const [walletOpen, setWalletOpen] = useState(false);
  const [walletCustomer, setWalletCustomer] = useState<Customer | null>(null);
  const openWallet = (c: Customer) => { setWalletCustomer(c); setWalletOpen(true); };

  const openDetail = async (c: Customer) => {
    setDetailCustomer(c);
    setDetailOpen(true);
    setDetailSales([]);
    setDetailOSCount(0);
    const [{ data: salesData }, { count: osCount }] = await Promise.all([
      supabase.from("sales").select("*").eq("customer_id", c.id).order("sale_date", { ascending: false }),
      supabase.from("service_orders").select("*", { count: "exact", head: true }).ilike("client_name", c.name),
    ]);
    setDetailSales((salesData as any) || []);
    setDetailOSCount(osCount || 0);
  };

  const refresh = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setList((data as any) || []);
  };
  const refreshDupCount = async () => {
    const { count } = await supabase
      .from("activity_log")
      .select("*", { count: "exact", head: true })
      .eq("action", "customer.duplicate_blocked");
    setDuplicateCount(count || 0);
  };

  useEffect(() => { refresh(); refreshDupCount(); }, []);

  const resetForm = () => { setEditing(null); setForm({ ...empty }); setDup(null); setCustomerSales([]); };

  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name, cpf: c.cpf_formatted || formatCPF(c.cpf), phone: c.phone || "",
      email: c.email || "", address: c.address || "", city: c.city || "", state: c.state || "",
      origin: c.origin || "", status: c.status, notes: c.notes || "", is_collaborator: !!c.is_collaborator,
    });
    setDup(null);
    setOpen(true);
    supabase.from("sales").select("*").eq("customer_id", c.id).order("sale_date", { ascending: false })
      .then(({ data }) => setCustomerSales((data as any) || []));
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome");
    if (!isValidCPF(form.cpf)) return toast.error("CPF inválido. Verifique os dados e tente novamente.");

    const cpfDigits = onlyDigits(form.cpf);

    if (!editing) {
      const { data: exist } = await supabase.from("customers").select("*").eq("cpf", cpfDigits).maybeSingle();
      if (exist) {
        setDup(exist as any);
        logActivity("customer.duplicate_blocked", "customers", (exist as any).id, { cpf: cpfDigits });
        refreshDupCount();
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      cpf: cpfDigits,
      cpf_formatted: formatCPF(form.cpf),
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      origin: form.origin || null,
      status: form.status,
      notes: form.notes || null,
      is_collaborator: !!form.is_collaborator,
    };

    if (editing) {
      const { error } = await supabase.from("customers").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Cliente atualizado");
      logActivity("customer.updated", "customers", editing.id, { name: payload.name });
    } else {
      const { error, data } = await supabase.from("customers").insert({
        ...payload, created_by: user?.id, created_by_email: user?.email,
      }).select().single();
      if (error) return toast.error(error.message);
      toast.success("Cliente cadastrado");
      logActivity("customer.created", "customers", (data as any).id, { name: payload.name });
    }
    setOpen(false);
    resetForm();
    refresh();
  };

  const remove = async (c: Customer) => {
    if (!isAdmin) return toast.error("Apenas administradores podem excluir clientes");
    if (!confirm(`Excluir cliente "${c.name}"?`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    logActivity("customer.deleted", "customers", c.id, { name: c.name });
    toast.success("Cliente excluído");
    refresh();
  };

  const filtered = useMemo(() => {
    const q = onlyDigits(query) || query.toLowerCase();
    if (!query) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.cpf.includes(onlyDigits(query)) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [list, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total: list.length,
      monthNew: list.filter(c => new Date(c.created_at) >= monthStart).length,
      active: list.filter(c => c.status === "ativo").length,
    };
  }, [list]);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Relacionamento</div>
          <h1 className="font-display text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Cadastro completo de clientes e leads com validação de CPF</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-white shadow-glow">
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<UserSquare className="h-5 w-5" />} label="Total de clientes" value={stats.total} tone="primary" />
        <StatCard icon={<UserPlus className="h-5 w-5" />} label="Novos no mês" value={stats.monthNew} tone="emerald" />
        <StatCard icon={<ShieldAlert className="h-5 w-5" />} label="Duplicados bloqueados" value={duplicateCount} tone="rose" />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="Clientes ativos" value={stats.active} tone="indigo" />
      </div>

      <div className="bg-card rounded-2xl border shadow-elegant">
        <div className="p-4 border-b flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF, telefone ou e-mail..." value={query} onChange={e => setQuery(e.target.value)} className="border-0 focus-visible:ring-0 px-0" />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">CPF</th>
                <th className="text-left p-3">Contato</th>
                <th className="text-left p-3">Cidade/UF</th>
                <th className="text-left p-3">Origem</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    <button
                      type="button"
                      onClick={() => openDetail(c)}
                      className="text-left hover:text-primary hover:underline transition"
                    >
                      {c.name}
                    </button>
                    {c.is_collaborator && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-semibold align-middle">
                        <Wallet className="h-2.5 w-2.5" /> Colaborador
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">{c.cpf_formatted || formatCPF(c.cpf)}</td>
                  <td className="p-3 text-xs">
                    <div>{c.phone || "—"}</div>
                    <div className="text-muted-foreground">{c.email || ""}</div>
                  </td>
                  <td className="p-3 text-xs">{[c.city, c.state].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="p-3 text-xs">{c.origin || "—"}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wider">{c.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    {c.is_collaborator && (
                      <Button size="sm" variant="ghost" title="Carteira do colaborador" onClick={() => openWallet(c)}>
                        <Wallet className="h-3 w-3 text-primary" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
                    {isAdmin && <Button size="sm" variant="ghost" onClick={() => remove(c)}><Trash2 className="h-3 w-3" /></Button>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>

          {dup && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-destructive">Este lead/cliente já existe no sistema.</div>
                <div className="text-sm text-muted-foreground">
                  {dup.name} — CPF {dup.cpf_formatted || formatCPF(dup.cpf)}
                </div>
                <Button size="sm" variant="outline" className="mt-2"
                  onClick={() => { openEdit(dup); }}>
                  Ver cadastro existente
                </Button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome completo *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>CPF *</Label>
              <Input value={form.cpf} maxLength={14}
                onChange={e => { setForm({ ...form, cpf: formatCPF(e.target.value) }); setDup(null); }}
                placeholder="000.000.000-00" />
              {form.cpf && !isValidCPF(form.cpf) && (
                <div className="text-xs text-destructive mt-1">CPF inválido</div>
              )}
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input value={form.phone} maxLength={15}
                onChange={e => setForm({ ...form, phone: formatPhoneBR(e.target.value) })}
                placeholder="(00) 00000-0000" />
            </div>
            <div className="col-span-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input value={form.address} placeholder="Rua, nº, bairro, complemento"
                onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={form.origin} onValueChange={(v) => setForm({ ...form, origin: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-primary"
                  checked={!!form.is_collaborator}
                  onChange={e => setForm({ ...form, is_collaborator: e.target.checked })}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Wallet className="h-4 w-4 text-primary" /> Marcar como Cliente / Colaborador
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Habilita a <strong>carteira</strong>: lance compras feitas na loja pelo colaborador,
                    com itens, parcelas e descontos a serem aplicados no salário.
                  </div>
                </div>
                {editing?.is_collaborator && (
                  <Button type="button" size="sm" variant="outline" onClick={() => { setOpen(false); openWallet(editing!); }}>
                    Abrir carteira
                  </Button>
                )}
              </label>
            </div>
          </div>

          {editing && (
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display font-semibold">Histórico de vendas</h4>
                <span className="text-xs text-muted-foreground">
                  {customerSales.length} lançamento{customerSales.length !== 1 ? "s" : ""} •
                  {" "}Total: {brl(customerSales.reduce((a, s) => a + Number(s.amount || 0), 0))}
                </span>
              </div>
              <div className="max-h-60 overflow-auto rounded-lg border">
                {customerSales.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Este cliente ainda não possui vendas registradas.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="text-left p-2">Data</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Produto</th><th className="text-left p-2">Vendedor</th><th className="text-right p-2">Valor</th></tr>
                    </thead>
                    <tbody>
                      {customerSales.map(s => (
                        <tr key={s.id} className="border-t">
                          <td className="p-2">{new Date(s.sale_date).toLocaleDateString("pt-BR")}</td>
                          <td className="p-2"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary uppercase tracking-wider">{s.type}</span></td>
                          <td className="p-2 text-muted-foreground">{s.product || "—"}</td>
                          <td className="p-2">{s.employee_name}</td>
                          <td className="p-2 text-right font-medium tabular text-primary">{brl(Number(s.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-gradient-primary text-white">
              {editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer detail (fullscreen) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0 gap-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="font-display flex items-center gap-2">
              <UserSquare className="h-5 w-5" />
              {detailCustomer?.name || "Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
            {detailCustomer && (
              <div className="max-w-5xl mx-auto space-y-5">
                <div className="bg-card rounded-2xl border shadow-elegant p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Cliente</div>
                      <h2 className="font-display text-3xl font-bold">{detailCustomer.name}</h2>
                      <div className="text-sm text-muted-foreground font-mono mt-1">
                        {detailCustomer.cpf_formatted || formatCPF(detailCustomer.cpf)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold ${
                        detailCustomer.status === "ativo" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                      }`}>{detailCustomer.status}</span>
                      {detailCustomer.is_collaborator && (
                        <Button size="sm" className="bg-gradient-primary text-white"
                          onClick={() => { setDetailOpen(false); openWallet(detailCustomer); }}>
                          <Wallet className="h-3 w-3 mr-1" /> Carteira
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => { setDetailOpen(false); openEdit(detailCustomer); }}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 text-sm">
                    <CInfo label="Telefone" value={detailCustomer.phone} />
                    <CInfo label="E-mail" value={detailCustomer.email} />
                    <CInfo label="Cidade / UF" value={[detailCustomer.city, detailCustomer.state].filter(Boolean).join(" / ")} />
                    <CInfo label="Origem" value={detailCustomer.origin} />
                    <CInfo label="Cadastrado em" value={new Date(detailCustomer.created_at).toLocaleDateString("pt-BR")} />
                  </div>
                  {detailCustomer.notes && (
                    <div className="mt-5">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Observações</div>
                      <div className="bg-muted/40 rounded-lg p-3 text-sm">{detailCustomer.notes}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <CStat label="Vendas registradas" value={detailSales.length} />
                  <CStat label="Total comprado" value={brl(detailSales.reduce((a, s) => a + Number(s.amount || 0), 0))} />
                  <CStat label="OS vinculadas" value={detailOSCount} />
                </div>

                <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
                  <div className="p-4 border-b">
                    <h3 className="font-display font-semibold">Histórico de compras</h3>
                  </div>
                  {detailSales.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">
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
                        {detailSales.map(s => (
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
        </DialogContent>
      </Dialog>

      {walletCustomer && (
        <CollaboratorWallet
          open={walletOpen}
          onOpenChange={(v) => { setWalletOpen(v); if (!v) setWalletCustomer(null); }}
          customerId={walletCustomer.id}
          customerName={walletCustomer.name}
        />
      )}
    </div>
  );
}

function CInfo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

function CStat({ label, value }: { label: string | number; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-elegant">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="text-xl font-display font-bold">{value}</div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: "primary" | "emerald" | "rose" | "indigo" }) {
  const tones: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600",
    indigo: "from-indigo-500/15 to-indigo-500/5 text-indigo-600",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tones[tone]} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest font-semibold opacity-80">{label}</div>
        {icon}
      </div>
      <div className="text-3xl font-display font-bold text-foreground">{value}</div>
    </div>
  );
}