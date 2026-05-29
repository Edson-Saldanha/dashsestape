import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrendItem { label: string; value: number; }
interface Props {
  icon: LucideIcon; label: string; value: string;
  hint?: string; accent?: "primary" | "success" | "warning";
  delay?: number;
  trends?: TrendItem[];
}
export default function StatCard({ icon: Icon, label, value, hint, accent = "primary", delay = 0, trends }: Props) {
  const colors = {
    primary: "from-primary to-primary-glow",
    success: "from-emerald-500 to-emerald-400",
    warning: "from-amber-500 to-amber-400",
  } as const;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="relative bg-card rounded-2xl p-3.5 lg:p-5 border shadow-elegant overflow-hidden group">
      <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br", colors[accent])} />
      <div className="flex items-start justify-between mb-2.5 lg:mb-4">
        <div className={cn("h-8 w-8 lg:h-10 lg:w-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br shadow-glow", colors[accent])}>
          <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
        </div>
      </div>
      <div className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 line-clamp-2 min-h-[2.2em] lg:min-h-0">{label}</div>
      <div className="font-display text-lg lg:text-2xl xl:text-3xl font-bold tabular leading-tight">{value}</div>
      {hint && <div className="text-[10px] lg:text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
      {trends && trends.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 justify-end">
          {trends.map((t) => {
            const up = t.value >= 0;
            return (
              <span
                key={t.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular",
                  up ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                )}
                title={`${t.label}: ${up ? "+" : ""}${t.value.toFixed(2)}%`}
              >
                <span className="text-[9px] leading-none">{up ? "▲" : "▼"}</span>
                {t.value.toFixed(2)}%
              </span>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
