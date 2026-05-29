import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Truck, Plus, Search, User, MapPin, Phone, Mail, Package, FileText, DollarSign,
  Wrench, Pencil, Trash2, Check, ChevronsUpDown, UserSearch, Printer, CreditCard,
} from "lucide-react";
import { brl } from "@/lib/format";
import { formatCPF, formatDocBR, formatPhoneBR, onlyDigits } from "@/lib/cpf";
import { CurrencyInput } from "@/components/ui/currency-input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface Delivery {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  product: string | null;
  service_order_id: string | null;
  os_number: number | null;
  amount: number;
  status: string;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
}
interface CustomerLite {
  id: string; name: string; cpf: string; cpf_formatted: string | null;
  phone: string | null; email: string | null; address: string | null; city: string | null; state: string | null;
}
interface OSLite { id: string; os_number: number; client_name: string; product: string | null; }

const STATUSES: Record<string, { label: string; cls: string }> = {
  pendente:  { label: "Pendente",   cls: "bg-amber-500 text-white" },
  em_rota:   { label: "Em rota",    cls: "bg-blue-600 text-white" },
  entregue:  { label: "Entregue",   cls: "bg-emerald-600 text-white" },
  cancelada: { label: "Cancelada",  cls: "bg-slate-500 text-white" },
};

const emptyForm = {
  customer_id: "", customer_name: "", customer_cpf: "", customer_phone: "", customer_email: "",
  address: "", city: "", state: "",
  product: "", service_order_id: "", os_number: "",
  amount: "", status: "pendente", notes: "", payment_method: "",
};

const PAYMENT_METHODS = [
  "Dinheiro", "Pix", "Cartão de Débito", "Cartão de Crédito", "Boleto", "Pago",
];

export default function Deliveries() {
  const { user } = useAuth();
  const [list, setList] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [orders, setOrders] = useState<OSLite[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [custOpen, setCustOpen] = useState(false);
  const [custSearch, setCustSearch] = useState("");
  const [osOpen, setOsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("deliveries").select("*").order("created_at", { ascending: false });
    setList((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    supabase.from("customers").select("id,name,cpf,cpf_formatted,phone,email,address,city,state").order("name").then(({ data }) => {
      setCustomers((data as any) || []);
    });
    supabase.from("service_orders").select("id,os_number,client_name,product").order("entry_date", { ascending: false }).limit(200).then(({ data }) => {
      setOrders((data as any) || []);
    });
  }, [open]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (d: Delivery) => {
    setEditing(d);
    setForm({
      customer_id: d.customer_id || "",
      customer_name: d.customer_name || "",
      customer_cpf: d.customer_cpf || "",
      customer_phone: d.customer_phone || "",
      customer_email: d.customer_email || "",
      address: d.address || "",
      city: d.city || "",
      state: d.state || "",
      product: d.product || "",
      service_order_id: d.service_order_id || "",
      os_number: d.os_number ? String(d.os_number) : "",
      amount: d.amount ? String(d.amount) : "",
      status: d.status || "pendente",
      notes: d.notes || "",
      payment_method: d.payment_method || "",
    });
    setOpen(true);
  };

  const pickCustomer = (c: CustomerLite) => {
    setForm(f => ({
      ...f,
      customer_id: c.id,
      customer_name: c.name,
      customer_cpf: c.cpf_formatted || formatCPF(c.cpf),
      customer_phone: c.phone || f.customer_phone,
      customer_email: c.email || f.customer_email,
      address: c.address || f.address,
      city: c.city || f.city,
      state: c.state || f.state,
    }));
    setCustOpen(false); setCustSearch("");
  };

  const save = async () => {
    if (!form.customer_name.trim()) return toast.error("Informe o nome do cliente");
    const payload: any = {
      customer_id: form.customer_id || null,
      customer_name: form.customer_name.trim(),
      customer_cpf: form.customer_cpf.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      customer_email: form.customer_email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      product: form.product.trim() || null,
      service_order_id: form.service_order_id || null,
      os_number: form.os_number ? parseInt(form.os_number) : null,
      amount: parseFloat(form.amount.replace(",", ".")) || 0,
      status: form.status || "pendente",
      notes: form.notes.trim() || null,
      payment_method: form.payment_method.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("deliveries").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Entrega atualizada");
    } else {
      payload.created_by = user?.id;
      payload.created_by_email = user?.email;
      const { error } = await supabase.from("deliveries").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Entrega registrada");
    }
    setOpen(false);
    load();
  };

  const remove = async (d: Delivery) => {
    if (!confirm(`Excluir entrega de "${d.customer_name}"?`)) return;
    const { error } = await supabase.from("deliveries").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    load();
  };

  const printDelivery = (d: Delivery) => {
    const st = STATUSES[d.status]?.label || d.status;
    const esc = (s: any) => String(s ?? "—").replace(/[<>&]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;"} as any)[c]);
    const line = (label: string, value: any) => `<div class="row"><span class="lbl">${label}</span><span class="val">${esc(value)}</span></div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Entrega ${d.customer_name || ""}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; color: #000; width: 80mm; padding: 4mm; font-size: 11px; line-height: 1.35; }
  .center { text-align: center; }
  .title { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
  .small { font-size: 10px; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  h3 { font-size: 11px; margin: 6px 0 3px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #000; padding-bottom: 2px; }
  .row { display: flex; gap: 4px; margin: 1px 0; }
  .lbl { font-weight: 700; min-width: 55px; }
  .val { flex: 1; word-break: break-word; }
  .big { font-size: 16px; font-weight: 700; text-align: right; margin-top: 4px; }
  .notes { white-space: pre-wrap; word-break: break-word; }
  @media print { body { width: 80mm; } }
</style></head><body>
<div class="center title">COMPROVANTE DE ENTREGA</div>
<div class="center small">${new Date().toLocaleString("pt-BR")}</div>
<div class="center small">Status: ${esc(st)}${d.os_number ? ` | OS #${d.os_number}` : ""}</div>
<div class="hr"></div>
<h3>Cliente</h3>
${line("Nome", d.customer_name)}
${line("CPF", d.customer_cpf)}
${line("Telefone", d.customer_phone)}
${d.customer_email ? line("E-mail", d.customer_email) : ""}
<h3>Endereço</h3>
${line("Local", d.address)}
${line("Cidade", [d.city, d.state].filter(Boolean).join(" / "))}
<h3>Pedido</h3>
${line("Produto", d.product)}
${line("Pagto", d.payment_method)}
<div class="big">${d.amount > 0 ? brl(Number(d.amount)) : "—"}</div>
${d.notes ? `<h3>Observações</h3><div class="notes">${esc(d.notes)}</div>` : ""}
<div class="hr"></div>
<div class="center small">*** Obrigado! ***</div>
<div style="height:8mm"></div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300);}</script>
</body></html>`;
    const w = window.open("", "_blank", "width=400,height=900");
    if (!w) return toast.error("Permita pop-ups para imprimir");
    w.document.write(html); w.document.close();
  };

  const filteredCustomers = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    const digits = onlyDigits(q);
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || (digits && c.cpf.includes(digits))
    ).slice(0, 50);
  }, [customers, custSearch]);

  const filtered = list.filter(d => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const blob = `${d.customer_name || ""} ${d.customer_cpf || ""} ${d.product || ""} ${d.city || ""} ${d.address || ""}`.toLowerCase();
      if (!blob.includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Operação</div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Truck className="h-7 w-7 text-primary" /> Entregas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastre entregas manualmente ou puxe o cliente direto do banco de dados.</p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-gradient-primary text-white shadow-glow"><Plus className="h-4 w-4" /> Nova entrega</Button>
      </header>

      <div className="bg-card rounded-2xl p-4 border shadow-elegant flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cliente, CPF, produto, cidade..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {filtered.length} entrega{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <div className="font-semibold text-lg">Nenhuma entrega cadastrada</div>
          <p className="text-sm text-muted-foreground mt-1">Clique em <span className="font-medium text-foreground">Nova entrega</span> para adicionar a primeira.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(d => {
            const st = STATUSES[d.status] || STATUSES.pendente;
            const addr = [d.address, [d.city, d.state].filter(Boolean).join(" / ")].filter(Boolean).join(" — ");
            return (
              <Card key={d.id} className="overflow-hidden border-2 hover:border-primary/40 transition-all">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={st.cls}>{st.label}</Badge>
                      {d.os_number && <Badge variant="outline" className="gap-1"><Wrench className="h-3 w-3" /> OS #{d.os_number}</Badge>}
                    </div>
                    <div className="font-semibold truncate">{d.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => printDelivery(d)} title="Imprimir"><Printer className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
                  <Section title="Cliente" icon={User}>
                    <Row icon={FileText} label="CPF" value={d.customer_cpf} />
                    <Row icon={Phone} label="Telefone" value={d.customer_phone} />
                    <Row icon={Mail} label="E-mail" value={d.customer_email} />
                  </Section>
                  <Section title="Endereço" icon={MapPin}>
                    <Row icon={MapPin} label="Local" value={addr} />
                    <Row icon={Package} label="Produto" value={d.product} />
                    <Row icon={DollarSign} label="Valor" value={d.amount > 0 ? brl(Number(d.amount)) : null} />
                    <Row icon={CreditCard} label="Pagamento" value={d.payment_method} />
                  </Section>
                  <Section title="Observações" icon={FileText}>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {d.notes || <span className="text-muted-foreground">—</span>}
                    </div>
                  </Section>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar entrega" : "Nova entrega"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-primary font-bold">Cliente</Label>
              <Popover open={custOpen} onOpenChange={setCustOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1">
                    <span className="flex items-center gap-2 truncate">
                      <UserSearch className="h-4 w-4 shrink-0" />
                      {form.customer_id ? `${form.customer_name} — ${form.customer_cpf}` : "Buscar cliente no banco (opcional)..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Nome ou CPF..." value={custSearch} onValueChange={setCustSearch} />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {filteredCustomers.map(c => (
                          <CommandItem key={c.id} value={c.id} onSelect={() => pickCustomer(c)}>
                            <Check className={cn("mr-2 h-4 w-4", form.customer_id === c.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex-1">
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.cpf_formatted || formatCPF(c.cpf)}{c.phone ? ` • ${c.phone}` : ""}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.customer_id && (
                <button type="button" className="text-xs text-muted-foreground hover:text-destructive mt-1"
                  onClick={() => setForm(f => ({
                    ...f,
                    customer_id: "", customer_name: "", customer_cpf: "",
                    customer_phone: "", customer_email: "", city: "", state: "",
                  }))}>
                  Desvincular cliente (limpar dados)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome do cliente *</Label>
                <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div>
                <Label>CPF / CNPJ</Label>
                <Input value={form.customer_cpf} maxLength={18}
                  onChange={e => setForm({ ...form, customer_cpf: formatDocBR(e.target.value) })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.customer_phone} maxLength={15}
                  onChange={e => setForm({ ...form, customer_phone: formatPhoneBR(e.target.value) })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_80px] gap-3">
              <div>
                <Label>Endereço</Label>
                <Input value={form.address} placeholder="Rua, nº, bairro" onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={form.state} maxLength={2} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Produto</Label>
                <Input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} />
              </div>
              <div>
                <Label>OS vinculada</Label>
                <Popover open={osOpen} onOpenChange={setOsOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Digitar nº da OS ou buscar..."
                        value={form.os_number}
                        onFocus={() => setOsOpen(true)}
                        onChange={(e) => {
                          const num = e.target.value.replace(/\D/g, "");
                          const o = orders.find(x => String(x.os_number) === num);
                          setForm({ ...form, os_number: num, service_order_id: o ? o.id : "" });
                          setOsOpen(true);
                        }}
                        className="pr-9"
                      />
                      <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandEmpty>Nenhuma OS encontrada.</CommandEmpty>
                        <CommandGroup>
                          {orders
                            .filter(o => {
                              const q = form.os_number.trim().toLowerCase();
                              if (!q) return true;
                              return String(o.os_number).includes(q) || o.client_name.toLowerCase().includes(q);
                            })
                            .slice(0, 50)
                            .map(o => (
                              <CommandItem
                                key={o.id}
                                value={o.id}
                                onSelect={() => {
                                  setForm(f => ({ ...f, service_order_id: o.id, os_number: String(o.os_number) }));
                                  setOsOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", form.service_order_id === o.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex-1">
                                  <div className="font-medium">OS #{o.os_number} — {o.client_name}</div>
                                  {o.product && <div className="text-xs text-muted-foreground">{o.product}</div>}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <CurrencyInput value={form.amount} onValueChange={v => setForm({ ...form, amount: String(v) })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={form.payment_method || "__none"} onValueChange={(v) => setForm({ ...form, payment_method: v === "__none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Não informado —</SelectItem>
                    {PAYMENT_METHODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-gradient-primary text-white">{editing ? "Salvar" : "Registrar entrega"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-muted/20 rounded-xl p-3 border">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className="text-sm font-medium break-words">{value || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}