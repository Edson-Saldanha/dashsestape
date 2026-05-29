import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { DollarSign, TrendingUp, ShoppingBag, Receipt, Award, Wrench, Users, Target, Activity, Clock, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSalesData, computeStats } from "@/lib/useSalesData";
import { brl, num, pct } from "@/lib/format";
import StatCard from "@/components/dashboard/StatCard";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/useRole";
import { useCurrentEmployee } from "@/lib/useCurrentEmployee";

type Period = "dia" | "mes" | "custom";

export default function AdminDashboard() {
  const { sales, employees, settings, loading } = useSalesData();
  const { user } = useAuth();
  const { isOwner } = useRoles();
  const { isSellerOrTech } = useCurrentEmployee();
  const canSeeProfit = !isSellerOrTech;
  const [period, setPeriod] = useState<Period>("mes");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [applied, setApplied] = useState<{ from?: Date; to?: Date }>({});
  const goal = Number(settings?.monthly_goal || 0);
  const s = computeStats(sales, employees, goal);

  const { filteredSales, periodLabel } = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    let label = "";
    if (period === "dia") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start); end.setHours(23, 59, 59, 999);
      label = "hoje";
    } else if (period === "mes") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = "mês";
    } else if (applied.from && applied.to) {
      start = new Date(applied.from); start.setHours(0, 0, 0, 0);
      end = new Date(applied.to); end.setHours(23, 59, 59, 999);
      label = `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}`;
    }
    const list = start && end
      ? sales.filter(x => { const d = new Date(x.sale_date); return d >= start! && d <= end!; })
      : sales;
    return { filteredSales: list, periodLabel: label };
  }, [sales, period, applied]);

  const sumAmount = filteredSales.reduce((a, b) => a + Number(b.amount || 0), 0);
  const sumProfit = filteredSales.reduce((a, b) => a + Number(b.profit || 0), 0);
  const ticketAvg = filteredSales.length ? sumAmount / filteredSales.length : 0;
  const profitPct = sumAmount > 0 ? (sumProfit / sumAmount) * 100 : 0;
  const goalPct = goal > 0 ? (sumAmount / goal) * 100 : 0;

  if (loading) return <div className="p-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-4 lg:p-8 space-y-5 lg:space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-[10px] lg:text-xs uppercase tracking-widest text-primary font-semibold mb-1">Painel Administrativo</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Visão geral</h1>
          <p className="text-muted-foreground text-sm">Acompanhe o desempenho em tempo real</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-lg border bg-card p-1 shadow-elegant w-full lg:w-auto">
            {(["dia","mes","custom"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition ${period===p ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                {p === "dia" ? "Dia" : p === "mes" ? "Mês" : "Personalizado"}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {from ? format(from, "dd/MM/yyyy", { locale: ptBR }) : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={from} onSelect={setFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {to ? format(to, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={to} onSelect={setTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Button size="sm" disabled={!from || !to} onClick={() => setApplied({ from, to })}>
                Filtrar
              </Button>
            </div>
          )}
          <div className="hidden lg:flex text-right text-sm text-muted-foreground items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" /> Dados ao vivo
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
        {user && canSeeProfit && (
          <StatCard icon={TrendingUp} label="Lucro do dia" value={brl(s.profitToday)} accent="success" delay={0}
            trends={isOwner ? [{ label: "dia", value: s.trends.profitDay.day }] : undefined} />
        )}
        {user && canSeeProfit && (
          <StatCard icon={DollarSign} label={`Lucro (${periodLabel})`} value={brl(sumProfit)} accent="success" delay={0.05}
            trends={isOwner && period === "mes" ? [{ label: "mês", value: s.trends.profitMonth.month }] : undefined} />
        )}
        <StatCard icon={ShoppingBag} label="Vendas do dia" value={brl(s.salesToday)} delay={0.1}
          trends={isOwner ? [{ label: "dia", value: s.trends.salesDay.day }] : undefined} />
        <StatCard icon={ShoppingBag} label={`Vendas (${periodLabel})`} value={brl(sumAmount)} delay={0.15}
          trends={isOwner && period === "mes" ? [{ label: "mês", value: s.trends.salesMonth.month }] : undefined} />
        <StatCard icon={Receipt} label={`Lançamentos (${periodLabel})`} value={num(filteredSales.length)} delay={0.2} />
        <StatCard icon={Receipt} label="Ticket médio" value={brl(ticketAvg)} delay={0.25} />
        {user && canSeeProfit ? (
          <StatCard
            icon={TrendingUp}
            label={`% de lucro (${periodLabel})`}
            value={pct(profitPct)}
            hint={`${brl(sumProfit)} de ${brl(sumAmount)}`}
            accent="success"
            delay={0.3}
          />
        ) : (
          <StatCard icon={Users} label="Funcionários ativos" value={num(s.activeEmployees)} delay={0.3} />
        )}
        <StatCard icon={Target} label="Meta atingida" value={pct(goalPct)} accent="warning" delay={0.35} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-gradient-primary rounded-2xl p-5 lg:p-8 text-white shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -mr-20 -mt-20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5 lg:mb-6 gap-4">
              <div>
                <div className="text-[10px] lg:text-sm uppercase tracking-widest opacity-80 mb-1">Meta do mês</div>
                <div className="font-display text-2xl lg:text-4xl font-bold tabular">{brl(s.salesMonth)}</div>
                <div className="opacity-80 text-xs lg:text-sm">de {brl(goal)}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl lg:text-5xl font-bold tabular">{pct(s.goalPct)}</div>
                <div className="text-[10px] lg:text-xs uppercase tracking-widest opacity-80">atingido</div>
              </div>
            </div>
            <div className="h-3 rounded-full bg-white/20 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(s.goalPct, 100)}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-white rounded-full" />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          <Highlight icon={Award} label="Melhor vendedor (mês)" name={s.sellerMonth?.name} value={brl(s.sellerMonth?.amount || 0)} />
          <Highlight icon={Award} label="Melhor vendedor (dia)" name={s.sellerToday?.name} value={brl(s.sellerToday?.amount || 0)} />
          <Highlight icon={Wrench} label="Melhor técnico (mês)" name={s.techMonth?.name} value={brl(s.techMonth?.amount || 0)} />
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
        <div className="p-4 lg:p-6 border-b flex items-center justify-between gap-3">
          <h2 className="font-display text-base lg:text-xl font-bold truncate">Lançamentos</h2>
          <span className="text-xs lg:text-sm text-muted-foreground flex items-center gap-1.5 shrink-0"><Clock className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> tempo real</span>
        </div>
        <div className="divide-y">
          {filteredSales.slice(0, 12).map(sale => (
            <div key={sale.id} className="p-3 lg:p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition">
              <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
                <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold shrink-0 text-sm">
                  {sale.employee_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm lg:text-base truncate">{sale.employee_name}</div>
                  <div className="text-[11px] lg:text-xs text-muted-foreground truncate">{sale.product || sale.type} · {new Date(sale.sale_date).toLocaleString("pt-BR")}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold tabular text-primary text-sm lg:text-base">{brl(Number(sale.amount))}</div>
                {user && canSeeProfit && <div className="text-[11px] lg:text-xs text-emerald-600">+ {brl(Number(sale.profit))}</div>}
              </div>
            </div>
          ))}
          {filteredSales.length === 0 && <div className="p-12 text-center text-muted-foreground">Nenhum lançamento no período.</div>}
        </div>
      </div>
    </div>
  );
}

function Highlight({ icon: Icon, label, name, value }: any) {
  return (
    <div className="bg-card rounded-xl p-4 border shadow-elegant flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-gradient-primary text-white flex items-center justify-center shadow-glow">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="font-semibold truncate">{name || "—"}</div>
        <div className="text-xs text-primary tabular">{value}</div>
      </div>
    </div>
  );
}
