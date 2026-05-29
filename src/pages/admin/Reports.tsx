import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, PieChart, Pie, Cell } from "recharts";
import { useSalesData } from "@/lib/useSalesData";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Receipt, Trophy, Download, Package, PieChart as PieIcon, Users, Clock, Percent } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ranges = [
  { v: "today", l: "Hoje" }, { v: "week", l: "Semana" },
  { v: "month", l: "Mês" }, { v: "year", l: "Ano" },
];

export default function Reports() {
  const { sales } = useSalesData();
  const [range, setRange] = useState("month");

  const filtered = useMemo(() => {
    const now = new Date();
    let start = new Date();
    if (range === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (range === "week") start = new Date(now.getTime() - 7 * 86400000);
    else if (range === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (range === "year") start = new Date(now.getFullYear(), 0, 1);
    return sales.filter(s => new Date(s.sale_date) >= start);
  }, [sales, range]);

  const byDay = useMemo(() => {
    const m: Record<string, { day: string; vendas: number; lucro: number }> = {};
    filtered.forEach(s => {
      const d = new Date(s.sale_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!m[d]) m[d] = { day: d, vendas: 0, lucro: 0 };
      m[d].vendas += Number(s.amount); m[d].lucro += Number(s.profit);
    });
    return Object.values(m).reverse();
  }, [filtered]);

  const ranking = useMemo(() => {
    const m: Record<string, { name: string; vendas: number; lucro: number; comissao: number }> = {};
    filtered.forEach(s => {
      if (!m[s.employee_name]) m[s.employee_name] = { name: s.employee_name, vendas: 0, lucro: 0, comissao: 0 };
      m[s.employee_name].vendas += Number(s.amount);
      m[s.employee_name].lucro += Number(s.profit);
      m[s.employee_name].comissao += Number((s as any).commission || 0);
    });
    return Object.values(m).sort((a,b)=>b.vendas-a.vendas).slice(0, 5);
  }, [filtered]);

  const totals = useMemo(() => {
    const vendas = filtered.reduce((s, x) => s + Number(x.amount), 0);
    const lucro = filtered.reduce((s, x) => s + Number(x.profit), 0);
    const comissao = filtered.reduce((s, x) => s + Number((x as any).commission || 0), 0);
    const ticket = filtered.length ? vendas / filtered.length : 0;
    const margem = vendas > 0 ? (lucro / vendas) * 100 : 0;
    return { vendas, lucro, comissao, ticket, count: filtered.length, margem };
  }, [filtered]);

  // ===== Mix por tipo (venda / serviço / lançamento) =====
  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(s => { m[s.type] = (m[s.type] || 0) + Number(s.amount); });
    const labels: Record<string, string> = { venda: "Vendas", servico: "Serviços", lancamento: "Lançamentos" };
    return Object.entries(m).map(([k, v]) => ({ name: labels[k] || k, value: v, key: k }));
  }, [filtered]);

  // ===== Top clientes =====
  const topCustomers = useMemo(() => {
    const m: Record<string, { name: string; total: number; qtd: number }> = {};
    filtered.forEach(s => {
      const name = ((s as any).customer_name || "").trim();
      if (!name) return;
      if (!m[name]) m[name] = { name, total: 0, qtd: 0 };
      m[name].total += Number(s.amount);
      m[name].qtd += 1;
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filtered]);

  // ===== Desempenho por dia da semana =====
  const byWeekday = useMemo(() => {
    const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const arr = names.map(n => ({ dia: n, vendas: 0, qtd: 0 }));
    filtered.forEach(s => {
      const d = new Date(s.sale_date).getDay();
      arr[d].vendas += Number(s.amount);
      arr[d].qtd += 1;
    });
    return arr;
  }, [filtered]);

  // ===== Curva ABC de produtos =====
  const abc = useMemo(() => {
    const m: Record<string, { name: string; vendas: number; lucro: number; qtd: number }> = {};
    filtered.forEach(s => {
      const key = (s.product || "Sem produto").trim() || "Sem produto";
      if (!m[key]) m[key] = { name: key, vendas: 0, lucro: 0, qtd: 0 };
      m[key].vendas += Number(s.amount);
      m[key].lucro += Number(s.profit);
      m[key].qtd += 1;
    });
    const list = Object.values(m).sort((a, b) => b.vendas - a.vendas);
    const total = list.reduce((s, x) => s + x.vendas, 0) || 1;
    let acc = 0;
    const classified = list.map(item => {
      acc += item.vendas;
      const cum = (acc / total) * 100;
      const share = (item.vendas / total) * 100;
      const curva = cum <= 80 ? "A" : cum <= 95 ? "B" : "C";
      return { ...item, share, cum, curva };
    });
    const counts = { A: 0, B: 0, C: 0 } as Record<"A"|"B"|"C", number>;
    const sums = { A: 0, B: 0, C: 0 } as Record<"A"|"B"|"C", number>;
    classified.forEach(c => { counts[c.curva as "A"|"B"|"C"]++; sums[c.curva as "A"|"B"|"C"] += c.vendas; });
    return { items: classified, total, counts, sums };
  }, [filtered]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const rangeLabel = ranges.find(r=>r.v===range)?.l || "";
    const totalVendas = filtered.reduce((s,x)=>s+Number(x.amount),0);
    const totalLucro = filtered.reduce((s,x)=>s+Number(x.profit),0);
    const totalComissao = filtered.reduce((s,x)=>s+Number((x as any).commission || 0),0);

    doc.setFontSize(18);
    doc.text("Relatório de Vendas", 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Período: ${rangeLabel}`, 14, 26);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 32);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Total de vendas: ${brl(totalVendas)}`, 14, 42);
    doc.text(`Lucro total: ${brl(totalLucro)}`, 14, 49);
    doc.text(`Comissão total: ${brl(totalComissao)}`, 14, 56);
    doc.text(`Lançamentos: ${filtered.length}`, 14, 63);

    doc.setFontSize(13);
    doc.text("Ranking de funcionários", 14, 77);
    autoTable(doc, {
      startY: 81,
      head: [["Funcionário", "Vendas", "Lucro", "Comissão"]],
      body: ranking.map(r => [r.name, brl(r.vendas), brl(r.lucro), brl(r.comissao)]),
      headStyles: { fillColor: [30, 64, 175] },
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.text("Lançamentos", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Data", "Funcionário", "Tipo", "Produto", "Valor", "Lucro", "Comissão"]],
      body: filtered.map(s => [
        new Date(s.sale_date).toLocaleString("pt-BR"),
        s.employee_name, s.type, s.product || "—",
        brl(Number(s.amount)), brl(Number(s.profit)), brl(Number((s as any).commission || 0)),
      ]),
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
    });

    doc.save(`relatorio-${range}.pdf`);
  };

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Análise</div>
          <h1 className="font-display text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Resumo do desempenho</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-card rounded-lg border p-1 flex">
            {ranges.map(r => (
              <button key={r.v} onClick={()=>setRange(r.v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${range===r.v?"bg-gradient-primary text-white shadow-glow":"text-muted-foreground hover:text-foreground"}`}>
                {r.l}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={exportPDF} className="gap-2"><Download className="h-4 w-4" />PDF</Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Vendas", value: brl(totals.vendas), icon: DollarSign, accent: "from-primary to-primary-glow" },
          { label: "Lucro", value: brl(totals.lucro), icon: TrendingUp, accent: "from-emerald-500 to-teal-400" },
          { label: "Margem", value: `${totals.margem.toFixed(1)}%`, icon: Percent, accent: "from-sky-500 to-cyan-400" },
          { label: "Ticket médio", value: brl(totals.ticket), icon: Receipt, accent: "from-violet-500 to-fuchsia-400" },
          { label: "Lançamentos", value: String(totals.count), icon: Trophy, accent: "from-amber-500 to-orange-400" },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
            className="relative overflow-hidden bg-card border rounded-2xl p-4 shadow-elegant">
            <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${k.accent} opacity-20 blur-2xl`} />
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </div>
            <div className="font-display text-2xl font-bold tabular mt-1">{k.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Combined chart */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
          className="lg:col-span-2 bg-card rounded-2xl p-5 border shadow-elegant">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold">Vendas & Lucro</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Vendas</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Lucro</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={byDay} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v:any)=>brl(Number(v))} contentStyle={{borderRadius:12,border:"1px solid hsl(var(--border))",background:"hsl(var(--card))"}} />
              <Area type="monotone" dataKey="vendas" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gVendas)" />
              <Bar dataKey="lucro" fill="hsl(160 84% 39%)" radius={[6,6,0,0]} barSize={14} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Ranking compacto */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
          className="bg-card rounded-2xl p-5 border shadow-elegant">
          <h3 className="font-display text-base font-bold mb-3">Top vendedores</h3>
          <div className="space-y-3">
            {ranking.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs ${i===0?"bg-gradient-primary text-white shadow-glow":"bg-muted text-foreground"}`}>{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{r.name}</span>
                    <span className="font-display tabular text-sm font-bold text-primary">{brl(r.vendas)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${(r.vendas/(ranking[0]?.vendas||1))*100}%`}}
                      transition={{duration:0.8,delay:i*0.05}} className="h-full bg-gradient-primary" />
                  </div>
                </div>
              </div>
            ))}
            {ranking.length===0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem dados.</div>}
          </div>
        </motion.div>
      </div>

      {/* Mix + Top clientes + Dia da semana */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Pie: mix por tipo */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
          className="bg-card rounded-2xl p-5 border shadow-elegant">
          <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2"><PieIcon className="h-4 w-4 text-primary" />Mix por tipo</h3>
          {byType.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {byType.map((entry, i) => {
                      const colors = ["hsl(var(--primary))", "hsl(160 84% 39%)", "hsl(38 92% 50%)"];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(v:any)=>brl(Number(v))} contentStyle={{borderRadius:12,border:"1px solid hsl(var(--border))",background:"hsl(var(--card))"}} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {byType.map((t, i) => {
                  const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500"];
                  const pct = totals.vendas ? (t.value / totals.vendas) * 100 : 0;
                  return (
                    <div key={t.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />{t.name}</span>
                      <span className="tabular font-medium">{brl(t.value)} <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span></span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* Top clientes */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.05}}
          className="bg-card rounded-2xl p-5 border shadow-elegant">
          <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Top clientes</h3>
          {topCustomers.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem clientes vinculados.</div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs ${i===0?"bg-gradient-primary text-white shadow-glow":"bg-muted"}`}>{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <span className="font-display tabular text-sm font-bold text-primary">{brl(c.total)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.qtd} {c.qtd === 1 ? "compra" : "compras"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Dia da semana */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
          className="bg-card rounded-2xl p-5 border shadow-elegant">
          <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Dia da semana</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={byWeekday} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v:any)=>brl(Number(v))} contentStyle={{borderRadius:12,border:"1px solid hsl(var(--border))",background:"hsl(var(--card))"}} />
              <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[6,6,0,0]} barSize={20} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Curva ABC */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
        className="bg-card rounded-2xl p-5 border shadow-elegant">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="font-display text-base font-bold flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Curva ABC de produtos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Classificação pelo faturamento (A: até 80% · B: 80–95% · C: 95–100%)</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {(["A","B","C"] as const).map(k => {
              const colors = {
                A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                B: "bg-amber-500/10 text-amber-600 border-amber-500/30",
                C: "bg-rose-500/10 text-rose-600 border-rose-500/30",
              }[k];
              const pct = abc.total ? (abc.sums[k] / abc.total) * 100 : 0;
              return (
                <div key={k} className={`px-3 py-1.5 rounded-lg border ${colors} font-medium`}>
                  <span className="font-bold">{k}</span> · {abc.counts[k]} itens · {pct.toFixed(0)}%
                </div>
              );
            })}
          </div>
        </div>

        {abc.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Sem produtos vendidos no período.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 w-12">#</th>
                  <th className="text-left px-3 py-2">Produto</th>
                  <th className="text-center px-3 py-2 w-16">Curva</th>
                  <th className="text-right px-3 py-2 w-20">Qtd</th>
                  <th className="text-right px-3 py-2 w-32">Faturamento</th>
                  <th className="text-right px-3 py-2 w-24">% Total</th>
                  <th className="text-right px-3 py-2 w-28">% Acumul.</th>
                </tr>
              </thead>
              <tbody>
                {abc.items.slice(0, 20).map((item, i) => {
                  const badge = {
                    A: "bg-emerald-500/15 text-emerald-600",
                    B: "bg-amber-500/15 text-amber-600",
                    C: "bg-rose-500/15 text-rose-600",
                  }[item.curva as "A"|"B"|"C"];
                  return (
                    <tr key={item.name} className="border-t hover:bg-muted/30 transition">
                      <td className="px-3 py-2 text-muted-foreground tabular">{i + 1}</td>
                      <td className="px-3 py-2 font-medium truncate max-w-0">{item.name}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-6 rounded-md text-xs font-bold ${badge}`}>{item.curva}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular">{item.qtd}</td>
                      <td className="px-3 py-2 text-right tabular font-semibold">{brl(item.vendas)}</td>
                      <td className="px-3 py-2 text-right tabular text-muted-foreground">{item.share.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right tabular text-muted-foreground">{item.cum.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {abc.items.length > 20 && (
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-t text-center">
                Mostrando 20 de {abc.items.length} produtos
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
