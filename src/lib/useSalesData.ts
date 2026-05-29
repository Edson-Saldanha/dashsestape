import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Sale {
  id: string; employee_id: string | null; employee_name: string;
  type: "venda" | "servico" | "lancamento";
  amount: number; profit: number; commission: number; product: string | null;
  notes: string | null; sale_date: string; created_at: string;
}
export interface Employee {
  id: string; name: string; role: string; photo_url: string | null;
  active: boolean; created_at: string;
}
export interface Settings {
  id: number; monthly_goal: number; company_name: string;
  logo_url: string | null; tv_sounds: boolean; primary_color: string;
}

export function useSalesData() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [s, e, st] = await Promise.all([
      supabase.from("sales").select("*").order("sale_date", { ascending: false }),
      supabase.from("employees").select("*").order("created_at"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setSales((s.data as any) || []);
    setEmployees((e.data as any) || []);
    setSettings((st.data as any) || null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase.channel("rt-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { sales, employees, settings, loading, refresh };
}

export function computeStats(sales: Sale[], employees: Employee[], goal: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);

  const todays = sales.filter(s => new Date(s.sale_date) >= today);
  const months = sales.filter(s => new Date(s.sale_date) >= month);

  const sum = (a: Sale[], k: "amount" | "profit") => a.reduce((x, y) => x + Number(y[k] || 0), 0);

  const salesToday = sum(todays, "amount");
  const salesMonth = sum(months, "amount");
  const profitToday = sum(todays, "profit");
  const profitMonth = sum(months, "profit");
  const ticketAvg = months.length ? salesMonth / months.length : 0;

  // ===== Comparativos (dia anterior / semana anterior / mês anterior) =====
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - today.getDay());
  const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const between = (start: Date, end: Date) =>
    sales.filter(s => { const d = new Date(s.sale_date); return d >= start && d < end; });

  const yest = between(yesterday, today);
  const weekNow = between(weekStart, now);
  const weekPrev = between(prevWeekStart, weekStart);
  const monthPrev = between(prevMonthStart, month);

  const delta = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  const trends = {
    salesDay:   { day: delta(salesToday, sum(yest, "amount")) },
    profitDay:  { day: delta(profitToday, sum(yest, "profit")) },
    salesMonth: {
      week:  delta(sum(weekNow, "amount"), sum(weekPrev, "amount")),
      month: delta(salesMonth, sum(monthPrev, "amount")),
    },
    profitMonth: {
      week:  delta(sum(weekNow, "profit"), sum(weekPrev, "profit")),
      month: delta(profitMonth, sum(monthPrev, "profit")),
    },
  };

  const ranking = (list: Sale[]) => {
    const m: Record<string, { name: string; amount: number; profit: number; count: number }> = {};
    list.forEach(s => {
      const k = s.employee_name;
      if (!m[k]) m[k] = { name: k, amount: 0, profit: 0, count: 0 };
      m[k].amount += Number(s.amount); m[k].profit += Number(s.profit); m[k].count++;
    });
    return Object.values(m).sort((a, b) => b.amount - a.amount);
  };

  const rankToday = ranking(todays);
  const rankMonth = ranking(months);

  const empByName = (n: string) => employees.find(e => e.name === n);
  const sellerToday = rankToday.find(r => empByName(r.name)?.role === "vendedor") || rankToday[0];
  const sellerMonth = rankMonth.find(r => empByName(r.name)?.role === "vendedor") || rankMonth[0];
  const techMonth = rankMonth.find(r => empByName(r.name)?.role === "tecnico");

  return {
    salesToday, salesMonth, profitToday, profitMonth,
    countToday: todays.length, countMonth: months.length,
    ticketAvg, rankToday, rankMonth, sellerToday, sellerMonth, techMonth,
    activeEmployees: employees.filter(e => e.active).length,
    goalPct: goal > 0 ? (salesMonth / goal) * 100 : 0,
    lastSale: sales[0],
    trends,
  };
}
