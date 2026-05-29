import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList, Plus, Search, Eye, Pencil, CheckCircle2, XCircle,
  Truck, Package, DollarSign, Users, Trash2, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { brl, num } from "@/lib/format";
import { formatDocBR, formatPhoneBR } from "@/lib/cpf";

type POStatus = "em_aberto" | "aguardando_pagamento" | "pago" | "cancelado";

const STATUS_LABEL: Record<POStatus, string> = {
  em_aberto: "Em aberto",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago / Quitado",
  cancelado: "Cancelado",
};
const STATUS_CLASS: Record<POStatus, string> = {
  em_aberto: "bg-amber-500/15 text-amber-700",
  aguardando_pagamento: "bg-sky-500/15 text-sky-700",
  pago: "bg-emerald-500/15 text-emerald-700",
  cancelado: "bg-rose-500/15 text-rose-700",
};

interface Supplier {
  id: string; name: string; document: string | null; phone: string | null;
  whatsapp: string | null; email: string | null; address: string | null;
  contact_name: string | null; notes: string | null; active: boolean;
}
interface ProductLite {
  id: string; name: string; sku: string | null; cost_price: number; stock_qty: number;
}
interface POItem {
  id?: string; product_id: string | null; product_name: string;
  quantity: number; current_cost: number; new_cost: number; total_cost: number;
}
interface PurchaseOrder {
  id: string; order_number: number;
  supplier_id: string | null; supplier_name: string | null;
  order_date: string; expected_date: string | null;
  payment_method: string | null; status: POStatus; notes: string | null;
  total_amount: number; total_items: number;
  settled_at: string | null; settled_by_email: string | null;
  created_by_email: string | null; created_at: string;
}

const PAY_METHODS = ["Pix","Boleto","Transferência","Cartão de crédito","Cartão de débito","Dinheiro","A combinar"];

export default function PurchaseOrders() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "pedidos";
  const [tab, setTab] = useState<"pedidos" | "quitar">(
    ["pedidos", "quitar"].includes(initialTab) ? initialTab : "pedidos"
  );
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && ["pedidos","quitar"].includes(t)) setTab(t as any);
  }, [searchParams]);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState<"all" | POStatus>("all");
  const [fSupplier, setFSupplier] = useState<string>("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fProduct, setFProduct] = useState<string>("all");

  const [orderItems, setOrderItems] = useState<Record<string, POItem[]>>({});

  const [openOrder, setOpenOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  const [openSupplier, setOpenSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  async function loadAll() {
    setLoading(true);
    const [o, s, p, items] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("order_number", { ascending: false }),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("products").select("id,name,sku,cost_price,stock_qty").order("name"),
      supabase.from("purchase_order_items").select("*"),
    ]);
    setOrders((o.data as any) || []);
    setSuppliers((s.data as any) || []);
    setProducts((p.data as any) || []);
    const map: Record<string, POItem[]> = {};
    ((items.data as any[]) || []).forEach((it) => {
      (map[it.purchase_order_id] = map[it.purchase_order_id] || []).push(it);
    });
    setOrderItems(map);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (fStatus !== "all" && o.status !== fStatus) return false;
      if (fSupplier !== "all" && o.supplier_id !== fSupplier) return false;
      const d = new Date(o.order_date);
      if (fFrom && d < new Date(fFrom)) return false;
      if (fTo) { const t = new Date(fTo); t.setHours(23,59,59); if (d > t) return false; }
      if (fProduct !== "all") {
        const list = orderItems[o.id] || [];
        if (!list.some((it) => it.product_id === fProduct)) return false;
      }
      if (!q) return true;
      const inItems = (orderItems[o.id] || []).some((it) => it.product_name?.toLowerCase().includes(q));
      return (
        String(o.order_number).includes(q) ||
        (o.supplier_name || "").toLowerCase().includes(q) ||
        inItems
      );
    });
  }, [orders, orderItems, search, fStatus, fSupplier, fFrom, fTo, fProduct]);

  const stats = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const open = orders.filter((o) => o.status === "em_aberto" || o.status === "aguardando_pagamento");
    const monthPaid = orders.filter((o) => o.status === "pago" && o.settled_at && new Date(o.settled_at) >= monthStart);
    const monthSpent = monthPaid.reduce((a, o) => a + Number(o.total_amount || 0), 0);
    return {
      open: open.length,
      paidMonth: monthPaid.length,
      spentMonth: monthSpent,
      activeSuppliers: suppliers.filter((s) => s.active).length,
    };
  }, [orders, suppliers]);

  async function settle(o: PurchaseOrder) {
    if (!confirm(`Quitar pedido #${o.order_number}?\nO estoque será atualizado e o custo dos produtos será atualizado automaticamente.`)) return;
    const { error } = await supabase.rpc("settle_purchase_order" as any, { _po_id: o.id });
    if (error) return toast.error(error.message);
    toast.success(`Pedido #${o.order_number} quitado`);
    loadAll();
  }
  async function cancelOrder(o: PurchaseOrder) {
    if (o.status === "pago") return toast.error("Pedido pago não pode ser cancelado");
    if (!confirm(`Cancelar pedido #${o.order_number}?`)) return;
    const { error } = await supabase.from("purchase_orders").update({ status: "cancelado" }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Pedido cancelado");
    loadAll();
  }
  async function deleteOrder(o: PurchaseOrder) {
    if (o.status === "pago") return toast.error("Pedido quitado não pode ser excluído");
    if (!confirm(`Excluir pedido #${o.order_number}?`)) return;
    const { error } = await supabase.from("purchase_orders").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Pedido excluído");
    loadAll();
  }

  const settleList = orders.filter((o) => o.status === "em_aberto" || o.status === "aguardando_pagamento");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Compras</div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-primary" /> Novos Pedidos
          </h1>
          <p className="text-muted-foreground">Pedidos com fornecedores e atualização automática de custos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingOrder(null); setOpenOrder(true); }} className="gap-2 bg-gradient-primary text-white">
            <Plus className="h-4 w-4" /> Criar Novo Pedido
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="Pedidos em aberto" value={String(stats.open)} tone="amber" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Quitados no mês" value={String(stats.paidMonth)} tone="emerald" />
        <SummaryCard icon={<DollarSign className="h-5 w-5" />} label="Compras no mês" value={brl(stats.spentMonth)} tone="primary" />
        <SummaryCard icon={<Truck className="h-5 w-5" />} label="Fornecedores ativos" value={String(stats.activeSuppliers)} tone="sky" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="quitar">Quitar Pedidos {settleList.length > 0 && <span className="ml-2 text-xs bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full">{settleList.length}</span>}</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <div className="md:col-span-2 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por nº, fornecedor ou produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={fStatus} onValueChange={(v) => setFStatus(v as any)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {(Object.keys(STATUS_LABEL) as POStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fSupplier} onValueChange={setFSupplier}>
                <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
              <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
              <Select value={fProduct} onValueChange={setFProduct}>
                <SelectTrigger className="md:col-span-2"><SelectValue placeholder="Produto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nº</th>
                    <th className="px-4 py-3 font-medium">Fornecedor</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Itens</th>
                    <th className="px-4 py-3 font-medium text-right">Valor total</th>
                    <th className="px-4 py-3 font-medium">Pagamento</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Carregando...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>
                  ) : filtered.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono">#{String(o.order_number).padStart(4, "0")}</td>
                      <td className="px-4 py-3">{o.supplier_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">{new Date(o.order_date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_CLASS[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{num(o.total_items)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{brl(Number(o.total_amount))}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{o.payment_method || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Ver" onClick={() => setViewOrder(o)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {o.status !== "pago" && o.status !== "cancelado" && (
                            <>
                              <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditingOrder(o); setOpenOrder(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" title="Quitar" onClick={() => settle(o)}>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button size="icon" variant="ghost" title="Cancelar" onClick={() => cancelOrder(o)}>
                                <XCircle className="h-4 w-4 text-rose-600" />
                              </Button>
                            </>
                          )}
                          {o.status !== "pago" && (
                            <Button size="icon" variant="ghost" title="Excluir" onClick={() => deleteOrder(o)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quitar" className="space-y-3">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nº</th>
                    <th className="px-4 py-3 font-medium">Fornecedor</th>
                    <th className="px-4 py-3 font-medium">Data prevista</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Itens</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {settleList.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum pedido pendente de quitação</td></tr>
                  ) : settleList.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono">#{String(o.order_number).padStart(4, "0")}</td>
                      <td className="px-4 py-3">{o.supplier_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">{o.expected_date ? new Date(o.expected_date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                      <td className="px-4 py-3 text-right">{num(o.total_items)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{brl(Number(o.total_amount))}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setViewOrder(o)}>
                            <Eye className="h-3 w-3 mr-1" /> Ver
                          </Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => settle(o)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Quitar Pedido
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      <OrderDialog
        open={openOrder}
        onOpenChange={setOpenOrder}
        editing={editingOrder}
        suppliers={suppliers}
        products={products}
        existingItems={editingOrder ? (orderItems[editingOrder.id] || []) : []}
        userEmail={user?.email || null}
        userId={user?.id || null}
        onDone={loadAll}
      />
      <ViewOrderDialog
        order={viewOrder}
        items={viewOrder ? (orderItems[viewOrder.id] || []) : []}
        onClose={() => setViewOrder(null)}
      />
      <SupplierDialog
        open={openSupplier}
        onOpenChange={setOpenSupplier}
        editing={editingSupplier}
        userEmail={user?.email || null}
        userId={user?.id || null}
        onDone={loadAll}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "amber" | "emerald" | "sky" | "rose"; }) {
  const toneCls: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    sky: "bg-sky-500/10 text-sky-600",
    rose: "bg-rose-500/10 text-rose-600",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneCls[tone]}`}>{icon}</div>
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function SupplierDialog({ open, onOpenChange, editing, onDone, userEmail, userId }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Supplier | null;
  onDone: () => void; userEmail: string | null; userId: string | null;
}) {
  const [form, setForm] = useState<Partial<Supplier>>({});
  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { active: true });
  }, [open, editing]);

  async function save() {
    if (!form.name?.trim()) return toast.error("Informe o nome do fornecedor");
    const payload: any = {
      name: form.name, document: form.document || null,
      phone: form.phone || null, whatsapp: form.whatsapp || null,
      email: form.email || null, address: form.address || null,
      contact_name: form.contact_name || null, notes: form.notes || null,
      active: form.active ?? true,
    };
    if (editing) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Fornecedor atualizado");
    } else {
      payload.created_by = userId;
      payload.created_by_email = userEmail;
      const { error } = await supabase.from("suppliers").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Fornecedor cadastrado");
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nome do fornecedor *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div><Label>CNPJ / CPF</Label><Input value={form.document || ""} maxLength={18}
            onChange={(e) => setForm({ ...form, document: formatDocBR(e.target.value) })} /></div>
          <div><Label>Nome do contato</Label><Input value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={form.phone || ""} maxLength={15}
            onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })} /></div>
          <div><Label>WhatsApp</Label><Input value={form.whatsapp || ""} maxLength={15}
            onChange={(e) => setForm({ ...form, whatsapp: formatPhoneBR(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>E-mail</Label><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={(form.active ?? true) ? "ativo" : "inativo"} onValueChange={(v) => setForm({ ...form, active: v === "ativo" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} className="bg-gradient-primary text-white">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDialog({ open, onOpenChange, editing, suppliers, products, existingItems, userEmail, userId, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: PurchaseOrder | null;
  suppliers: Supplier[]; products: ProductLite[];
  existingItems: POItem[];
  userEmail: string | null; userId: string | null;
  onDone: () => void;
}) {
  const today = () => new Date().toISOString().slice(0, 10);
  const [supplierId, setSupplierId] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>(today());
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [status, setStatus] = useState<POStatus>("em_aberto");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<POItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSupplierId(editing.supplier_id || "");
      setOrderDate(editing.order_date.slice(0, 10));
      setExpectedDate(editing.expected_date ? editing.expected_date.slice(0, 10) : "");
      setPaymentMethod(editing.payment_method || "");
      setStatus(editing.status);
      setNotes(editing.notes || "");
      setItems(existingItems.map((it) => ({ ...it })));
    } else {
      setSupplierId(""); setOrderDate(today()); setExpectedDate("");
      setPaymentMethod(""); setStatus("em_aberto"); setNotes(""); setItems([]);
    }
  }, [open, editing, existingItems]);

  function addItem() {
    setItems((prev) => [...prev, { product_id: null, product_name: "", quantity: 1, current_cost: 0, new_cost: 0, total_cost: 0 }]);
  }
  function updateItem(idx: number, patch: Partial<POItem>) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      merged.total_cost = Number(merged.quantity || 0) * Number(merged.new_cost || 0);
      return merged;
    }));
  }
  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const merged: POItem = {
        ...it, product_id: p.id, product_name: p.name,
        current_cost: Number(p.cost_price || 0),
        new_cost: it.new_cost || Number(p.cost_price || 0),
      };
      merged.total_cost = Number(merged.quantity || 0) * Number(merged.new_cost || 0);
      return merged;
    }));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const totals = useMemo(() => {
    const totalAmount = items.reduce((a, it) => a + Number(it.total_cost || 0), 0);
    const totalItems = items.reduce((a, it) => a + Number(it.quantity || 0), 0);
    return { totalAmount, totalItems };
  }, [items]);

  async function save() {
    if (!supplierId) return toast.error("Selecione um fornecedor");
    if (items.length === 0) return toast.error("Adicione pelo menos um produto");
    if (items.some((it) => !it.product_id)) return toast.error("Selecione o produto em todos os itens");
    const supplier = suppliers.find((s) => s.id === supplierId);

    const payload: any = {
      supplier_id: supplierId,
      supplier_name: supplier?.name || null,
      order_date: new Date(orderDate).toISOString(),
      expected_date: expectedDate ? new Date(expectedDate).toISOString() : null,
      payment_method: paymentMethod || null,
      status, notes: notes || null,
      total_amount: totals.totalAmount, total_items: totals.totalItems,
    };

    let poId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("purchase_orders").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await supabase.from("purchase_order_items").delete().eq("purchase_order_id", editing.id);
    } else {
      payload.created_by = userId;
      payload.created_by_email = userEmail;
      const { data, error } = await supabase.from("purchase_orders").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      poId = data!.id;
    }

    const itemsPayload = items.map((it) => ({
      purchase_order_id: poId,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: Number(it.quantity || 0),
      current_cost: Number(it.current_cost || 0),
      new_cost: Number(it.new_cost || 0),
      total_cost: Number(it.total_cost || 0),
    }));
    const { error: itErr } = await supabase.from("purchase_order_items").insert(itemsPayload);
    if (itErr) return toast.error(itErr.message);

    toast.success(editing ? "Pedido atualizado" : "Pedido criado");
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? `Editar pedido #${String(editing.order_number).padStart(4, "0")}` : "Novo pedido de compra"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Fornecedor *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as POStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="em_aberto">Em aberto</SelectItem>
                <SelectItem value="aguardando_pagamento">Aguardando pagamento</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data do pedido *</Label>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
          <div>
            <Label>Data prevista de entrega</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Produtos do pedido</div>
            <Button size="sm" onClick={addItem} variant="outline" className="gap-2"><Plus className="h-3 w-3" /> Adicionar item</Button>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-3 py-2 font-medium text-right w-20">Qtd</th>
                  <th className="px-3 py-2 font-medium text-right w-32">Custo atual</th>
                  <th className="px-3 py-2 font-medium text-right w-32">Novo custo</th>
                  <th className="px-3 py-2 font-medium text-right w-32">Total</th>
                  <th className="px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-xs">Nenhum produto adicionado</td></tr>
                ) : items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        onClick={() => { setPickerIdx(idx); setPickerSearch(""); setPickerOpen(true); }}
                      >
                        <span className="truncate text-left">
                          {it.product_name || <span className="text-muted-foreground">Buscar por nome…</span>}
                        </span>
                        <Search className="h-3.5 w-3.5 opacity-60 shrink-0 ml-2" />
                      </Button>
                    </td>
                    <td className="px-3 py-2"><Input type="number" min={0} step="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className="text-right" /></td>
                    <td className="px-3 py-2"><CurrencyInput value={it.current_cost} onValueChange={(v) => updateItem(idx, { current_cost: v })} className="text-right" /></td>
                    <td className="px-3 py-2"><CurrencyInput value={it.new_cost} onValueChange={(v) => updateItem(idx, { new_cost: v })} className="text-right" /></td>
                    <td className="px-3 py-2 text-right font-semibold">{brl(Number(it.total_cost || 0))}</td>
                    <td className="px-3 py-2 text-center">
                      <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-rose-600" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr>
                  <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={1}>Totais</td>
                  <td className="px-3 py-3 text-right font-semibold">{num(totals.totalItems)}</td>
                  <td colSpan={2} className="px-3 py-3 text-right text-sm text-muted-foreground">Valor total do pedido</td>
                  <td className="px-3 py-3 text-right font-display font-bold text-lg">{brl(totals.totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} className="bg-gradient-primary text-white">Salvar pedido</Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Package className="h-5 w-5" /> Selecionar produto
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-9"
              placeholder="Buscar por nome ou SKU..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border divide-y">
            {products
              .filter((p) => {
                const q = pickerSearch.trim().toLowerCase();
                if (!q) return true;
                return p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
              })
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between gap-3"
                  onClick={() => {
                    if (pickerIdx !== null) pickProduct(pickerIdx, p.id);
                    setPickerOpen(false);
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.sku ? `SKU ${p.sku} • ` : ""}Estoque: {num(p.stock_qty)}
                    </div>
                  </div>
                  <div className="text-sm tabular text-muted-foreground shrink-0">
                    Custo atual: <span className="font-semibold text-foreground">{brl(Number(p.cost_price || 0))}</span>
                  </div>
                </button>
              ))}
            {products.filter((p) => {
              const q = pickerSearch.trim().toLowerCase();
              if (!q) return true;
              return p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
            }).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ViewOrderDialog({ order, items, onClose }: { order: PurchaseOrder | null; items: POItem[]; onClose: () => void; }) {
  if (!order) return null;
  return (
    <Dialog open={!!order} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Pedido #{String(order.order_number).padStart(4, "0")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Info label="Fornecedor" value={order.supplier_name || "—"} />
          <Info label="Status" value={STATUS_LABEL[order.status]} />
          <Info label="Pagamento" value={order.payment_method || "—"} />
          <Info label="Data do pedido" value={new Date(order.order_date).toLocaleDateString("pt-BR")} />
          <Info label="Entrega prevista" value={order.expected_date ? new Date(order.expected_date).toLocaleDateString("pt-BR") : "—"} />
          <Info label="Quitado em" value={order.settled_at ? new Date(order.settled_at).toLocaleString("pt-BR") : "—"} />
          <Info label="Criado por" value={order.created_by_email || "—"} />
          <Info label="Quitado por" value={order.settled_by_email || "—"} />
          <Info label="Itens" value={String(num(order.total_items))} />
        </div>
        {order.notes && <div className="mt-3 text-sm bg-muted/30 rounded-lg p-3"><strong>Observações:</strong> {order.notes}</div>}
        <div className="mt-4 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium text-right">Qtd</th>
                <th className="px-3 py-2 font-medium text-right">Custo atual</th>
                <th className="px-3 py-2 font-medium text-right">Novo custo</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{it.product_name}</td>
                  <td className="px-3 py-2 text-right">{num(it.quantity)}</td>
                  <td className="px-3 py-2 text-right">{brl(Number(it.current_cost || 0))}</td>
                  <td className="px-3 py-2 text-right font-semibold">{brl(Number(it.new_cost || 0))}</td>
                  <td className="px-3 py-2 text-right font-semibold">{brl(Number(it.total_cost || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30">
              <tr>
                <td colSpan={4} className="px-3 py-3 text-right text-muted-foreground">Valor total</td>
                <td className="px-3 py-3 text-right font-display font-bold text-lg">{brl(Number(order.total_amount))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}