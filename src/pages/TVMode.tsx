import { useEffect, useState } from "react";
import { useSalesData, computeStats } from "@/lib/useSalesData";
import { brl } from "@/lib/format";

export default function TVMode() {
  const { sales, employees, settings, loading } = useSalesData();
  const goal = Number(settings?.monthly_goal || 0);
  const s = computeStats(sales, employees, goal);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-2xl">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Painel TV</h1>
      <p className="text-muted-foreground text-lg">
        {now.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm mb-1">Vendas do Mês</p>
          <p className="text-3xl font-bold">{brl(s.totalSales)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm mb-1">Meta</p>
          <p className="text-3xl font-bold">{brl(goal)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm mb-1">Atingido</p>
          <p className="text-3xl font-bold">{goal > 0 ? `${Math.round((s.totalSales / goal) * 100)}%` : "-"}</p>
        </div>
      </div>
    </div>
  );
}
