import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import { openWhatsApp, isValidBRPhone, LEMBRETE_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/whatsapp";
import {
  Users, Wrench, Bell, AlertTriangle, Send, MessageSquare, CalendarCheck,
  TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles, Plus, Settings, Trophy,
} from "lucide-react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const FUNNEL_COLORS = ["hsl(var(--muted-foreground))", "#f59e0b", "#3b82f6", "#10b981", "#22c55e", "#ef4444"];

type Stats = {
  clientes: number; clientesAnt: number;
  manutMes: number; manutAnt: number;
  receitaMes: number; receitaAnt: number;
  lembretesHoje: number; atrasados: number;
  msgsMes: number;
  respondeu: number; agendou: number; enviados: number;
  taxaRetorno: number;
  receitaRecorrente: number;
};

function delta(curr: number, prev: number) {
  if (!prev && !curr) return { pct: 0, up: true };
  if (!prev) return { pct: 100, up: true };
  const d = ((curr - prev) / prev) * 100;
  return { pct: Math.abs(Math.round(d)), up: d >= 0 };
}

function Kpi({ icon: Icon, label, value, hint, trend, to, accent }: any) {
  const inner = (
    <Card className="relative overflow-hidden p-5 h-full hover:shadow-lg transition border-l-4" style={{ borderLeftColor: accent }}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3 relative">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-3xl font-bold mt-2 leading-none">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-2">{hint}</div>}
          {trend && (
            <div className={`inline-flex items-center gap-1 text-xs font-medium mt-2 ${trend.up ? "text-emerald-600" : "text-red-600"}`}>
              {trend.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.pct}% vs mês ant.
            </div>
          )}
        </div>
        <div className="p-2.5 rounded-xl text-white shrink-0" style={{ background: accent }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function CrmDashboard() {
  const [stats, setStats] = useState<Stats>({
    clientes: 0, clientesAnt: 0,
    manutMes: 0, manutAnt: 0,
    receitaMes: 0, receitaAnt: 0,
    lembretesHoje: 0, atrasados: 0,
    msgsMes: 0,
    respondeu: 0, agendou: 0, enviados: 0,
    taxaRetorno: 0,
    receitaRecorrente: 0,
  });
  const [trend, setTrend] = useState<Array<{ mes: string; manutencoes: number; receita: number }>>([]);
  const [funnel, setFunnel] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [proximos, setProximos] = useState<any[]>([]);
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const next7 = new Date(); next7.setDate(now.getDate() + 7);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      cli, cliAnt, mm, mmAnt, lh, lat, msgs,
      aguard, prontos, enviadosQ, respondeuQ, agendouQ, naoResp, erroQ,
      mAll, manutAtual, manutAnterior, lembList, manRecentes, customersAll,
    ] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("customers").select("id", { count: "exact", head: true }).lt("created_at", monthStart.toISOString()),
      supabase.from("manutencoes").select("id", { count: "exact", head: true }).gte("data_atendimento", monthStart.toISOString()),
      supabase.from("manutencoes").select("id", { count: "exact", head: true })
        .gte("data_atendimento", lastMonthStart.toISOString()).lte("data_atendimento", lastMonthEnd.toISOString()),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("data_programada", today).in("status", ["aguardando", "pronto_para_envio"]),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).lt("data_programada", today).in("status", ["aguardando", "pronto_para_envio"]),
      supabase.from("mensagens_whatsapp").select("id", { count: "exact", head: true }).gte("enviado_em", monthStart.toISOString()),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("status", "aguardando"),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("status", "pronto_para_envio"),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("status", "enviado"),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("status", "respondeu"),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("status", "agendou"),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("status", "nao_respondeu"),
      supabase.from("lembretes_whatsapp").select("id", { count: "exact", head: true }).eq("status", "erro"),
      supabase.from("manutencoes").select("cliente_id, valor_cobrado, data_atendimento").gte("data_atendimento", sixMonthsAgo.toISOString()),
      supabase.from("manutencoes").select("valor_cobrado").gte("data_atendimento", monthStart.toISOString()),
      supabase.from("manutencoes").select("valor_cobrado").gte("data_atendimento", lastMonthStart.toISOString()).lte("data_atendimento", lastMonthEnd.toISOString()),
      supabase.from("lembretes_whatsapp").select("id, cliente_id, tipo_lembrete, data_programada, status, mensagem").gte("data_programada", today).lte("data_programada", next7.toISOString().slice(0, 10)).in("status", ["aguardando", "pronto_para_envio"]).order("data_programada").limit(8),
      supabase.from("manutencoes").select("id, cliente_id, equipamento, data_atendimento, valor_cobrado, servico_realizado").order("data_atendimento", { ascending: false }).limit(6),
      supabase.from("customers").select("id, name, whatsapp, phone"),
    ]);

    // Trend (últimos 6 meses)
    const buckets: Record<string, { manutencoes: number; receita: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[k] = { manutencoes: 0, receita: 0 };
    }
    (mAll.data || []).forEach((r: any) => {
      const d = new Date(r.data_atendimento);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets[k]) {
        buckets[k].manutencoes += 1;
        buckets[k].receita += Number(r.valor_cobrado) || 0;
      }
    });
    const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    setTrend(Object.entries(buckets).map(([k, v]) => ({
      mes: MESES[parseInt(k.split("-")[1], 10) - 1],
      manutencoes: v.manutencoes,
      receita: v.receita,
    })));

    // Funnel
    setFunnel([
      { name: "Aguardando", value: aguard.count || 0, color: FUNNEL_COLORS[0] },
      { name: "Pronto p/ envio", value: prontos.count || 0, color: FUNNEL_COLORS[1] },
      { name: "Enviado", value: enviadosQ.count || 0, color: FUNNEL_COLORS[2] },
      { name: "Respondeu", value: respondeuQ.count || 0, color: FUNNEL_COLORS[3] },
      { name: "Agendou", value: agendouQ.count || 0, color: FUNNEL_COLORS[4] },
      { name: "Não respondeu / Erro", value: (naoResp.count || 0) + (erroQ.count || 0), color: FUNNEL_COLORS[5] },
    ]);

    // Top clientes (mais gastaram nos últimos 6 meses)
    const cMap = new Map((customersAll.data || []).map((c: any) => [c.id, c]));
    const totals: Record<string, { total: number; count: number }> = {};
    (mAll.data || []).forEach((r: any) => {
      totals[r.cliente_id] = totals[r.cliente_id] || { total: 0, count: 0 };
      totals[r.cliente_id].total += Number(r.valor_cobrado) || 0;
      totals[r.cliente_id].count += 1;
    });
    setTopClientes(Object.entries(totals)
      .sort((a, b) => b[1].total - a[1].total).slice(0, 5)
      .map(([id, v]) => ({ id, total: v.total, count: v.count, cliente: cMap.get(id) }))
      .filter(x => x.cliente));

    // Próximos lembretes - enrich com cliente
    setProximos((lembList.data || []).map((l: any) => ({ ...l, cliente: cMap.get(l.cliente_id) })));

    // Recentes
    setRecentes((manRecentes.data || []).map((m: any) => ({ ...m, cliente: cMap.get(m.cliente_id) })));

    // Receita recorrente
    let receitaRec = 0;
    const grouped: Record<string, number[]> = {};
    (mAll.data || []).forEach((r: any) => {
      grouped[r.cliente_id] = grouped[r.cliente_id] || [];
      grouped[r.cliente_id].push(Number(r.valor_cobrado) || 0);
    });
    Object.values(grouped).forEach((arr) => { if (arr.length >= 2) receitaRec += arr.reduce((a, b) => a + b, 0); });

    const receitaMes = (manutAtual.data || []).reduce((s: number, r: any) => s + (Number(r.valor_cobrado) || 0), 0);
    const receitaAnt = (manutAnterior.data || []).reduce((s: number, r: any) => s + (Number(r.valor_cobrado) || 0), 0);
    const totalEnviados = (enviadosQ.count || 0) + (respondeuQ.count || 0) + (agendouQ.count || 0) + (naoResp.count || 0);
    const respondidos = (respondeuQ.count || 0) + (agendouQ.count || 0);
    const taxa = totalEnviados ? (respondidos / totalEnviados) * 100 : 0;

    setStats({
      clientes: cli.count || 0, clientesAnt: cliAnt.count || 0,
      manutMes: mm.count || 0, manutAnt: mmAnt.count || 0,
      receitaMes, receitaAnt,
      lembretesHoje: lh.count || 0, atrasados: lat.count || 0,
      msgsMes: msgs.count || 0,
      respondeu: respondeuQ.count || 0, agendou: agendouQ.count || 0, enviados: totalEnviados,
      taxaRetorno: Number(taxa.toFixed(1)),
      receitaRecorrente: receitaRec,
    });
  }

  const trendCli = useMemo(() => delta(stats.clientes, stats.clientesAnt), [stats]);
  const trendMan = useMemo(() => delta(stats.manutMes, stats.manutAnt), [stats]);
  const trendRec = useMemo(() => delta(stats.receitaMes, stats.receitaAnt), [stats]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-6 lg:p-8 bg-gradient-to-br from-primary via-primary to-blue-600 text-primary-foreground">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest opacity-90 mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Painel de retenção
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tight">CRM Pós-venda</h1>
            <p className="text-sm opacity-90 mt-1 max-w-xl">
              Acompanhe retorno de clientes, manutenções e o desempenho dos lembretes automáticos de WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/crm/manutencoes"><Button variant="secondary"><Plus className="h-4 w-4 mr-1" /> Nova manutenção</Button></Link>
            <Link to="/admin/crm/lembretes?filter=hoje"><Button variant="secondary"><Bell className="h-4 w-4 mr-1" /> Lembretes de hoje</Button></Link>
            <Link to="/admin/crm/configuracoes"><Button variant="ghost" className="text-primary-foreground hover:bg-white/10"><Settings className="h-4 w-4 mr-1" /> Configurar</Button></Link>
          </div>
        </div>
      </div>

      {/* Alert atrasados */}
      {stats.atrasados > 0 && (
        <Link to="/admin/crm/lembretes?filter=atrasados">
          <Card className="p-4 border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20 flex items-center gap-3 hover:shadow transition">
            <div className="p-2 rounded-lg bg-red-500 text-white"><AlertTriangle className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="font-semibold text-red-900 dark:text-red-200">Você tem {stats.atrasados} lembrete{stats.atrasados > 1 ? "s" : ""} atrasado{stats.atrasados > 1 ? "s" : ""}</div>
              <div className="text-xs text-red-700/80 dark:text-red-300/80">Clique para revisar e enviar antes que o cliente esqueça.</div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-red-600" />
          </Card>
        </Link>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Clientes" value={stats.clientes} trend={trendCli} accent="#6366f1" to="/admin/crm/clientes" />
        <Kpi icon={Wrench} label="Manutenções no mês" value={stats.manutMes} trend={trendMan} accent="#0ea5e9" to="/admin/crm/manutencoes" />
        <Kpi icon={TrendingUp} label="Receita do mês" value={brl(stats.receitaMes)} trend={trendRec} accent="#10b981" hint={`Recorrente 6m: ${brl(stats.receitaRecorrente)}`} />
        <Kpi icon={CalendarCheck} label="Taxa de retorno" value={`${stats.taxaRetorno}%`} accent="#f59e0b" hint={`${stats.respondeu + stats.agendou} de ${stats.enviados} enviados`} />
      </div>

      {/* KPIs operacionais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Bell} label="Lembretes hoje" value={stats.lembretesHoje} accent="#8b5cf6" to="/admin/crm/lembretes?filter=hoje" />
        <Kpi icon={AlertTriangle} label="Atrasados" value={stats.atrasados} accent="#ef4444" to="/admin/crm/lembretes?filter=atrasados" />
        <Kpi icon={Send} label="Mensagens no mês" value={stats.msgsMes} accent="#06b6d4" to="/admin/crm/mensagens" />
        <Kpi icon={MessageSquare} label="Agendaram retorno" value={stats.agendou} accent="#22c55e" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Evolução — últimos 6 meses</h2>
              <p className="text-xs text-muted-foreground">Atendimentos realizados x receita gerada</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v: any, n: string) => n === "receita" ? brl(Number(v)) : v} contentStyle={{ borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="manutencoes" name="Manutenções" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Area yAxisId="right" type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} fill="url(#recGrad)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-1">Funil de lembretes</h2>
          <p className="text-xs text-muted-foreground mb-3">Status atual de todos os lembretes</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={funnel.filter(f => f.value > 0)} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {funnel.filter(f => f.value > 0).map((f, i) => <Cell key={i} fill={f.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {funnel.map(f => (
              <div key={f.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} />{f.name}</span>
                <span className="font-semibold">{f.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Próximos lembretes */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Próximos 7 dias</h2>
              <p className="text-xs text-muted-foreground">Lembretes programados</p>
            </div>
            <Link to="/admin/crm/lembretes"><Button size="sm" variant="ghost">Ver todos</Button></Link>
          </div>
          {proximos.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Nenhum lembrete nos próximos 7 dias.</div>
          ) : (
            <div className="space-y-2">
              {proximos.map(l => (
                <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent/40 transition">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.cliente?.name || "Cliente"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{LEMBRETE_LABELS[l.tipo_lembrete]}</Badge>
                      {new Date(l.data_programada).toLocaleDateString("pt-BR")}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[l.status]}`}>{STATUS_LABELS[l.status]}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const phone = l.cliente?.whatsapp || l.cliente?.phone;
                    if (!isValidBRPhone(phone)) return;
                    openWhatsApp(phone, l.mensagem || "");
                  }}><Send className="h-3.5 w-3.5 mr-1" /> Enviar</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top clientes */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Top clientes</h2>
              <p className="text-xs text-muted-foreground">Maior receita em 6 meses</p>
            </div>
          </div>
          {topClientes.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Sem dados ainda.</div>
          ) : (
            <div className="space-y-2">
              {topClientes.map((t, i) => (
                <Link key={t.id} to={`/admin/crm/clientes/${t.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/40 transition">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-slate-200 text-slate-700" :
                    i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                  }`}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.cliente?.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.count} atendimento{t.count > 1 ? "s" : ""}</div>
                  </div>
                  <div className="font-semibold text-sm">{brl(t.total)}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Atividade recente */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Atividade recente</h2>
          <Link to="/admin/crm/manutencoes"><Button size="sm" variant="ghost">Ver tudo</Button></Link>
        </div>
        {recentes.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Nenhuma manutenção registrada ainda.</div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-3">
              {recentes.map(r => (
                <div key={r.id} className="relative pl-9">
                  <span className="absolute left-1.5 top-2 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <Link to={`/admin/crm/clientes/${r.cliente_id}`} className="block rounded-lg border p-3 hover:bg-accent/40 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.cliente?.name || "Cliente"} <span className="text-muted-foreground font-normal">— {r.equipamento || "equipamento"}</span></div>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(r.data_atendimento).toLocaleString("pt-BR")}</div>
                        {r.servico_realizado && <div className="text-xs mt-1 line-clamp-1">{r.servico_realizado}</div>}
                      </div>
                      <div className="font-semibold text-emerald-600">{brl(Number(r.valor_cobrado) || 0)}</div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}