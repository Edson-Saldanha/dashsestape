import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserSquare, Phone, MapPin } from "lucide-react";

export default function CrmCustomers() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("customers").select("*").order("ultima_visita", { ascending: false, nullsFirst: false }).limit(500)
      .then(({ data }) => setRows(data || []));
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter(r =>
      (r.name || "").toLowerCase().includes(s) ||
      (r.phone || "").includes(s) ||
      (r.whatsapp || "").includes(s) ||
      (r.email || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Clientes CRM</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} clientes</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nome, telefone, e-mail..." className="pl-9" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(c => (
          <Link key={c.id} to={`/admin/crm/clientes/${c.id}`}>
            <Card className="p-4 hover:shadow-md transition h-full">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><UserSquare className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {c.whatsapp || c.phone || "Sem telefone"}</div>
                  {(c.city || c.bairro) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {[c.bairro, c.city].filter(Boolean).join(" • ")}</div>
                  )}
                  <div className="text-xs mt-2">
                    Última visita: <span className="font-medium">{c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString("pt-BR") : "—"}</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado.</Card>}
    </div>
  );
}