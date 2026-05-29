import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "sonner";
import {
  ArrowLeft, Save, ImagePlus, Printer, MessageCircle, CheckCircle2, RotateCcw,
  FileText, ClipboardCheck, History, ShoppingBag, Trash2, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import {
  EvaluationStatus, EVALUATION_STATUSES, EVAL_STATUS_LABEL, statusClasses, daysBetween,
} from "@/lib/evaluationStatus";
import { CATEGORY_OPTIONS, defectsFor } from "@/lib/evaluationCategories";
import { DefectChecklist } from "@/components/DefectChecklist";
import { formatCPF, formatPhoneBR } from "@/lib/cpf";
import sestapeLogo from "@/assets/sestape-logo.png";

const PAY_METHODS = ["Pix", "Dinheiro", "Transferência", "Cartão de crédito", "Cartão de débito", "Boleto", "A combinar"];

export default function ProductEvaluationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [ev, setEv] = useState<any>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [printMode, setPrintMode] = useState<null | "receipt" | "proposal">(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    supabase.from("employees").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setEmployees(data || []));
    supabase.from("settings").select("company_name, logo_url").eq("id", 1).maybeSingle()
      .then(({ data }) => setSettings(data));
  }, []);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: e }, { data: h }] = await Promise.all([
      supabase.from("product_evaluations").select("*").eq("id", id).maybeSingle(),
      supabase.from("product_evaluation_history").select("*").eq("evaluation_id", id).order("created_at", { ascending: false }),
    ]);
    setEv(e);
    setHist(h || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const update = (patch: any) => setEv((p: any) => ({ ...p, ...patch }));

  const save = async () => {
    if (!ev) return;
    setSaving(true);
    const { id: _id, evaluation_number, created_at, updated_at, status_changed_at, ...payload } = ev;
    const { error } = await supabase.from("product_evaluations").update(payload).eq("id", ev.id);
    setSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Salvo");
    load();
  };

  const changeStatus = async (newStatus: EvaluationStatus) => {
    const { error } = await supabase.from("product_evaluations").update({ status: newStatus }).eq("id", ev.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Etapa atualizada");
    load();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const { error } = await supabase.from("product_evaluation_history").insert({
      evaluation_id: ev.id,
      action: "comentario",
      notes: note.trim(),
      user_id: user?.id || null,
      user_email: user?.email || null,
    });
    if (error) { toast.error(error.message); return; }
    setNote("");
    setNoteOpen(false);
    load();
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${ev.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("product-evaluations").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("product-evaluations").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    if (!urls.length) return;
    const photos = [...(ev.photos || []), ...urls];
    const { error } = await supabase.from("product_evaluations").update({ photos }).eq("id", ev.id);
    if (error) toast.error(error.message);
    else { toast.success(`${urls.length} foto(s) anexada(s)`); load(); }
  };

  const removePhoto = async (url: string) => {
    const photos = (ev.photos || []).filter((p: string) => p !== url);
    await supabase.from("product_evaluations").update({ photos }).eq("id", ev.id);
    load();
  };

  const handlePrint = (mode: "receipt" | "proposal") => {
    setPrintMode(mode);
    setTimeout(() => { window.print(); setPrintMode(null); }, 100);
  };

  if (loading || !ev) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const cls = statusClasses(ev.status);
  const stagnantDays = daysBetween(ev.status_changed_at);

  return (
    <>
      {/* Layout normal — escondido durante print */}
      <div className="p-4 lg:p-8 space-y-4 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => nav("/admin/product-evaluations")}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-bold">Avaliação #{ev.evaluation_number}</h1>
              <div className="text-sm text-muted-foreground">{ev.customer_name}</div>
            </div>
            <Badge variant="outline" className={cls.badge + " ml-2"}>{EVAL_STATUS_LABEL[ev.status as EvaluationStatus]}</Badge>
            {stagnantDays > 7 && <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {stagnantDays} dias na mesma etapa</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={ev.status} onValueChange={(v) => changeStatus(v as EvaluationStatus)}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>{EVALUATION_STATUSES.map(s => <SelectItem key={s} value={s}>{EVAL_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}><FileText className="h-4 w-4 mr-1" /> Observação</Button>
            <Button variant="outline" size="sm" onClick={() => handlePrint("receipt")}><Printer className="h-4 w-4 mr-1" /> Recibo entrada</Button>
            <Button variant="outline" size="sm" onClick={() => handlePrint("proposal")}><FileText className="h-4 w-4 mr-1" /> Proposta</Button>
            <Button variant="outline" size="sm" disabled={!ev.customer_phone} onClick={() => openWhatsApp(ev.customer_phone, `Olá ${ev.customer_name}, sobre seu produto em avaliação #${ev.evaluation_number}...`)}>
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </Button>
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => changeStatus("comprado")}><ShoppingBag className="h-4 w-4" /> Comprar</Button>
            <Button size="sm" variant="outline" onClick={() => changeStatus("devolvido")}><RotateCcw className="h-4 w-4 mr-1" /> Devolver</Button>
          </div>
        </div>

        <Tabs defaultValue="cliente" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="produto">Produto</TabsTrigger>
            <TabsTrigger value="tecnica">Avaliação Técnica</TabsTrigger>
            <TabsTrigger value="negociacao">Negociação</TabsTrigger>
            <TabsTrigger value="historico"><History className="h-3.5 w-3.5 mr-1" /> Histórico</TabsTrigger>
          </TabsList>

          {/* Cliente */}
          <TabsContent value="cliente">
            <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nome"><Input value={ev.customer_name || ""} onChange={e => update({ customer_name: e.target.value })} /></Field>
              <Field label="Telefone / WhatsApp"><Input value={ev.customer_phone || ""} placeholder="(00) 00000-0000" inputMode="tel" onChange={e => update({ customer_phone: formatPhoneBR(e.target.value) })} /></Field>
              <Field label="CPF"><Input value={ev.customer_cpf || ""} placeholder="000.000.000-00" inputMode="numeric" onChange={e => update({ customer_cpf: formatCPF(e.target.value) })} /></Field>
              <Field label="Loja / Unidade"><Input value={ev.store_unit || ""} onChange={e => update({ store_unit: e.target.value })} /></Field>
              <Field label="Funcionário que recebeu">
                <Select value={ev.received_by_name || ""} onValueChange={v => update({ received_by_name: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Data de entrada"><Input type="datetime-local" value={ev.entry_date ? new Date(ev.entry_date).toISOString().slice(0, 16) : ""} onChange={e => update({ entry_date: new Date(e.target.value).toISOString() })} /></Field>
              <div className="md:col-span-2"><Field label="Observações do cliente"><Textarea rows={3} value={ev.customer_notes || ""} onChange={e => update({ customer_notes: e.target.value })} /></Field></div>
            </Card>
          </TabsContent>

          {/* Produto */}
          <TabsContent value="produto">
            <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Categoria">
                <Select value={ev.category || ""} onValueChange={(v) => update({ category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Marca"><Input value={ev.brand || ""} onChange={e => update({ brand: e.target.value })} /></Field>
              <Field label="Modelo"><Input value={ev.model || ""} onChange={e => update({ model: e.target.value })} /></Field>
              <Field label="Número de série"><Input value={ev.serial_number || ""} onChange={e => update({ serial_number: e.target.value })} /></Field>
              <Field label="Cor"><Input value={ev.color || ""} onChange={e => update({ color: e.target.value })} /></Field>
              <Field label="Estado visual"><Input value={ev.visual_condition || ""} onChange={e => update({ visual_condition: e.target.value })} /></Field>
              <div className="md:col-span-2"><Field label="Acessórios inclusos"><Input value={ev.accessories || ""} onChange={e => update({ accessories: e.target.value })} /></Field></div>
              <div className="flex items-center gap-2"><Switch checked={!!ev.has_box} onCheckedChange={v => update({ has_box: v })} /><Label>Acompanha caixa</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!ev.has_charger} onCheckedChange={v => update({ has_charger: v })} /><Label>Acompanha carregador</Label></div>
              <div className="md:col-span-2">
                <Field label="Defeitos informados pelo cliente">
                  <DefectChecklist
                    options={defectsFor(ev.category)}
                    value={ev.client_reported_defects || ""}
                    onChange={(v) => update({ client_reported_defects: v })}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Defeitos aparentes identificados">
                  <DefectChecklist
                    options={defectsFor(ev.category)}
                    value={ev.apparent_defects || ""}
                    onChange={(v) => update({ apparent_defects: v })}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Label className="mb-2 block">Fotos do produto</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(ev.photos || []).map((url: string) => (
                    <div key={url} className="relative group">
                      <img src={url} alt="" className="w-full h-32 object-cover rounded-lg border" />
                      <button onClick={() => removePhoto(url)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded p-1 opacity-0 group-hover:opacity-100 transition">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()} className="h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-accent">
                    <ImagePlus className="h-6 w-6 mb-1" /><span className="text-xs">Adicionar</span>
                  </button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Técnica */}
          <TabsContent value="tecnica">
            <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Técnico responsável"><Input value={ev.technician_name || ""} onChange={e => update({ technician_name: e.target.value })} /></Field>
              {techFieldsFor(ev.category).map((f) => {
                const val = f.column ? ev[f.column] : (ev.checklist || {})[f.key];
                const setVal = (v: string) => {
                  if (f.column) update({ [f.column]: v });
                  else update({ checklist: { ...(ev.checklist || {}), [f.key]: v } });
                };
                return (
                  <Field key={f.key} label={f.label}>
                    <StatusSelect value={val} onChange={setVal} options={f.kind === "state" ? STATE_OPTIONS : TEST_OPTIONS} />
                  </Field>
                );
              })}
              <div className="md:col-span-2"><Field label="Observações técnicas"><Textarea rows={3} value={ev.technical_notes || ""} onChange={e => update({ technical_notes: e.target.value })} /></Field></div>
              <Field label="Custo estimado de reparo"><CurrencyInput value={ev.estimated_repair_cost} onValueChange={(v) => update({ estimated_repair_cost: v })} /></Field>
              <Field label="Valor de mercado estimado"><CurrencyInput value={ev.estimated_market_value} onValueChange={(v) => update({ estimated_market_value: v })} /></Field>
              <Field label="Valor máximo recomendado"><CurrencyInput value={ev.max_purchase_value} onValueChange={(v) => update({ max_purchase_value: v })} /></Field>
              <Field label="Valor ofertado ao cliente"><CurrencyInput value={ev.offered_value} onValueChange={(v) => update({ offered_value: v })} /></Field>
            </Card>
          </TabsContent>

          {/* Negociação */}
          <TabsContent value="negociacao">
            <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Data da proposta"><Input type="datetime-local" value={ev.proposal_sent_at ? new Date(ev.proposal_sent_at).toISOString().slice(0, 16) : ""} onChange={e => update({ proposal_sent_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
              <Field label="Funcionário responsável">
                <Select value={ev.proposal_by_name || ""} onValueChange={v => update({ proposal_by_name: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor ofertado"><CurrencyInput value={ev.offered_value} onValueChange={(v) => update({ offered_value: v })} /></Field>
              <Field label="Resposta do cliente"><Input value={ev.client_response || ""} onChange={e => update({ client_response: e.target.value })} /></Field>
              <Field label="Valor final aprovado"><CurrencyInput value={ev.final_value} onValueChange={(v) => update({ final_value: v })} /></Field>
              <Field label="Forma de pagamento ao cliente">
                <Select value={ev.payment_method || ""} onValueChange={v => update({ payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a forma" /></SelectTrigger>
                  <SelectContent>
                    {PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2"><Field label="URL do comprovante de pagamento"><Input value={ev.payment_receipt_url || ""} onChange={e => update({ payment_receipt_url: e.target.value })} /></Field></div>
            </Card>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico">
            <Card className="p-4">
              <ol className="relative border-l ml-3 space-y-4">
                {hist.map(h => (
                  <li key={h.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {h.action === "criado" && "Avaliação criada"}
                        {h.action === "mudanca_status" && `Etapa: ${h.from_status ? EVAL_STATUS_LABEL[h.from_status as EvaluationStatus] : "—"} → ${EVAL_STATUS_LABEL[h.to_status as EvaluationStatus]}`}
                        {h.action === "comentario" && "Comentário"}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                      {h.user_email && <span className="text-xs text-muted-foreground">por {h.user_email}</span>}
                    </div>
                    {h.notes && <div className="text-sm text-muted-foreground mt-1">{h.notes}</div>}
                  </li>
                ))}
                {hist.length === 0 && <li className="text-sm text-muted-foreground ml-4">Sem histórico ainda.</li>}
              </ol>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar alterações"}</Button>
        </div>

        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar observação interna</DialogTitle></DialogHeader>
            <Textarea rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="Comentário..." />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancelar</Button>
              <Button onClick={addNote}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Print view */}
      {printMode && (
        <PrintDocument
          mode={printMode}
          ev={ev}
          company={settings?.company_name || "Sestape Store"}
          logoUrl={sestapeLogo}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function PrintDocument({
  mode, ev, company, logoUrl,
}: { mode: "receipt" | "proposal"; ev: any; company: string; logoUrl: string | null }) {
  const title = mode === "receipt" ? "Recibo de Entrada de Produto" : "Proposta de Compra";
  const now = new Date().toLocaleString("pt-BR");
  const Row = ({ label, value }: { label: string; value: any }) => (
    <tr>
      <td style={{ padding: "6px 10px", background: "#f3f4f6", fontWeight: 600, width: "32%", border: "1px solid #e5e7eb", verticalAlign: "top" }}>{label}</td>
      <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb", verticalAlign: "top" }}>{value || "—"}</td>
    </tr>
  );
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 14, fontWeight: 700, margin: "18px 0 8px", paddingBottom: 4, borderBottom: "2px solid #111", letterSpacing: 0.3, textTransform: "uppercase" }}>{children}</h2>
  );
  return (
    <div className="print-area" style={{ padding: 32, fontSize: 12, lineHeight: 1.45 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {logoUrl && <img src={logoUrl} alt={company} style={{ height: 56, objectFit: "contain" }} />}
          <div>
            <div style={{ fontSize: 11, color: "#555" }}>Documento emitido em {now}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#555" }}>Avaliação Nº <strong>#{ev.evaluation_number}</strong></div>
          <div style={{ fontSize: 11, color: "#555" }}>Status: {ev.status}</div>
        </div>
      </div>

      {/* Cliente */}
      <SectionTitle>Dados do Cliente</SectionTitle>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <tbody>
          <Row label="Nome" value={ev.customer_name} />
          <Row label="CPF" value={ev.customer_cpf} />
          <Row label="Telefone / WhatsApp" value={ev.customer_phone} />
          <Row label="Data de entrada" value={ev.entry_date ? new Date(ev.entry_date).toLocaleString("pt-BR") : null} />
          <Row label="Funcionário que recebeu" value={ev.received_by_name} />
        </tbody>
      </table>

      {/* Produto */}
      <SectionTitle>Dados do Produto</SectionTitle>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <tbody>
          <Row label="Categoria" value={ev.category} />
          <Row label="Marca / Modelo" value={[ev.brand, ev.model].filter(Boolean).join(" — ")} />
          <Row label="Cor" value={ev.color} />
          <Row label="Nº de série" value={ev.serial_number} />
          <Row label="Estado visual" value={ev.visual_condition} />
          <Row label="Acessórios" value={ev.accessories} />
          <Row label="Caixa / Carregador" value={`${ev.has_box ? "Com caixa" : "Sem caixa"} · ${ev.has_charger ? "Com carregador" : "Sem carregador"}`} />
        </tbody>
      </table>

      {/* Defeitos */}
      {(ev.client_reported_defects || ev.apparent_defects) && (
        <>
          <SectionTitle>Defeitos</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {ev.client_reported_defects && <Row label="Informados pelo cliente" value={ev.client_reported_defects} />}
              {ev.apparent_defects && <Row label="Aparentes (identificados)" value={ev.apparent_defects} />}
            </tbody>
          </table>
        </>
      )}

      {/* Proposta */}
      {mode === "proposal" && (
        <>
          <SectionTitle>Proposta Comercial</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              <Row label="Valor ofertado" value={<strong style={{ fontSize: 14 }}>{brl(ev.offered_value || 0)}</strong>} />
              {ev.final_value > 0 && <Row label="Valor final aprovado" value={<strong>{brl(ev.final_value)}</strong>} />}
              {ev.payment_method && <Row label="Forma de pagamento" value={ev.payment_method} />}
              {ev.proposal_by_name && <Row label="Responsável" value={ev.proposal_by_name} />}
              <Row label="Validade da proposta" value="7 dias a partir desta data" />
            </tbody>
          </table>
        </>
      )}

      {/* Observações */}
      {ev.customer_notes && (
        <>
          <SectionTitle>Observações</SectionTitle>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{ev.customer_notes}</p>
        </>
      )}

      {/* Termo */}
      <p style={{ marginTop: 18, fontSize: 11, color: "#444", textAlign: "justify" }}>
        {mode === "receipt"
          ? "Declaro que entreguei o produto descrito acima para fins de avaliação. Reconheço as condições visuais e os defeitos relatados registrados neste documento."
          : "Declaro estar ciente da proposta apresentada. O aceite desta proposta autoriza a empresa a finalizar a aquisição do produto nas condições acima."}
      </p>

      {/* Assinaturas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 60, textAlign: "center", fontSize: 12 }}>
        <div>
          <div style={{ borderTop: "1px solid #111", paddingTop: 6 }}>Assinatura do Cliente</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{ev.customer_name}</div>
        </div>
        <div>
          <div style={{ borderTop: "1px solid #111", paddingTop: 6 }}>Responsável — {company}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{ev.received_by_name || ev.proposal_by_name || ""}</div>
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 8, borderTop: "1px dashed #999", textAlign: "center", fontSize: 10, color: "#666" }}>
        {company} · Documento gerado pelo sistema em {now}
      </div>
    </div>
  );
}

const STATE_OPTIONS = ["Novo", "Usado", "Com Defeito"];
const TEST_OPTIONS = ["Funcionando", "Com Defeito", "Não Testado"];

type TechField = { key: string; label: string; kind: "state" | "test"; column?: string };

const TECH_FIELDS: Record<string, TechField[]> = {
  Smartphone: [
    { key: "battery_status", label: "Estado da bateria", kind: "state", column: "battery_status" },
    { key: "screen_status",  label: "Estado da tela",    kind: "state", column: "screen_status" },
    { key: "case_status",    label: "Estado da carcaça", kind: "state", column: "case_status" },
    { key: "charging_test",  label: "Teste de carregamento", kind: "test", column: "charging_test" },
    { key: "audio_test",     label: "Teste de áudio",    kind: "test", column: "audio_test" },
    { key: "camera_test",    label: "Teste de câmera",   kind: "test", column: "camera_test" },
    { key: "ports_test",     label: "Teste de portas / conexões", kind: "test", column: "ports_test" },
  ],
  Tablet: [
    { key: "battery_status", label: "Estado da bateria", kind: "state", column: "battery_status" },
    { key: "screen_status",  label: "Estado da tela",    kind: "state", column: "screen_status" },
    { key: "case_status",    label: "Estado da carcaça", kind: "state", column: "case_status" },
    { key: "charging_test",  label: "Teste de carregamento", kind: "test", column: "charging_test" },
    { key: "audio_test",     label: "Teste de áudio",    kind: "test", column: "audio_test" },
    { key: "camera_test",    label: "Teste de câmera",   kind: "test", column: "camera_test" },
    { key: "ports_test",     label: "Teste de portas / conexões", kind: "test", column: "ports_test" },
  ],
  Notebook: [
    { key: "battery_status", label: "Estado da bateria", kind: "state", column: "battery_status" },
    { key: "screen_status",  label: "Estado da tela",    kind: "state", column: "screen_status" },
    { key: "case_status",    label: "Estado da carcaça", kind: "state", column: "case_status" },
    { key: "charging_test",  label: "Teste de carregador / fonte", kind: "test", column: "charging_test" },
    { key: "audio_test",     label: "Teste de áudio",    kind: "test", column: "audio_test" },
    { key: "camera_test",    label: "Teste de webcam",   kind: "test", column: "camera_test" },
    { key: "keyboard_test",  label: "Teste de teclado",  kind: "test", column: "keyboard_test" },
    { key: "ports_test",     label: "Teste de portas / USB", kind: "test", column: "ports_test" },
  ],
  Computador: [
    { key: "case_status",    label: "Estado do gabinete", kind: "state", column: "case_status" },
    { key: "charging_test",  label: "Teste de fonte / ligar", kind: "test", column: "charging_test" },
    { key: "audio_test",     label: "Teste de áudio",    kind: "test", column: "audio_test" },
    { key: "ports_test",     label: "Portas USB / vídeo", kind: "test", column: "ports_test" },
    { key: "cooler_test",    label: "Coolers / ventoinhas", kind: "test" },
    { key: "boot_test",      label: "Boot / sistema",    kind: "test" },
  ],
  Console: [
    { key: "case_status",    label: "Estado do console", kind: "state", column: "case_status" },
    { key: "charging_test",  label: "Teste de fonte / ligar", kind: "test", column: "charging_test" },
    { key: "audio_test",     label: "Áudio / HDMI",      kind: "test", column: "audio_test" },
    { key: "ports_test",     label: "Portas / entradas de controle", kind: "test", column: "ports_test" },
    { key: "disc_reader",    label: "Leitor de disco",   kind: "test" },
    { key: "overheating",    label: "Aquecimento",       kind: "test" },
  ],
  "Controle / Joystick": [
    { key: "battery_status", label: "Estado da bateria", kind: "state", column: "battery_status" },
    { key: "case_status",    label: "Estado da carcaça", kind: "state", column: "case_status" },
    { key: "buttons_test",   label: "Teste de botões",   kind: "test" },
    { key: "analog_test",    label: "Teste de analógicos", kind: "test" },
    { key: "charging_test",  label: "Teste de carregamento", kind: "test", column: "charging_test" },
    { key: "connection_test",label: "Conexão (Bluetooth/fio)", kind: "test" },
  ],
  TV: [
    { key: "screen_status",  label: "Estado da tela",    kind: "state", column: "screen_status" },
    { key: "case_status",    label: "Estado da carcaça", kind: "state", column: "case_status" },
    { key: "audio_test",     label: "Teste de áudio",    kind: "test", column: "audio_test" },
    { key: "ports_test",     label: "Portas HDMI / USB", kind: "test", column: "ports_test" },
    { key: "remote_test",    label: "Controle remoto",   kind: "test" },
  ],
  Outros: [
    { key: "battery_status", label: "Estado da bateria", kind: "state", column: "battery_status" },
    { key: "case_status",    label: "Estado da carcaça", kind: "state", column: "case_status" },
    { key: "charging_test",  label: "Teste de ligar / carregamento", kind: "test", column: "charging_test" },
    { key: "audio_test",     label: "Teste de áudio",    kind: "test", column: "audio_test" },
    { key: "ports_test",     label: "Teste de portas / conexões", kind: "test", column: "ports_test" },
  ],
};

function techFieldsFor(category?: string | null): TechField[] {
  return TECH_FIELDS[category || ""] || TECH_FIELDS.Outros;
}

function StatusSelect({
  value,
  onChange,
  options,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}