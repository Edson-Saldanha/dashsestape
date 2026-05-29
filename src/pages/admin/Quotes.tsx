import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, FileText, CheckCircle2, Clock, ExternalLink, Flame, Zap, AlertTriangle, Leaf, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/useRole";
import { brl } from "@/lib/format";
import { formatPhoneBR } from "@/lib/cpf";

type Quote = {
  id: string;
  product_name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_phone: string | null;
  product_link: string | null;
  quantity: number;
  quoted_price: number;
  delivery_time: string | null;
  payment_terms: string | null;
  notes: string | null;
  status: string;
  urgency: string;
  created_at: string;
  purchase_authorized?: boolean;
  purchase_authorized_at?: string | null;
  purchase_authorized_by_email?: string | null;
};

const empty = {
  product_name: "",
  brand: "",
  model: "",
  category: "",
  supplier_name: "",
  supplier_contact: "",
  supplier_phone: "",
  product_link: "",
  quantity: "1",
  quoted_price: "",
  delivery_time: "",
  payment_terms: "",
  notes: "",
  urgency: "normal",
};

export default function Quotes() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const PRICE_ALLOWED_EMAILS = ["ryan@sestape.com.br", "edsonsestape@gmail.com"];
  const canSetPrice = PRICE_ALLOWED_EMAILS.includes((user?.email || "").toLowerCase());
  const [list, setList] = useState<Quote[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; contact_name: string | null; phone: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [authorizeTarget, setAuthorizeTarget] = useState<Quote | null>(null);
  const [authorizing, setAuthorizing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    setList((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    supabase
      .from("product_categories")
      .select("name")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setCategories((data || []).map((c: any) => c.name).filter(Boolean));
      });
    supabase.from("suppliers").select("id, name, contact_name, phone").eq("active", true).order("name").then(({ data }) => {
      setSuppliers((data as any) || []);
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (q: Quote) => {
    setEditing(q);
    setForm({
      product_name: q.product_name || "",
      brand: q.brand || "",
      model: q.model || "",
      category: q.category || "",
      supplier_name: q.supplier_name || "",
      supplier_contact: q.supplier_contact || "",
      supplier_phone: q.supplier_phone || "",
      product_link: q.product_link || "",
      quantity: String(q.quantity ?? 1),
      quoted_price: q.quoted_price ? String(q.quoted_price) : "",
      delivery_time: q.delivery_time || "",
      payment_terms: q.payment_terms || "",
      notes: q.notes || "",
      urgency: q.urgency || "normal",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.product_name.trim()) return toast.error("Informe o nome do produto");
    const price = parseFloat(form.quoted_price.replace(",", ".")) || 0;
    if (editing && !canSetPrice) {
      const prevPrice = Number(editing.quoted_price) || 0;
      if (price !== prevPrice) {
        return toast.error("Apenas Ryan ou Edson podem alterar o valor cotado.");
      }
    }
    if (!editing && !canSetPrice && price > 0) {
      return toast.error("Apenas Ryan ou Edson podem preencher o valor cotado.");
    }
    const payload: any = {
      product_name: form.product_name.trim(),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      category: form.category.trim() || null,
      supplier_name: form.supplier_name.trim() || null,
      supplier_contact: form.supplier_contact.trim() || null,
      supplier_phone: form.supplier_phone.trim() || null,
      product_link: form.product_link.trim() || null,
      quantity: parseFloat(form.quantity.replace(",", ".")) || 1,
      quoted_price: price,
      delivery_time: form.delivery_time.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
      notes: form.notes.trim() || null,
      urgency: form.urgency || "normal",
      status: price > 0 ? "cotado" : "pendente",
    };
    if (editing) {
      const { error } = await supabase.from("quotes").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Cotação atualizada");
    } else {
      payload.created_by = user?.id;
      payload.created_by_email = user?.email;
      const { error } = await supabase.from("quotes").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Cotação criada");
    }
    setOpen(false);
    load();
  };

  const remove = async (q: Quote) => {
    if (!confirm(`Excluir cotação de "${q.product_name}"?`)) return;
    const { error } = await supabase.from("quotes").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    load();
  };

  const requestAuthorize = (q: Quote) => {
    if (!isAdmin) return toast.error("Apenas administradores podem autorizar compras.");
    setAuthorizeTarget(q);
  };

  const confirmAuthorize = async () => {
    const q = authorizeTarget;
    if (!q) return;
    setAuthorizing(true);
    const authorize = !q.purchase_authorized;
    const payload: any = authorize
      ? {
          purchase_authorized: true,
          purchase_authorized_at: new Date().toISOString(),
          purchase_authorized_by: user?.id || null,
          purchase_authorized_by_email: user?.email || null,
        }
      : {
          purchase_authorized: false,
          purchase_authorized_at: null,
          purchase_authorized_by: null,
          purchase_authorized_by_email: null,
        };
    const { error } = await supabase.from("quotes").update(payload).eq("id", q.id);
    setAuthorizing(false);
    setAuthorizeTarget(null);
    if (error) return toast.error(error.message);
    toast.success(authorize ? "Compra autorizada" : "Autorização removida");
    setOpen(false);
    load();
  };

  const filtered = list.filter(q => {
    if (search.trim()) {
      const s = search.toLowerCase();
      if (![q.product_name, q.brand, q.model, q.supplier_name].some(v => (v || "").toLowerCase().includes(s))) return false;
    }
    if (dateFrom) {
      if (new Date(q.created_at) < new Date(dateFrom + "T00:00:00")) return false;
    }
    if (dateTo) {
      if (new Date(q.created_at) > new Date(dateTo + "T23:59:59")) return false;
    }
    if (urgencyFilter !== "all" && (q.urgency || "normal") !== urgencyFilter) return false;
    return true;
  });

  const totalCotado = filtered.filter(q => q.quoted_price > 0).reduce((sum, q) => sum + q.quoted_price, 0);
  const pendentes = filtered.filter(q => !(q.quoted_price > 0)).length;

  const URGENCIES: Record<string, { label: string; cls: string; icon: any }> = {
    baixa:   { label: "Baixa",   cls: "bg-slate-500 text-white",   icon: Leaf },
    normal:  { label: "Normal",  cls: "bg-blue-600 text-white",    icon: Clock },
    alta:    { label: "Alta",    cls: "bg-amber-500 text-white",   icon: AlertTriangle },
    urgente: { label: "Urgente", cls: "bg-red-600 text-white animate-pulse", icon: Flame },
  };
  const urgencyMeta = (u?: string) => URGENCIES[(u || "normal")] || URGENCIES.normal;

  const urgenteCount = filtered.filter(q => (q.urgency || "normal") === "urgente").length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" /> Cotações
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Registre cotações de produtos que ainda não estão no estoque.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova cotação</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total de cotações</div>
          <div className="text-2xl font-bold mt-1">{filtered.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Cotados (valor total)</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{brl(totalCotado)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pendentes de preço</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{pendentes}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <Input placeholder="Produto, marca, modelo ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Urgência</Label>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgente">🔥 Urgente</SelectItem>
              <SelectItem value="alta">⚠️ Alta</SelectItem>
              <SelectItem value="normal">⏱ Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[170px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[170px]" />
        </div>
        {(dateFrom || dateTo || search || urgencyFilter !== "all") && (
          <Button variant="outline" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setUrgencyFilter("all"); }}>Limpar</Button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhuma cotação ainda. Clique em "Nova cotação" para começar.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((q) => {
            const cotado = q.quoted_price > 0;
            const um = urgencyMeta(q.urgency);
            const UrgIcon = um.icon;
            return (
              <Card
                key={q.id}
                className={`p-5 cursor-pointer transition-all hover:shadow-lg border-2 ${
                  q.purchase_authorized
                    ? "bg-violet-100/80 dark:bg-violet-950/40 border-violet-500 ring-2 ring-violet-500/30 shadow-violet-500/10"
                    : cotado
                    ? "bg-emerald-100/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/10"
                    : "bg-amber-50/30 dark:bg-amber-950/10 border-amber-500/40"
                }`}
                onClick={() => openEdit(q)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{q.product_name}</h3>
                    <div className="text-xs text-muted-foreground truncate">
                      {[q.brand, q.model].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {cotado ? (
                      <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Cotado</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>
                    )}
                    <Badge className={`gap-1 ${um.cls}`}><UrgIcon className="h-3 w-3" /> {um.label}</Badge>
                    {q.purchase_authorized && (
                      <Badge className="bg-violet-600 text-white gap-1">
                        <ShoppingCart className="h-3 w-3" /> Compra autorizada
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {q.supplier_name && <div><span className="text-muted-foreground">Fornecedor:</span> {q.supplier_name}</div>}
                  {q.category && <div><span className="text-muted-foreground">Categoria:</span> {q.category}</div>}
                  <div><span className="text-muted-foreground">Qtd:</span> {q.quantity}</div>
                  {q.delivery_time && <div><span className="text-muted-foreground">Prazo:</span> {q.delivery_time}</div>}
                  {q.payment_terms && <div><span className="text-muted-foreground">Pagamento:</span> {q.payment_terms}</div>}
                </div>

                <div className="mt-4 pt-3 border-t flex items-end justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor cotado</div>
                    <div className={`text-xl font-bold ${cotado ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {cotado ? brl(q.quoted_price) : "—"}
                    </div>
                    {q.purchase_authorized && (
                      <div className="text-[10px] text-violet-700 dark:text-violet-300 mt-1">
                        Pode comprar{q.purchase_authorized_by_email ? ` · ${q.purchase_authorized_by_email}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {q.product_link && (
                      <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                        <a href={q.product_link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(q); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(q); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cotação" : "Nova cotação"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome do produto *</Label>
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="Ex: Smart TV 55'' 4K" />
            </div>
            <div>
              <Label>Marca</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category || "__none"}
                onValueChange={(v) => setForm({ ...form, category: v === "__none" ? "" : v === "__new" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Sem categoria —</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ou digite uma nova categoria"
              />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Nível de urgência</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["normal","alta","urgente"] as const).map(k => {
                  const m = URGENCIES[k];
                  const Icon = m.icon;
                  const active = form.urgency === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm({ ...form, urgency: k })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                        active ? `${m.cls} border-transparent shadow-md scale-[1.02]` : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input
                list="quotes-suppliers"
                value={form.supplier_name}
                onChange={(e) => {
                  const val = e.target.value;
                  const match = suppliers.find(s => s.name.toLowerCase() === val.toLowerCase());
                  setForm({
                    ...form,
                    supplier_name: val,
                    supplier_contact: match?.contact_name || form.supplier_contact,
                    supplier_phone: match?.phone || form.supplier_phone,
                  });
                }}
                placeholder="Digite para buscar..."
              />
              <datalist id="quotes-suppliers">
                {suppliers.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div>
              <Label>Contato do fornecedor</Label>
              <Input
                list="quotes-supplier-contacts"
                value={form.supplier_contact}
                onChange={(e) => setForm({ ...form, supplier_contact: e.target.value })}
                placeholder="Nome do vendedor"
              />
              <datalist id="quotes-supplier-contacts">
                {suppliers.filter(s => s.contact_name).map((s) => (
                  <option key={s.id} value={s.contact_name!}>{s.name}</option>
                ))}
              </datalist>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.supplier_phone} maxLength={15}
                onChange={(e) => setForm({ ...form, supplier_phone: formatPhoneBR(e.target.value) })} />
            </div>
            <div>
              <Label>Prazo de entrega</Label>
              <Input value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} placeholder="Ex: 15 dias úteis" />
            </div>
            <div className="md:col-span-2">
              <Label>Link do produto</Label>
              <Input value={form.product_link} onChange={(e) => setForm({ ...form, product_link: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Condições de pagamento</Label>
              <Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="Ex: 30/60/90 dias" />
            </div>
            <div>
              <Label className={parseFloat(form.quoted_price.replace(",", ".")) > 0 ? "text-emerald-600 font-semibold" : ""}>
                Valor cotado (R$) {parseFloat(form.quoted_price.replace(",", ".")) > 0 && "✓"}
                {!canSetPrice && <span className="ml-2 text-xs font-normal text-muted-foreground">(somente Ryan ou Edson)</span>}
              </Label>
              <CurrencyInput
                value={form.quoted_price}
                onValueChange={(v) => setForm({ ...form, quoted_price: String(v) })}
                disabled={!canSetPrice}
                className={`${parseFloat(form.quoted_price.replace(",", ".")) > 0 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : ""} ${!canSetPrice ? "cursor-not-allowed opacity-70" : ""}`}
              />
              {!canSetPrice && (
                <p className="text-xs text-muted-foreground mt-1">Apenas Ryan ou Edson podem preencher o valor da cotação.</p>
              )}
              {editing && isAdmin && (
                <Button
                  type="button"
                  variant={editing.purchase_authorized ? "default" : "outline"}
                  className={`mt-2 w-full gap-2 ${editing.purchase_authorized
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : "border-violet-500 text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950"}`}
                  onClick={() => requestAuthorize(editing)}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {editing.purchase_authorized ? "Remover autorização" : "Autorizar compra"}
                </Button>
              )}
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar" : "Criar cotação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!authorizeTarget} onOpenChange={(o) => !o && setAuthorizeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950">
              <ShoppingCart className="h-6 w-6 text-violet-600 dark:text-violet-300" />
            </div>
            <AlertDialogTitle className="text-center">
              {authorizeTarget?.purchase_authorized ? "Remover autorização de compra?" : "Autorizar compra?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {authorizeTarget?.purchase_authorized ? (
                <>A compra de <span className="font-semibold text-foreground">"{authorizeTarget?.product_name}"</span> deixará de estar autorizada.</>
              ) : (
                <>Você está autorizando a compra de <span className="font-semibold text-foreground">"{authorizeTarget?.product_name}"</span> no valor de <span className="font-semibold text-emerald-600">{authorizeTarget ? brl(authorizeTarget.quoted_price) : ""}</span>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={authorizing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmAuthorize(); }}
              disabled={authorizing}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {authorizing ? "Salvando..." : authorizeTarget?.purchase_authorized ? "Remover autorização" : "Autorizar compra"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}