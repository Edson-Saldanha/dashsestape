import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ArrowLeft, Wrench, Bell, MessageSquare, Plus, Send, CalendarPlus } from "lucide-react";
import { brl } from "@/lib/format";
import { openWhatsApp, isValidBRPhone, STATUS_COLORS, STATUS_LABELS, LEMBRETE_LABELS, renderTemplate } from "@/lib/whatsapp";
import { toast } from "@/hooks/use-toast";

export default function CrmCustomerDetail() {
  const { id } = useParams();
  const [c, setC] = useState<any>(null);
  const [manut, setManut] = useState<any[]>([]);
  const [lemb, setLemb] = useState<any[]>([]);
  const [msgs, setMsgs] = useState<any[]>([]);

  const [manOpen, setManOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [remOpen, setRemOpen] = useState(false);

  async function load() {
    if (!id) return;
    const [a, b, d, e] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase.from("manutencoes").select("*").eq("cliente_id", id).order("data_atendimento", { ascending: false }),
      supabase.from("lembretes_whatsapp").select("*").eq("cliente_id", id).order("data_programada", { ascending: true }),
      supabase.from("mensagens_whatsapp").select("*").eq("cliente_id", id).order("enviado_em", { ascending: false }),
    ]);
    setC(a.data); setManut(b.data || []); setLemb(d.data || []); setMsgs(e.data || []);
  }
  useEffect(() => { load(); }, [id]);

  if (!c) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const totalGasto = manut.reduce((s, m) => s + (Number(m.valor_cobrado) || 0), 0);
  const proximos = lemb.filter(l => ["aguardando", "pronto_para_envio"].includes(l.status));

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <Link to="/admin/crm/clientes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {c.whatsapp && <div>WhatsApp: {c.whatsapp}</div>}
                {c.phone && <div>Telefone: {c.phone}</div>}
                {c.email && <div>E-mail: {c.email}</div>}
                {(c.address || c.bairro || c.city) && <div>{[c.address, c.bairro, c.city, c.state].filter(Boolean).join(", ")}</div>}
              </div>
            </div>
            <Badge variant="secondary">{c.status_cliente || "ativo"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={() => setManOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova manutenção</Button>
            <Button variant="outline" onClick={() => setWaOpen(true)}><Send className="h-4 w-4 mr-1" /> WhatsApp manual</Button>
            <Button variant="outline" onClick={() => setRemOpen(true)}><CalendarPlus className="h-4 w-4 mr-1" /> Agendar lembrete</Button>
          </div>
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Última visita</span><span className="font-semibold">{c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString("pt-BR") : "—"}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Atendimentos</span><span className="font-semibold">{manut.length}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Total gasto</span><span className="font-semibold">{brl(totalGasto)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Lembretes pendentes</span><span className="font-semibold">{proximos.length}</span></div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Wrench className="h-4 w-4" /> Histórico de manutenções</h2>
        {manut.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p> : (
          <div className="space-y-2">
            {manut.map(m => (
              <div key={m.id} className="border rounded-lg p-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{m.equipamento || "Equipamento"} {m.marca ? `— ${m.marca}` : ""} {m.modelo ? m.modelo : ""}</div>
                  <div className="text-xs text-muted-foreground">{new Date(m.data_atendimento).toLocaleString("pt-BR")} {m.responsavel_atendimento ? `• ${m.responsavel_atendimento}` : ""}</div>
                  {m.problema_relatado && <div className="text-sm mt-1"><b>Problema:</b> {m.problema_relatado}</div>}
                  {m.servico_realizado && <div className="text-sm"><b>Serviço:</b> {m.servico_realizado}</div>}
                </div>
                <div className="font-semibold">{brl(Number(m.valor_cobrado) || 0)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Bell className="h-4 w-4" /> Próximos lembretes</h2>
        {proximos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lembrete pendente.</p> : (
          <div className="space-y-2">
            {proximos.map(l => (
              <div key={l.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{LEMBRETE_LABELS[l.tipo_lembrete]} — {new Date(l.data_programada).toLocaleDateString("pt-BR")}</div>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded ${STATUS_COLORS[l.status]}`}>{STATUS_LABELS[l.status]}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  if (!isValidBRPhone(c.whatsapp || c.phone)) return toast({ title: "Telefone inválido", variant: "destructive" });
                  openWhatsApp(c.whatsapp || c.phone, l.mensagem || "");
                }}><Send className="h-4 w-4 mr-1" /> Enviar</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><MessageSquare className="h-4 w-4" /> Histórico de mensagens</h2>
        {msgs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma mensagem enviada.</p> : (
          <div className="space-y-2">
            {msgs.map(m => (
              <div key={m.id} className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{new Date(m.enviado_em).toLocaleString("pt-BR")} • {m.canal} • {m.tipo_mensagem}</div>
                <div className="text-sm whitespace-pre-wrap mt-1">{m.mensagem}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <NovaManutencaoDialog open={manOpen} onClose={() => { setManOpen(false); load(); }} clienteId={c.id} />
      <WhatsAppManualDialog open={waOpen} onClose={() => { setWaOpen(false); load(); }} cliente={c} />
      <NovoLembreteDialog open={remOpen} onClose={() => { setRemOpen(false); load(); }} cliente={c} />
    </div>
  );
}

function NovaManutencaoDialog({ open, onClose, clienteId }: any) {
  const [form, setForm] = useState<any>({ data_atendimento: new Date().toISOString().slice(0, 16), equipamento: "", marca: "", modelo: "", problema_relatado: "", servico_realizado: "", solucao_aplicada: "", valor_cobrado: 0, responsavel_atendimento: "", observacoes_internas: "" });
  const [employees, setEmployees] = useState<any[]>([]);
  useEffect(() => {
    if (!open) return;
    supabase.from("employees").select("id,name").eq("active", true).order("name").then(({ data }) => setEmployees(data || []));
  }, [open]);
  async function save() {
    const payload = { ...form, cliente_id: clienteId, data_atendimento: new Date(form.data_atendimento).toISOString(), valor_cobrado: Number(form.valor_cobrado) || 0 };
    const { error } = await supabase.from("manutencoes").insert(payload);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Manutenção cadastrada", description: "3 lembretes (30/60/90 dias) foram gerados automaticamente." });
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova manutenção</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Data de atendimento</Label><Input type="datetime-local" value={form.data_atendimento} onChange={e => setForm({ ...form, data_atendimento: e.target.value })} /></div>
          <div><Label>Responsável</Label>
            <Select value={form.responsavel_atendimento || ""} onValueChange={v => setForm({ ...form, responsavel_atendimento: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger>
              <SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Equipamento</Label><Input value={form.equipamento} onChange={e => setForm({ ...form, equipamento: e.target.value })} /></div>
          <div><Label>Marca</Label><Input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} /></div>
          <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} /></div>
          <div><Label>Valor cobrado</Label><CurrencyInput value={form.valor_cobrado} onValueChange={v => setForm({ ...form, valor_cobrado: v })} /></div>
          <div className="md:col-span-2"><Label>Problema relatado</Label><Textarea value={form.problema_relatado} onChange={e => setForm({ ...form, problema_relatado: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Serviço realizado</Label><Textarea value={form.servico_realizado} onChange={e => setForm({ ...form, servico_realizado: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Solução aplicada</Label><Textarea value={form.solucao_aplicada} onChange={e => setForm({ ...form, solucao_aplicada: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Observações internas</Label><Textarea value={form.observacoes_internas} onChange={e => setForm({ ...form, observacoes_internas: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Salvar manutenção</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WhatsAppManualDialog({ open, onClose, cliente }: any) {
  const [msg, setMsg] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [tpl, setTpl] = useState<string>("custom");
  const [ultimoEquip, setUltimoEquip] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTpl("custom");
    setMsg(`Olá ${cliente?.name}, tudo bem?`);
    (async () => {
      const [{ data: s }, { data: m }] = await Promise.all([
        supabase.from("settings").select("crm_template_30, crm_template_60, crm_template_90, crm_template_6m, crm_template_1y, crm_signature, company_name").eq("id", 1).maybeSingle(),
        supabase.from("manutencoes").select("equipamento").eq("cliente_id", cliente.id).order("data_atendimento", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setSettings(s);
      setUltimoEquip(m?.equipamento || "");
    })();
  }, [open, cliente]);

  function applyTemplate(key: string) {
    setTpl(key);
    if (key === "custom" || !settings) {
      setMsg(`Olá ${cliente?.name}, tudo bem?`);
      return;
    }
    const raw = settings[key] || "";
    const rendered = renderTemplate(raw, {
      nome: cliente?.name,
      equipamento: ultimoEquip || "equipamento",
      empresa: settings.company_name || "",
      assinatura: settings.crm_signature || "",
    });
    setMsg(rendered);
  }

  async function enviar() {
    if (!isValidBRPhone(cliente.whatsapp || cliente.phone)) return toast({ title: "Telefone inválido", variant: "destructive" });
    openWhatsApp(cliente.whatsapp || cliente.phone, msg);
    await supabase.from("mensagens_whatsapp").insert({ cliente_id: cliente.id, telefone: cliente.whatsapp || cliente.phone, mensagem: msg, tipo_mensagem: "manual", status_envio: "enviado", canal: "wa.me" });
    toast({ title: "WhatsApp aberto" });
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar WhatsApp manual</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Usar template</Label>
            <Select value={tpl} onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue placeholder="Mensagem livre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Mensagem livre</SelectItem>
                <SelectItem value="crm_template_30">Template 30 dias</SelectItem>
                <SelectItem value="crm_template_60">Template 60 dias</SelectItem>
                <SelectItem value="crm_template_90">Template 90 dias</SelectItem>
                <SelectItem value="crm_template_6m">Template 6 meses</SelectItem>
                <SelectItem value="crm_template_1y">Template 1 ano</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">As variáveis ({"{{nome}}, {{equipamento}}, {{empresa}}, {{assinatura}}"}) são preenchidas automaticamente.</p>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={8} value={msg} onChange={e => setMsg(e.target.value)} />
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={enviar}><Send className="h-4 w-4 mr-1" /> Abrir WhatsApp</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoLembreteDialog({ open, onClose, cliente }: any) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState("manual");
  const [msg, setMsg] = useState("");
  useEffect(() => { if (open) setMsg(`Olá ${cliente?.name}, passando para lembrar sobre seu atendimento.`); }, [open, cliente]);
  async function save() {
    const { error } = await supabase.from("lembretes_whatsapp").insert({ cliente_id: cliente.id, tipo_lembrete: tipo as any, data_programada: data, status: "aguardando", mensagem: msg });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Lembrete agendado" });
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agendar lembrete</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LEMBRETE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Data programada</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
          <div><Label>Mensagem</Label><Textarea rows={6} value={msg} onChange={e => setMsg(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Agendar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}