import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Search, History, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { enterFocusNext } from "@/lib/enterToNext";

type ProductStatus = "ativo" | "inativo" | "esgotado";

const STATUS_LABEL: Record<ProductStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  esgotado: "Esgotado",
};

const STATUS_CLASS: Record<ProductStatus, string> = {
  ativo: "bg-emerald-500/15 text-emerald-600",
  inativo: "bg-zinc-500/15 text-zinc-600",
  esgotado: "bg-red-500/15 text-red-600",
};

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  status: ProductStatus;
  stock_qty: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  sale_price_table2: number;
  supplier: string | null;
  last_purchase_date: string | null;
  location: string | null;
  notes: string | null;
  created_by_email: string | null;
  created_at: string;
}

interface Movement {
  id: string;
  product_id: string;
  movement_type: "entrada" | "saida" | "ajuste";
  quantity: number;
  previous_qty: number | null;
  new_qty: number | null;
  notes: string | null;
  user_email: string | null;
  created_at: string;
}

const emptyForm: Partial<Product> = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  model: "",
  description: "",
  status: "ativo",
  stock_qty: 0,
  min_stock: 0,
  cost_price: 0,
  sale_price: 0,
  sale_price_table2: 0,
  supplier: "",
  last_purchase_date: null,
  location: "",
  notes: "",
};

export default function Products() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveProduct, setMoveProduct] = useState<Product | null>(null);
  const [moveType, setMoveType] = useState<"entrada" | "saida">("entrada");
  const [moveQty, setMoveQty] = useState<number>(0);
  const [moveNotes, setMoveNotes] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Movement[]>([]);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [costHistory, setCostHistory] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data as Product[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    supabase
      .from("product_categories")
      .select("id,name")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setCategories((data as any) || []));
    supabase
      .from("suppliers")
      .select("id,name")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setSuppliers((data as any) || []));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.model?.toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const lowStock = useMemo(
    () => items.filter((p) => Number(p.min_stock) > 0 && Number(p.stock_qty) <= Number(p.min_stock)),
    [items],
  );

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
    setCostHistory([]);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
    supabase
      .from("product_cost_history")
      .select("*")
      .eq("product_id", p.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => setCostHistory((data as any[]) || []));
  }

  async function save() {
    if (!form.name?.trim()) { toast.error("Informe o nome do produto"); return; }
    const payload: any = {
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      brand: form.brand || null,
      model: form.model || null,
      description: form.description || null,
      status: form.status || "ativo",
      stock_qty: Number(form.stock_qty || 0),
      min_stock: Number(form.min_stock || 0),
      cost_price: Number(form.cost_price || 0),
      sale_price: Number(form.sale_price || 0),
      sale_price_table2: Number(form.sale_price_table2 || 0),
      supplier: form.supplier || null,
      last_purchase_date: form.last_purchase_date || null,
      location: form.location || null,
      notes: form.notes || null,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Produto atualizado");
    } else {
      payload.created_by = user?.id || null;
      payload.created_by_email = user?.email || null;
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Produto cadastrado");
    }
    setOpen(false);
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`Excluir o produto "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    load();
  }

  function openMove(p: Product, type: "entrada" | "saida") {
    setMoveProduct(p);
    setMoveType(type);
    setMoveQty(0);
    setMoveNotes("");
    setMoveOpen(true);
  }

  async function confirmMove() {
    if (!moveProduct) return;
    const qty = Number(moveQty);
    if (!qty || qty <= 0) { toast.error("Informe uma quantidade válida"); return; }
    const prev = Number(moveProduct.stock_qty);
    const next = moveType === "entrada" ? prev + qty : prev - qty;
    if (next < 0) { toast.error("Estoque não pode ficar negativo"); return; }

    const newStatus: ProductStatus =
      moveProduct.status === "inativo" ? "inativo" : next <= 0 ? "esgotado" : "ativo";

    const { error: upErr } = await supabase
      .from("products")
      .update({
        stock_qty: next,
        status: newStatus,
        last_purchase_date: moveType === "entrada" ? new Date().toISOString() : moveProduct.last_purchase_date,
      })
      .eq("id", moveProduct.id);
    if (upErr) return toast.error(upErr.message);

    const { error: hErr } = await supabase.from("stock_movements").insert({
      product_id: moveProduct.id,
      movement_type: moveType,
      quantity: qty,
      previous_qty: prev,
      new_qty: next,
      notes: moveNotes || null,
      user_id: user?.id || null,
      user_email: user?.email || null,
    });
    if (hErr) toast.error(hErr.message);

    toast.success(moveType === "entrada" ? "Entrada registrada" : "Saída registrada");
    setMoveOpen(false);
    load();
  }

  async function openHistory(p: Product) {
    setHistoryProduct(p);
    setHistoryOpen(true);
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", p.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setHistory((data as Movement[]) || []);
  }

  function margin(p: Partial<Product>) {
    const cost = Number(p.cost_price || 0);
    const sale = Number(p.sale_price || 0);
    if (!sale) return 0;
    return ((sale - cost) / sale) * 100;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Package className="h-7 w-7 text-primary" /> Produtos & Estoque
          </h1>
          <p className="text-muted-foreground">Cadastro, controle de estoque e movimentações</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </motion.div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-700">Estoque baixo</div>
            <div className="text-amber-700/80">
              {lowStock.length} produto(s) abaixo do estoque mínimo:{" "}
              {lowStock.slice(0, 5).map((p) => p.name).join(", ")}
              {lowStock.length > 5 ? "…" : ""}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU, categoria, marca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="esgotado">Esgotado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium text-right">Estoque</th>
                <th className="px-4 py-3 font-medium text-right">Custo</th>
                <th className="px-4 py-3 font-medium text-right">Venda</th>
                <th className="px-4 py-3 font-medium text-right">Margem</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Nenhum produto encontrado</td></tr>
              ) : filtered.map((p) => {
                const low = Number(p.min_stock) > 0 && Number(p.stock_qty) <= Number(p.min_stock);
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.brand, p.model].filter(Boolean).join(" • ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={low ? "text-amber-600 font-semibold" : ""}>{Number(p.stock_qty)}</span>
                      {Number(p.min_stock) > 0 && (
                        <span className="text-xs text-muted-foreground"> / min {Number(p.min_stock)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{brl(Number(p.cost_price))}</td>
                    <td className="px-4 py-3 text-right">{brl(Number(p.sale_price))}</td>
                    <td className="px-4 py-3 text-right">{margin(p).toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_CLASS[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Entrada" onClick={() => openMove(p, "entrada")}>
                          <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Saída" onClick={() => openMove(p, "saida")}>
                          <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Histórico" onClick={() => openHistory(p)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Excluir" onClick={() => remove(p)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-[96vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onKeyDown={enterFocusNext}>
            <div className="md:col-span-2">
              <Label>Nome do produto *</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Código / SKU</Label>
              <Input value={form.sku || ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Categoria / Nicho</Label>
              <Select
                value={form.category || ""}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categories.length ? "Selecione..." : "Nenhuma categoria cadastrada"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marca</Label>
              <Input value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status as string} onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="esgotado">Esgotado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Localização no estoque</Label>
              <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>

            <div className="md:col-span-2 mt-2 pt-2 border-t font-semibold text-sm text-muted-foreground">Estoque</div>
            <div>
              <Label>Quantidade atual</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.stock_qty ? String(form.stock_qty) : ""}
                onChange={(e) => setForm({ ...form, stock_qty: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Estoque mínimo</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.min_stock ? String(form.min_stock) : ""}
                onChange={(e) => setForm({ ...form, min_stock: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </div>

            <div className="md:col-span-2 mt-2 pt-2 border-t font-semibold text-sm text-muted-foreground">Financeiro</div>
            <div>
              <Label>Custo de compra (R$)</Label>
              <CurrencyInput value={form.cost_price ?? 0} onValueChange={(v) => setForm({ ...form, cost_price: v })} />
            </div>
            <div className="space-y-3">
              <div>
                <Label>Preço de venda (R$)</Label>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tabela 1</span>
                <CurrencyInput value={form.sale_price ?? 0} onValueChange={(v) => setForm({ ...form, sale_price: v })} />
              </div>
              <div>
                <Label>Preço de venda (R$)</Label>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tabela 2</span>
                <CurrencyInput value={form.sale_price_table2 ?? 0} onValueChange={(v) => setForm({ ...form, sale_price_table2: v })} />
              </div>
            </div>
            <div className="md:col-span-2 text-xs text-muted-foreground">
              Margem: <span className="font-semibold">{margin(form).toFixed(1)}%</span> • Lucro por unidade:{" "}
              <span className="font-semibold">{brl(Number(form.sale_price || 0) - Number(form.cost_price || 0))}</span>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select
                value={form.supplier || ""}
                onValueChange={(v) => setForm({ ...form, supplier: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={suppliers.length ? "Selecione..." : "Nenhum fornecedor cadastrado"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da última compra</Label>
              <Input
                type="date"
                value={form.last_purchase_date ? new Date(form.last_purchase_date).toISOString().slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, last_purchase_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          {editing && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 font-semibold text-sm mb-3">
                <TrendingUp className="h-4 w-4 text-primary" /> Histórico de alterações de custo
              </div>
              {costHistory.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                  Nenhuma alteração de custo registrada. Quitar pedidos de compra atualiza este histórico automaticamente.
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs">
                      <tr>
                        <th className="px-3 py-2 font-medium">Data</th>
                        <th className="px-3 py-2 font-medium text-right">Custo anterior</th>
                        <th className="px-3 py-2 font-medium text-right">Novo custo</th>
                        <th className="px-3 py-2 font-medium">Fornecedor</th>
                        <th className="px-3 py-2 font-medium">Pedido</th>
                        <th className="px-3 py-2 font-medium">Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costHistory.map((h) => (
                        <tr key={h.id} className="border-t">
                          <td className="px-3 py-2 text-xs">{new Date(h.changed_at).toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-2 text-right">{brl(Number(h.previous_cost || 0))}</td>
                          <td className="px-3 py-2 text-right font-semibold">{brl(Number(h.new_cost || 0))}</td>
                          <td className="px-3 py-2 text-xs">{h.supplier_name || "—"}</td>
                          <td className="px-3 py-2 text-xs font-mono">{h.purchase_order_number ? `#${String(h.purchase_order_number).padStart(4,"0")}` : "—"}</td>
                          <td className="px-3 py-2 text-xs">{h.changed_by_email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar alterações" : "Cadastrar produto"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveType === "entrada" ? "Entrada de estoque" : "Saída de estoque"}
              {moveProduct ? ` — ${moveProduct.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Estoque atual: <span className="font-semibold text-foreground">{moveProduct ? Number(moveProduct.stock_qty) : 0}</span>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min={1} value={moveQty} onChange={(e) => setMoveQty(Number(e.target.value))} />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea rows={2} value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={confirmMove}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de movimentações{historyProduct ? ` — ${historyProduct.name}` : ""}</DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Sem movimentações registradas.</div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium flex items-center gap-2">
                      {h.movement_type === "entrada" ? (
                        <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                      )}
                      {h.movement_type === "entrada" ? "Entrada" : h.movement_type === "saida" ? "Saída" : "Ajuste"} de {Number(h.quantity)}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {h.previous_qty != null && h.new_qty != null ? `Estoque: ${Number(h.previous_qty)} → ${Number(h.new_qty)}` : ""}
                    {h.user_email ? ` • por ${h.user_email}` : ""}
                  </div>
                  {h.notes && <div className="text-sm mt-1">{h.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
