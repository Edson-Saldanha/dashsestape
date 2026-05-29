import { useState, useMemo, Fragment } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Check, ChevronsUpDown, UserSearch, Truck, ChevronDown, MapPin, Phone, Mail, User, Package, Wrench, Calendar, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSalesData } from "@/lib/useSalesData";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { useEffect } from "react";
import { formatCPF, onlyDigits } from "@/lib/cpf";
import { cn } from "@/lib/utils";
import { enterFocusNext } from "@/lib/enterToNext";

interface CustomerLite { id: string; name: string; cpf: string; cpf_formatted: string | null; phone: string | null; is_collaborator?: boolean | null; }
interface CustomerFull { id: string; name: string; cpf: string; cpf_formatted: string | null; phone: string | null; email: string | null; city: string | null; state: string | null; notes: string | null; }
interface ServiceOrderLite { id: string; os_number: number; product: string | null; defect: string | null; status: string; entry_date: string; }
interface ProductLite { id: string; name: string; sku: string | null; sale_price: number; sale_price_table2: number; stock_qty: number; }

export default function Sales() {
  const { sales, employees } = useSalesData();
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [custOpen, setCustOpen] = useState(false);
  const [custSearch, setCustSearch] = useState("");
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const emptyForm = {
    employee_id: "", type: "venda" as "venda" | "servico", amount: "", profit: "",
    commission_pct: "", product: "", notes: "", sale_date: "",
    customer_id: "", customer_name: "", customer_cpf: "",
    product_id: "", quantity: "1", price_table: "1" as "1" | "2",
  };
  const [form, setForm] = useState(emptyForm);
  // Descontar na carteira (colaborador)
  const [walletEnabled, setWalletEnabled] = useState(false);
  const [walletParcs, setWalletParcs] = useState("1");
  const [walletFirstDue, setWalletFirstDue] = useState(() => new Date().toISOString().slice(0,10));
  const [walletManual, setWalletManual] = useState<{ due_date: string; amount: string }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveryCache, setDeliveryCache] = useState<Record<string, { customer: CustomerFull | null; orders: ServiceOrderLite[]; loading: boolean }>>({});

  const toggleDelivery = async (s: any) => {
    const id = s.id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (deliveryCache[id]) return;
    setDeliveryCache(prev => ({ ...prev, [id]: { customer: null, orders: [], loading: true } }));
    const [custRes, osRes] = await Promise.all([
      s.customer_id
        ? supabase.from("customers").select("id,name,cpf,cpf_formatted,phone,email,city,state,notes").eq("id", s.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      s.customer_name
        ? supabase.from("service_orders").select("id,os_number,product,defect,status,entry_date").ilike("client_name", s.customer_name).order("entry_date", { ascending: false }).limit(5)
        : Promise.resolve({ data: [] }),
    ]);
    setDeliveryCache(prev => ({
      ...prev,
      [id]: {
        customer: (custRes as any).data || null,
        orders: ((osRes as any).data || []) as ServiceOrderLite[],
        loading: false,
      },
    }));
  };

  useEffect(() => {
    supabase.from("customers").select("id,name,cpf,cpf_formatted,phone,is_collaborator").order("name").then(({ data }) => {
      setCustomers((data as any) || []);
    });
    supabase.from("products").select("id,name,sku,sale_price,sale_price_table2,stock_qty").order("name").then(({ data }) => {
      setProducts((data as any) || []);
    });
  }, [open]);

  // Prefill from Service Order "Lançar venda"
  useEffect(() => {
    const raw = sessionStorage.getItem("sale_prefill");
    if (!raw) return;
    sessionStorage.removeItem("sale_prefill");
    try {
      const p = JSON.parse(raw);
      setEditingId(null);
      setForm({
        ...emptyForm,
        sale_date: toLocalInput(new Date().toISOString()),
        type: (p.type === "servico" ? "servico" : "venda"),
        amount: p.amount ? String(p.amount) : "",
        profit: p.profit ? String(p.profit) : "",
        product: p.product || "",
        notes: p.notes || "",
        customer_name: p.customer_name || "",
      });
      setOpen(true);
    } catch {}
  }, []);

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sale_date: toLocalInput(new Date().toISOString()) });
    setWalletEnabled(false); setWalletParcs("1");
    setWalletFirstDue(new Date().toISOString().slice(0,10));
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    const amt = Number(s.amount) || 0;
    const comm = Number(s.commission) || 0;
    const pct = amt > 0 ? (comm / amt) * 100 : 0;
    setForm({
      employee_id: s.employee_id || "",
      type: (s.type === "servico" ? "servico" : "venda"),
      amount: String(s.amount ?? ""),
      profit: String(s.profit ?? ""),
      commission_pct: pct ? String(Number(pct.toFixed(2))) : "",
      product: s.product || "",
      notes: s.notes || "",
      sale_date: toLocalInput(s.sale_date),
      customer_id: s.customer_id || "",
      customer_name: s.customer_name || "",
      customer_cpf: s.customer_cpf || "",
      product_id: s.product_id || "",
      quantity: String(s.quantity ?? "1"),
      price_table: "1",
    });
    setOpen(true);
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.sale_date);
      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        if (d < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59");
        if (d > to) return false;
      }
      return true;
    });
  }, [sales, dateFrom, dateTo]);

  const save = async () => {
    const emp = employees.find(e => e.id === form.employee_id);
    if (!emp) return toast.error("Selecione um funcionário");
    if (!form.amount) return toast.error("Informe o valor");
    const pctNum = parseFloat(form.commission_pct || "0");
    if (isNaN(pctNum) || pctNum < 0 || pctNum > 20) return toast.error("Comissão deve estar entre 0% e 20%");
    const amountNum = parseFloat(form.amount);
    const commissionValue = +(amountNum * pctNum / 100).toFixed(2);
    const payload: any = {
      employee_id: emp.id, employee_name: emp.name, type: form.type as any,
      amount: amountNum, profit: parseFloat(form.profit || "0"),
      commission: commissionValue,
      product: form.product || null, notes: form.notes || null,
      customer_id: form.customer_id || null,
      customer_name: form.customer_name || null,
      customer_cpf: form.customer_cpf || null,
      product_id: form.product_id || null,
      quantity: form.product_id ? Math.max(1, parseFloat(form.quantity || "1")) : 1,
    };
    if (form.sale_date) payload.sale_date = new Date(form.sale_date).toISOString();

    const { data: saved, error } = editingId
      ? await supabase.from("sales").update(payload).eq("id", editingId)
          .select().single()
      : await supabase.from("sales").insert(payload).select().single();

    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Lançamento atualizado!" : "Venda registrada!");
      logActivity(editingId ? "sale.updated" : "sale.created", "sales", editingId || undefined, { employee: emp.name, amount: amountNum });

      // Abate estoque quando produto vinculado (apenas em criação)
      if (!editingId && form.product_id) {
        const qty = Math.max(1, parseFloat(form.quantity || "1"));
        const { error: mErr } = await supabase.rpc("apply_stock_movement", {
          _product_id: form.product_id,
          _movement_type: "saida",
          _quantity: qty,
          _reason: `Venda — ${emp.name}`,
          _responsible: emp.name,
          _notes: form.notes || null,
        });
        if (mErr) toast.error("Estoque não foi descontado: " + mErr.message);
        else toast.success(`Estoque abatido: ${qty} un.`);
      }

      // Descontar na carteira do colaborador
      if (!editingId && walletEnabled && form.customer_id && selectedCustomer?.is_collaborator) {
        try {
          // Manual ou automático
          let rowsBase: { due_date: string; amount: number }[] = [];
          if (walletManual.length > 0) {
            if (walletManual.some(p => !p.due_date || Number(p.amount) <= 0)) {
              throw new Error("Verifique as parcelas manuais (data e valor)");
            }
            rowsBase = walletManual.map(p => ({ due_date: p.due_date, amount: Number(p.amount) }));
          } else {
            const nParc = Math.max(1, parseInt(walletParcs) || 1);
            const parcValue = +(amountNum / nParc).toFixed(2);
            const base = new Date(walletFirstDue + "T12:00:00");
            rowsBase = Array.from({ length: nParc }).map((_, i) => {
              const d = new Date(base); d.setMonth(d.getMonth() + i);
              const isLast = i === nParc - 1;
              const amt = isLast ? +(amountNum - parcValue * (nParc - 1)).toFixed(2) : parcValue;
              return { due_date: d.toISOString().slice(0,10), amount: amt };
            });
          }
          const { data: purchase, error: pErr } = await supabase.from("customer_wallet_purchases").insert({
            customer_id: form.customer_id,
            customer_name: form.customer_name,
            purchase_date: payload.sale_date || new Date().toISOString(),
            description: form.product || `Venda registrada (${emp.name})`,
            items: [{ name: form.product || "Venda", qty: 1, unit_price: amountNum }] as any,
            total_amount: amountNum,
            deduct_stock: false,
            notes: form.notes || null,
          }).select().single();
          if (pErr) throw pErr;
          const rows = rowsBase.map((r, i) => ({
            purchase_id: (purchase as any).id, customer_id: form.customer_id,
            installment_number: i + 1, due_date: r.due_date, amount: r.amount,
          }));
          const { error: iErr } = await supabase.from("customer_wallet_installments").insert(rows);
          if (iErr) throw iErr;
          toast.success(`Lançado na carteira: ${rows.length}x`);
        } catch (e: any) {
          toast.error("Erro ao lançar na carteira: " + (e.message || ""));
        }
      }

      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setWalletEnabled(false); setWalletManual([]);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir lançamento?")) return;
    await supabase.from("sales").delete().eq("id", id);
    logActivity("sale.deleted", "sales", id);
  };

  const filteredCustomers = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    const digits = onlyDigits(q);
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (digits && c.cpf.includes(digits))
    ).slice(0, 50);
  }, [customers, custSearch]);

  const selectedCustomer = customers.find(c => c.id === form.customer_id);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Operação</div>
          <h1 className="font-display text-3xl font-bold">Lançamento de Vendas</h1>
          <p className="text-muted-foreground">Registre vendas e serviços em tempo real</p>
        </div>
        <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if(!v){ setEditingId(null); setForm(emptyForm);} }}>
          <Button onClick={openNew} className="bg-gradient-primary text-white shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button>
          <DialogContent className="max-w-3xl w-[96vw] max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">{editingId ? "Editar lançamento" : "Registrar venda"}</DialogTitle></DialogHeader>
            <div className="space-y-4" onKeyDown={enterFocusNext}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Funcionário</Label>
                <Select value={form.employee_id} onValueChange={v=>setForm({...form, employee_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{employees.filter(e=>e.active).map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={v=>setForm({...form, type:v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>
              <div>
                <Label>Cliente</Label>
                <Popover open={custOpen} onOpenChange={setCustOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !selectedCustomer && "text-muted-foreground")}>
                      <span className="flex items-center gap-2 truncate">
                        <UserSearch className="h-4 w-4 shrink-0" />
                        {selectedCustomer
                          ? `${selectedCustomer.name} — ${selectedCustomer.cpf_formatted || formatCPF(selectedCustomer.cpf)}${selectedCustomer.is_collaborator ? " · COLABORADOR" : ""}`
                          : "Buscar por nome ou CPF..."}
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
                            <CommandItem key={c.id} value={c.id} onSelect={() => {
                              setForm({ ...form, customer_id: c.id, customer_name: c.name, customer_cpf: c.cpf_formatted || formatCPF(c.cpf) });
                              setCustOpen(false); setCustSearch("");
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", form.customer_id === c.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">{c.name}{c.is_collaborator && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">Colab.</span>}</div>
                                <div className="text-xs text-muted-foreground">{c.cpf_formatted || formatCPF(c.cpf)}{c.phone ? ` • ${c.phone}` : ""}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomer && (
                  <button type="button" className="text-xs text-muted-foreground hover:text-destructive mt-1"
                    onClick={() => setForm({ ...form, customer_id: "", customer_name: "", customer_cpf: "" })}>
                    Limpar cliente
                  </button>
                )}
              </div>
              <div><Label>Data e hora</Label>
                <Input type="datetime-local" value={form.sale_date} onChange={e=>setForm({...form, sale_date:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Valor (R$)</Label><CurrencyInput value={form.amount} onValueChange={v=>setForm({...form, amount:String(v)})} /></div>
                <div><Label>Lucro (R$)</Label><CurrencyInput value={form.profit} onValueChange={v=>setForm({...form, profit:String(v)})} /></div>
                <div>
                  <Label>Comissão (%)</Label>
                  <Input type="number" step="0.1" min="0" max="20" placeholder="1 a 20"
                    value={form.commission_pct}
                    onChange={e=>setForm({...form, commission_pct:e.target.value})} />
                </div>
                <div>
                  <Label>Comissão (R$)</Label>
                  <Input readOnly value={brl(((parseFloat(form.amount)||0) * (parseFloat(form.commission_pct)||0)) / 100)} />
                </div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
                <div>
                  <Label>Produto / Serviço</Label>
                  <Popover open={prodOpen} onOpenChange={setProdOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !form.product_id && "text-muted-foreground")}>
                        <span className="flex items-center gap-2 truncate">
                          {form.product_id
                            ? (() => {
                                const p = products.find(x => x.id === form.product_id);
                                return p ? `${p.name}${p.sku ? ` · ${p.sku}` : ""} — estoque ${Number(p.stock_qty)}` : form.product;
                              })()
                            : (form.product || "Selecionar do estoque ou digitar livre...")}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar produto..." value={prodSearch} onValueChange={setProdSearch} />
                        <CommandList>
                          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="__free__" onSelect={() => {
                              setForm(f => ({ ...f, product_id: "", quantity: "1" }));
                              setProdOpen(false); setProdSearch("");
                            }}>
                              <span className="text-muted-foreground italic">Sem vínculo (texto livre)</span>
                            </CommandItem>
                            {products.map(p => (
                              <CommandItem key={p.id} value={`${p.name} ${p.sku || ""}`} onSelect={() => {
                                const price = form.price_table === "2" && Number(p.sale_price_table2) > 0
                                  ? Number(p.sale_price_table2)
                                  : Number(p.sale_price);
                                const qty = Math.max(1, parseFloat(form.quantity || "1"));
                                setForm(f => ({
                                  ...f,
                                  product_id: p.id,
                                  product: p.name,
                                  quantity: String(qty),
                                  amount: String(+(price * qty).toFixed(2)),
                                }));
                                setProdOpen(false); setProdSearch("");
                              }}>
                                <div className="flex-1">
                                  <div className="font-medium">{p.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {p.sku ? `SKU ${p.sku} · ` : ""}T1 {brl(Number(p.sale_price))}
                                    {Number(p.sale_price_table2) > 0 ? ` · T2 ${brl(Number(p.sale_price_table2))}` : ""}
                                    {" · "}Estoque: {Number(p.stock_qty)}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {!form.product_id && (
                    <Input className="mt-2" placeholder="Descrição livre (opcional)"
                      value={form.product} onChange={e=>setForm({...form, product:e.target.value})} />
                  )}
                </div>
                {form.product_id && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number" min="1" step="1"
                        value={form.quantity}
                        onChange={e => {
                          const q = e.target.value;
                          const p = products.find(x => x.id === form.product_id);
                          const price = p
                            ? (form.price_table === "2" && Number(p.sale_price_table2) > 0
                                ? Number(p.sale_price_table2)
                                : Number(p.sale_price))
                            : 0;
                          const qNum = Math.max(1, parseFloat(q || "1"));
                          setForm(f => ({ ...f, quantity: q, amount: String(+(price * qNum).toFixed(2)) }));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Tabela de preço</Label>
                      <Select value={form.price_table} onValueChange={(v) => {
                        const p = products.find(x => x.id === form.product_id);
                        const price = p
                          ? (v === "2" && Number(p.sale_price_table2) > 0 ? Number(p.sale_price_table2) : Number(p.sale_price))
                          : 0;
                        const qNum = Math.max(1, parseFloat(form.quantity || "1"));
                        setForm(f => ({ ...f, price_table: v as "1" | "2", amount: String(+(price * qNum).toFixed(2)) }));
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Tabela 1</SelectItem>
                          <SelectItem value="2">Tabela 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Estoque atual</span>
                      <span className="text-sm font-semibold">
                        {Number(products.find(p => p.id === form.product_id)?.stock_qty || 0)} un.
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} /></div>

              {!editingId && selectedCustomer?.is_collaborator && (
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={walletEnabled} onChange={e => setWalletEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
                    <span className="font-display font-semibold text-primary">Descontar na carteira do colaborador</span>
                  </label>
                  <p className="text-xs text-muted-foreground -mt-1">Este cliente é um colaborador. Você pode lançar esta venda diretamente como compra a descontar do salário.</p>
                  {walletEnabled && (
                    <>
                      {walletManual.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div><Label>Nº de parcelas</Label>
                            <Input type="number" min="1" max="60" value={walletParcs} onChange={e => setWalletParcs(e.target.value)} />
                          </div>
                          <div><Label>1ª data de desconto</Label>
                            <Input type="date" value={walletFirstDue} onChange={e => setWalletFirstDue(e.target.value)} />
                          </div>
                          <div><Label>Valor por parcela</Label>
                            <Input readOnly value={brl((parseFloat(form.amount)||0) / Math.max(1, parseInt(walletParcs)||1))} />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border bg-background overflow-hidden">
                          <div className="grid grid-cols-[60px_1fr_1fr_40px] bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <div className="p-2">#</div>
                            <div className="p-2">Vencimento</div>
                            <div className="p-2">Valor (R$)</div>
                            <div className="p-2"></div>
                          </div>
                          {walletManual.map((p, idx) => (
                            <div key={idx} className="grid grid-cols-[60px_1fr_1fr_40px] items-center border-t">
                              <div className="p-2 text-sm font-medium text-muted-foreground">{idx + 1}</div>
                              <div className="p-1.5"><Input className="h-8" type="date" value={p.due_date}
                                onChange={e => setWalletManual(arr => arr.map((x,i) => i===idx ? { ...x, due_date: e.target.value } : x))} /></div>
                              <div className="p-1.5"><CurrencyInput className="h-8" value={p.amount}
                                onValueChange={v => setWalletManual(arr => arr.map((x,i) => i===idx ? { ...x, amount: String(v) } : x))} /></div>
                              <div className="p-1.5">
                                <Button type="button" size="icon" variant="ghost"
                                  onClick={() => setWalletManual(arr => arr.filter((_,i) => i!==idx))}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="border-t p-2 flex items-center justify-between bg-muted/20 text-xs">
                            <span className="text-muted-foreground">
                              Soma: <span className="font-semibold text-foreground tabular-nums">{brl(walletManual.reduce((a,p) => a + Number(p.amount || 0), 0))}</span>
                              {" · "}Total venda: <span className="font-semibold text-foreground tabular-nums">{brl(parseFloat(form.amount)||0)}</span>
                            </span>
                            <Button type="button" size="sm" variant="ghost"
                              onClick={() => {
                                const amt = parseFloat(form.amount) || 0;
                                const n = walletManual.length;
                                if (!amt || !n) return;
                                const v = +(amt / n).toFixed(2);
                                setWalletManual(arr => arr.map(p => ({ ...p, amount: v.toFixed(2) })));
                              }}>Dividir total</Button>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                          const last = walletManual[walletManual.length - 1];
                          const baseDate = last ? new Date(last.due_date + "T12:00:00") : new Date(walletFirstDue + "T12:00:00");
                          if (last) baseDate.setMonth(baseDate.getMonth() + 1);
                          setWalletManual(arr => [...arr, { due_date: baseDate.toISOString().slice(0,10), amount: "" }]);
                        }}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Nova parcela
                        </Button>
                        {walletManual.length > 0 && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setWalletManual([])}>
                            Voltar para geração automática
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button onClick={save} className="w-full bg-gradient-primary text-white">{editingId ? "Salvar alterações" : "Salvar lançamento"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="bg-card rounded-2xl p-4 border shadow-elegant flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-44" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="outline" onClick={()=>{ setDateFrom(""); setDateTo(""); }}>Limpar filtros</Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredSales.length} lançamento{filteredSales.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Data</th><th className="p-4">Funcionário</th><th className="p-4">Tipo</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Produto</th><th className="p-4 text-right">Valor</th>
              <th className="p-4 text-right">Lucro</th>
              <th className="p-4 text-right">Comissão</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSales.map((s,i) => (
              <Fragment key={s.id}>
              <motion.tr initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                className="hover:bg-muted/20">
                <td className="p-4 text-sm">{new Date(s.sale_date).toLocaleString("pt-BR")}</td>
                <td className="p-4 font-medium">{s.employee_name}</td>
                <td className="p-4"><span className="inline-block px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary uppercase tracking-wider">{s.type}</span></td>
                <td className="p-4 text-sm">
                  {(s as any).customer_name ? (
                    <div>
                      <div className="font-medium">{(s as any).customer_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{(s as any).customer_cpf || ""}</div>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-4 text-sm text-muted-foreground">{s.product || "—"}</td>
                <td className="p-4 text-right font-display font-bold tabular text-primary">{brl(Number(s.amount))}</td>
                <td className="p-4 text-right text-emerald-600 tabular">{brl(Number(s.profit))}</td>
                <td className="p-4 text-right tabular text-amber-600">{brl(Number((s as any).commission || 0))}</td>
                <td className="p-4 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={()=>openEdit(s)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={()=>remove(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </motion.tr>
              </Fragment>
            ))}
            {filteredSales.length===0 && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">Nenhum lançamento no período.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className="text-sm font-medium break-words">{value || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}

function DeliveryPanel({ sale, data }: { sale: any; data?: { customer: CustomerFull | null; orders: ServiceOrderLite[]; loading: boolean } }) {
  if (!data || data.loading) {
    return <div className="text-sm text-muted-foreground">Carregando dados da entrega...</div>;
  }
  const c = data.customer;
  const addressParts = [c?.city, c?.state].filter(Boolean).join(" / ");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="bg-card rounded-xl p-4 border shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
          <User className="h-3.5 w-3.5" /> Dados do Cliente
        </h4>
        <div className="space-y-3">
          <InfoRow icon={User} label="Nome" value={sale.customer_name || c?.name} />
          <InfoRow icon={FileText} label="CPF" value={sale.customer_cpf || c?.cpf_formatted} />
          <InfoRow icon={Phone} label="Telefone" value={c?.phone} />
          <InfoRow icon={Mail} label="E-mail" value={c?.email} />
        </div>
      </section>

      <section className="bg-card rounded-xl p-4 border shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" /> Entrega
        </h4>
        <div className="space-y-3">
          <InfoRow icon={MapPin} label="Cidade / UF" value={addressParts} />
          <InfoRow icon={Package} label="Produto" value={sale.product} />
          <InfoRow icon={Calendar} label="Data da venda" value={new Date(sale.sale_date).toLocaleString("pt-BR")} />
          <InfoRow icon={DollarSign} label="Valor" value={brl(Number(sale.amount))} />
          <InfoRow icon={FileText} label="Observações" value={sale.notes} />
        </div>
      </section>

      <section className="bg-card rounded-xl p-4 border shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5" /> Ordens de Serviço
        </h4>
        {data.orders.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma OS vinculada a este cliente.</div>
        ) : (
          <ul className="space-y-2">
            {data.orders.map(o => (
              <li key={o.id} className="rounded-lg border bg-muted/30 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-primary">OS #{o.os_number}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{o.status}</span>
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {o.product || "—"}{o.defect ? ` · ${o.defect}` : ""}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(o.entry_date).toLocaleDateString("pt-BR")}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
