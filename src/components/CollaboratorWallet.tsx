import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet, CheckCircle2, Circle, Package, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";

interface PurchaseItem { product_id?: string | null; name: string; qty: number; unit_price: number }
interface Installment {
  id: string; purchase_id: string; customer_id: string;
  installment_number: number; due_date: string; amount: number;
  paid: boolean; paid_at: string | null; paid_by_email: string | null; notes: string | null;
}
interface Purchase {
  id: string; customer_id: string; customer_name: string | null;
  purchase_date: string; description: string | null; items: PurchaseItem[];
  total_amount: number; deduct_stock: boolean; notes: string | null; created_at: string;
}
interface Product { id: string; name: string; sale_price: number; stock_qty: number; sku?: string | null }

export default function CollaboratorWallet({
  open, onOpenChange, customerId, customerName,
}: { open: boolean; onOpenChange: (v: boolean) => void; customerId: string; customerName: string }) {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [creating, setCreating] = useState(false);

  // novo lançamento
  const today = new Date().toISOString().slice(0, 10);
  const [npDate, setNpDate] = useState(today);
  const [npDesc, setNpDesc] = useState("");
  const [npNotes, setNpNotes] = useState("");
  const [npDeduct, setNpDeduct] = useState(false);
  const [npItems, setNpItems] = useState<PurchaseItem[]>([]);
  const [npParcs, setNpParcs] = useState<{ due_date: string; amount: string }[]>([]);

  const refresh = async () => {
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from("customer_wallet_purchases").select("*").eq("customer_id", customerId).order("purchase_date", { ascending: false }),
      supabase.from("customer_wallet_installments").select("*").eq("customer_id", customerId).order("due_date", { ascending: true }),
    ]);
    setPurchases(((p as any) || []).map((r: any) => ({ ...r, items: Array.isArray(r.items) ? r.items : [] })));
    setInstallments((i as any) || []);
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    supabase.from("products").select("id,name,sale_price,stock_qty,sku").eq("status", "ativo").order("name")
      .then(({ data }) => setProducts(((data as any) || [])));
  }, [open, customerId]);

  const resetForm = () => {
    setNpDate(today); setNpDesc(""); setNpNotes(""); setNpDeduct(false);
    setNpItems([]); setNpParcs([]);
  };

  const itemsTotal = useMemo(() => npItems.reduce((a, it) => a + Number(it.qty || 0) * Number(it.unit_price || 0), 0), [npItems]);
  const parcsTotal = useMemo(() => npParcs.reduce((a, p) => a + Number(p.amount || 0), 0), [npParcs]);

  const addItem = () => setNpItems(arr => [...arr, { product_id: null, name: "", qty: 1, unit_price: 0 }]);
  const updItem = (idx: number, patch: Partial<PurchaseItem>) => setNpItems(arr => arr.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const rmItem = (idx: number) => setNpItems(arr => arr.filter((_, i) => i !== idx));

  const pickProduct = (idx: number, productId: string) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    updItem(idx, { product_id: p.id, name: p.name, unit_price: Number(p.sale_price || 0) });
  };

  const addParc = () => {
    const d = new Date(); d.setMonth(d.getMonth() + npParcs.length + 1);
    setNpParcs(arr => [...arr, { due_date: d.toISOString().slice(0, 10), amount: "" }]);
  };
  const updParc = (idx: number, patch: Partial<{ due_date: string; amount: string }>) =>
    setNpParcs(arr => arr.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const rmParc = (idx: number) => setNpParcs(arr => arr.filter((_, i) => i !== idx));

  const save = async () => {
    if (npItems.length === 0) return toast.error("Adicione pelo menos um item");
    if (npItems.some(it => !it.name.trim() || Number(it.qty) <= 0)) return toast.error("Verifique os itens (nome e quantidade)");
    if (npParcs.length === 0) return toast.error("Adicione pelo menos uma parcela");
    if (npParcs.some(p => !p.due_date || Number(p.amount) <= 0)) return toast.error("Verifique vencimentos e valores das parcelas");
    const diff = Math.abs(parcsTotal - itemsTotal);
    if (diff > 0.01 && !confirm(`A soma das parcelas (${brl(parcsTotal)}) é diferente do total dos itens (${brl(itemsTotal)}). Continuar mesmo assim?`)) return;

    setCreating(true);
    try {
      const { data: created, error } = await supabase.from("customer_wallet_purchases").insert({
        customer_id: customerId, customer_name: customerName,
        purchase_date: new Date(npDate).toISOString(),
        description: npDesc || null,
        items: npItems as any,
        total_amount: itemsTotal,
        deduct_stock: npDeduct,
        notes: npNotes || null,
        created_by: user?.id, created_by_email: user?.email,
      }).select().single();
      if (error) throw error;

      const purchaseId = (created as any).id;
      const parcRows = npParcs.map((p, i) => ({
        purchase_id: purchaseId, customer_id: customerId,
        installment_number: i + 1, due_date: p.due_date, amount: Number(p.amount),
      }));
      const { error: e2 } = await supabase.from("customer_wallet_installments").insert(parcRows);
      if (e2) throw e2;

      // Baixa de estoque (opcional)
      if (npDeduct) {
        for (const it of npItems) {
          if (it.product_id && Number(it.qty) > 0) {
            await supabase.rpc("apply_stock_movement", {
              _product_id: it.product_id,
              _movement_type: "saida",
              _quantity: Number(it.qty),
              _reason: `Carteira colaborador: ${customerName}`,
              _responsible: user?.email || null,
              _notes: npDesc || null,
            } as any);
          }
        }
      }

      toast.success("Compra lançada na carteira");
      resetForm(); setCreating(false);
      refresh();
    } catch (err: any) {
      setCreating(false);
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const togglePaid = async (inst: Installment) => {
    const newPaid = !inst.paid;
    const { error } = await supabase.from("customer_wallet_installments").update({
      paid: newPaid,
      paid_at: newPaid ? new Date().toISOString() : null,
      paid_by: newPaid ? user?.id : null,
      paid_by_email: newPaid ? user?.email : null,
    }).eq("id", inst.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const removePurchase = async (id: string) => {
    if (!confirm("Excluir esta compra e todas as parcelas vinculadas?")) return;
    const { error } = await supabase.from("customer_wallet_purchases").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Compra excluída");
    refresh();
  };

  const totals = useMemo(() => {
    const total = installments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const pago = installments.filter(p => p.paid).reduce((a, p) => a + Number(p.amount || 0), 0);
    const pendente = total - pago;
    const overdue = installments.filter(p => !p.paid && new Date(p.due_date) < new Date(today)).reduce((a, p) => a + Number(p.amount || 0), 0);
    return { total, pago, pendente, overdue };
  }, [installments, today]);

  const parcsByPurchase = useMemo(() => {
    const map: Record<string, Installment[]> = {};
    for (const i of installments) (map[i.purchase_id] ||= []).push(i);
    return map;
  }, [installments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Carteira de {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Sum label="Total lançado" value={brl(totals.total)} />
          <Sum label="Pago" value={brl(totals.pago)} tone="emerald" />
          <Sum label="Pendente" value={brl(totals.pendente)} tone="primary" />
          <Sum label="Em atraso" value={brl(totals.overdue)} tone="rose" />
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-display font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Nova compra</div>
            <div className="text-xs text-muted-foreground">Total itens: <span className="font-semibold text-primary">{brl(itemsTotal)}</span> · Parcelas: <span className="font-semibold">{brl(parcsTotal)}</span></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><Label>Data</Label><Input type="date" value={npDate} onChange={e => setNpDate(e.target.value)} /></div>
            <div className="md:col-span-3"><Label>Descrição</Label><Input value={npDesc} onChange={e => setNpDesc(e.target.value)} placeholder="Ex.: Compra de peças/produtos para uso próprio" /></div>
          </div>

          {/* Itens */}
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-[1.5fr_80px_120px_120px_40px] bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <div className="p-2">Produto / Item</div>
              <div className="p-2">Qtd</div>
              <div className="p-2">Preço unit.</div>
              <div className="p-2">Subtotal</div>
              <div className="p-2"></div>
            </div>
            {npItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Nenhum item adicionado.</div>
            ) : npItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_80px_120px_120px_40px] items-center border-t">
                <div className="p-1.5 space-y-1">
                  <select className="flex h-8 w-full rounded-md border bg-background px-2 text-xs" value={it.product_id || ""}
                    onChange={e => e.target.value ? pickProduct(idx, e.target.value) : updItem(idx, { product_id: null })}>
                    <option value="">— Item livre (sem produto) —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""} · est. {p.stock_qty}</option>)}
                  </select>
                  <Input className="h-7 text-xs" value={it.name} onChange={e => updItem(idx, { name: e.target.value })} placeholder="Nome do item" />
                </div>
                <div className="p-1.5"><Input className="h-8" type="number" min="0" step="1" value={it.qty} onChange={e => updItem(idx, { qty: Number(e.target.value) })} /></div>
                <div className="p-1.5"><CurrencyInput className="h-8" value={it.unit_price} onValueChange={v => updItem(idx, { unit_price: v })} /></div>
                <div className="p-1.5 text-sm font-medium tabular-nums">{brl(Number(it.qty || 0) * Number(it.unit_price || 0))}</div>
                <div className="p-1.5"><Button type="button" size="icon" variant="ghost" onClick={() => rmItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div>
            ))}
            <div className="border-t p-2 flex items-center justify-between bg-muted/20">
              <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Adicionar item</Button>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={npDeduct} onChange={e => setNpDeduct(e.target.checked)} />
                <Boxes className="h-3 w-3" /> Baixar do estoque
              </label>
            </div>
          </div>

          {/* Parcelas */}
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_1fr_40px] bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <div className="p-2">#</div>
              <div className="p-2">Vencimento</div>
              <div className="p-2">Valor</div>
              <div className="p-2"></div>
            </div>
            {npParcs.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma parcela. Adicione manualmente quantas precisar.</div>
            ) : npParcs.map((p, idx) => (
              <div key={idx} className="grid grid-cols-[60px_1fr_1fr_40px] items-center border-t">
                <div className="p-2 text-sm font-medium text-muted-foreground">{idx + 1}</div>
                <div className="p-1.5"><Input className="h-8" type="date" value={p.due_date} onChange={e => updParc(idx, { due_date: e.target.value })} /></div>
                <div className="p-1.5"><CurrencyInput className="h-8" value={p.amount} onValueChange={v => updParc(idx, { amount: String(v) })} /></div>
                <div className="p-1.5"><Button type="button" size="icon" variant="ghost" onClick={() => rmParc(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div>
            ))}
            <div className="border-t p-2 flex items-center justify-between bg-muted/20">
              <Button type="button" size="sm" variant="outline" onClick={addParc}><Plus className="h-3 w-3 mr-1" /> Adicionar parcela</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => {
                if (!itemsTotal || npParcs.length === 0) return;
                const v = (itemsTotal / npParcs.length);
                setNpParcs(arr => arr.map(p => ({ ...p, amount: v.toFixed(2) })));
              }}>Dividir total entre as parcelas</Button>
            </div>
          </div>

          <Textarea rows={2} value={npNotes} onChange={e => setNpNotes(e.target.value)} placeholder="Observações (opcional)" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>Limpar</Button>
            <Button type="button" className="bg-gradient-primary text-white" disabled={creating} onClick={save}>
              {creating ? "Salvando..." : "Lançar compra"}
            </Button>
          </div>
        </div>

        {/* Histórico */}
        <div className="space-y-3">
          <div className="font-display font-semibold">Histórico</div>
          {purchases.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground p-8 rounded-lg border bg-card">Nenhuma compra lançada ainda.</div>
          ) : purchases.map(p => {
            const parcs = parcsByPurchase[p.id] || [];
            const pagoP = parcs.filter(x => x.paid).reduce((a, x) => a + Number(x.amount || 0), 0);
            return (
              <div key={p.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="p-3 flex items-center justify-between gap-3 border-b bg-muted/20">
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> {p.description || "(sem descrição)"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.purchase_date).toLocaleDateString("pt-BR")} · {p.items.length} ite{p.items.length === 1 ? "m" : "ns"} {p.deduct_stock ? "· baixado do estoque" : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-bold">{brl(Number(p.total_amount))}</div>
                    <div className="text-xs text-muted-foreground">Pago {brl(pagoP)} / {brl(parcs.reduce((a, x) => a + Number(x.amount || 0), 0))}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removePurchase(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Itens</div>
                    <ul className="text-xs space-y-0.5">
                      {p.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{it.qty}× {it.name}</span>
                          <span className="tabular-nums text-muted-foreground">{brl(Number(it.qty || 0) * Number(it.unit_price || 0))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Parcelas</div>
                    <ul className="text-xs space-y-1">
                      {parcs.map(inst => {
                        const overdue = !inst.paid && new Date(inst.due_date) < new Date(today);
                        return (
                          <li key={inst.id} className={`flex items-center gap-2 rounded-md border p-1.5 ${inst.paid ? "bg-emerald-500/5 border-emerald-500/30" : overdue ? "bg-rose-500/5 border-rose-500/30" : "bg-background"}`}>
                            <button onClick={() => togglePaid(inst)} className={inst.paid ? "text-emerald-600" : "text-muted-foreground hover:text-primary"}>
                              {inst.paid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                            </button>
                            <span className="font-medium w-6">#{inst.installment_number}</span>
                            <span className="flex-1">{new Date(inst.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                            <span className="tabular-nums font-semibold">{brl(Number(inst.amount))}</span>
                            {inst.paid && <span className="text-[10px] uppercase tracking-wider text-emerald-600">Pago</span>}
                            {overdue && <span className="text-[10px] uppercase tracking-wider text-rose-600">Atrasado</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Sum({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "primary" | "emerald" | "rose" }) {
  const tones: Record<string, string> = {
    muted: "bg-muted/40 text-foreground",
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    rose: "bg-rose-500/10 text-rose-600",
  };
  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}