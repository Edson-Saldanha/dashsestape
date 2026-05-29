import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send, ExternalLink, CheckCircle2, XCircle, MessageCircle, CalendarCheck, Pencil } from "lucide-react";
import { openWhatsApp, isValidBRPhone, STATUS_COLORS, STATUS_LABELS, LEMBRETE_LABELS } from "@/lib/whatsapp";
import { toast } from "@/hooks/use-toast";

type Filter = "hoje" | "amanha" | "semana" | "atrasados" | "proximos30" | "30_dias" | "60_dias" | "90_dias" | "enviados" | "erro" | "respondeu" | "agendou" | "todos";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "amanha", label: "Amanhã" },
  { key: "semana", label: "Esta semana" },
  { key: "atrasados", label: "Atrasados" },
  { key: "proximos30", label: "Próximos 30 dias" },
  { key: "30_dias", label: "Aviso 30d" },
  { key: "60_dias", label: "Aviso 60d" },
  { key: "90_dias", label: "Aviso 90d" },
  { key: "enviados", label: "Enviados" },
  { key: "erro", label: "Com erro" },
  { key: "respondeu", label: "Respondeu" },
  { key: "agendou", label: "Agendou" },
  { key: "todos", label: "Todos" },
];

export default function CrmLembretes() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get("filter") as Filter) || "hoje";
  const [rows, setRows] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState("");

  async function load() {
    const { data } = await supabase
      .from("lembretes_whatsapp")
      .select("*, customers(id,name,phone,whatsapp), manutencoes(equipamento, data_atendimento)")
      .order("data_programada", { ascending: true })
      .limit(500);
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tdStr = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const tmStr = tomorrow.toISOString().slice(0, 10);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
    const m30 = new Date(today); m30.setDate(today.getDate() + 30);

    return rows.filter(l => {
      const d = l.data_programada;
      switch (filter) {
        case "hoje": return d === tdStr && ["aguardando", "pronto_para_envio"].includes(l.status);
        case "amanha": return d === tmStr && ["aguardando", "pronto_para_envio"].includes(l.status);
        case "semana": return d >= tdStr && new Date(d) <= weekEnd && ["aguardando", "pronto_para_envio"].includes(l.status);
        case "atrasados": return d < tdStr && ["aguardando", "pronto_para_envio"].includes(l.status);
        case "proximos30": return d >= tdStr && new Date(d) <= m30;
        case "30_dias":
        case "60_dias":
        case "90_dias": return l.tipo_lembrete === filter;
        case "enviados": return l.status === "enviado";
        case "erro": return l.status === "erro";
        case "respondeu": return l.status === "respondeu";
        case "agendou": return l.status === "agendou";
        case "todos": return true;
      }
    });
  }, [rows, filter]);

  async function setStatus(id: string, status: string, extra: any = {}) {
    const { error } = await supabase.from("lembretes_whatsapp").update({ status: status as any, ...extra }).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  }

  async function enviar(l: any) {
    const phone = l.customers?.whatsapp || l.customers?.phone;
    if (!isValidBRPhone(phone)) return toast({ title: "Telefone inválido", variant: "destructive" });
    openWhatsApp(phone, l.mensagem || "");
    await supabase.from("mensagens_whatsapp").insert({ cliente_id: l.cliente_id, lembrete_id: l.id, telefone: phone, mensagem: l.mensagem || "", tipo_mensagem: "manual", status_envio: "enviado", canal: "wa.me" });
    await setStatus(l.id, "enviado", { enviado_em: new Date().toISOString(), tentativa_envio: (l.tentativa_envio || 0) + 1 });
  }

  async function saveMsg() {
    if (!editId) return;
    await supabase.from("lembretes_whatsapp").update({ mensagem: editMsg }).eq("id", editId);
    setEditId(null); load();
  }

  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Lembretes de WhatsApp</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} lembretes • filtro: {FILTERS.find(f => f.key === filter)?.label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setParams({ filter: f.key })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${filter === f.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(l => (
          <Card key={l.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/crm/clientes/${l.cliente_id}`} className="font-semibold hover:underline">{l.customers?.name || "Cliente"}</Link>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[l.status]}`}>{STATUS_LABELS[l.status]}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">{LEMBRETE_LABELS[l.tipo_lembrete]}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  WhatsApp: {l.customers?.whatsapp || l.customers?.phone || "—"}
                  {l.manutencoes?.equipamento ? ` • Equip.: ${l.manutencoes.equipamento}` : ""}
                  {l.manutencoes?.data_atendimento ? ` • Última manut.: ${new Date(l.manutencoes.data_atendimento).toLocaleDateString("pt-BR")}` : ""}
                </div>
                <div className="text-xs mt-1">Programado para: <b>{new Date(l.data_programada + "T00:00:00").toLocaleDateString("pt-BR")}</b></div>
                <div className="text-sm whitespace-pre-wrap mt-2 p-2 bg-muted/40 rounded border">{l.mensagem}</div>
              </div>
              <div className="flex flex-col gap-2 items-stretch min-w-[180px]">
                <Link to={`/admin/crm/clientes/${l.cliente_id}`}><Button variant="outline" size="sm" className="w-full"><ExternalLink className="h-4 w-4 mr-1" /> Ver cliente</Button></Link>
                <Button size="sm" onClick={() => enviar(l)}><Send className="h-4 w-4 mr-1" /> WhatsApp</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditId(l.id); setEditMsg(l.mensagem || ""); }}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
                <div className="grid grid-cols-2 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "enviado", { enviado_em: new Date().toISOString() })} title="Marcar enviado"><CheckCircle2 className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "respondeu", { respondido_em: new Date().toISOString() })} title="Respondeu"><MessageCircle className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "agendou", { agendado_em: new Date().toISOString() })} title="Agendou"><CalendarCheck className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "cancelado")} title="Cancelar"><XCircle className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhum lembrete neste filtro.</Card>}
      </div>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar mensagem</DialogTitle></DialogHeader>
          <Textarea rows={10} value={editMsg} onChange={e => setEditMsg(e.target.value)} />
          <DialogFooter><Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button><Button onClick={saveMsg}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}