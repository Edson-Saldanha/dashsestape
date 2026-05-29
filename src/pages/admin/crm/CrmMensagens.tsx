import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export default function CrmMensagens() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("mensagens_whatsapp").select("*, customers(id,name)").order("enviado_em", { ascending: false }).limit(500).then(({ data }) => setRows(data || []));
  }, []);
  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Mensagens WhatsApp</h1>
        <p className="text-sm text-muted-foreground">{rows.length} mensagens registradas</p>
      </div>
      <div className="space-y-2">
        {rows.map(m => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link to={`/admin/crm/clientes/${m.cliente_id}`} className="font-semibold hover:underline">{m.customers?.name || "Cliente"}</Link>
              <div className="text-xs text-muted-foreground">{new Date(m.enviado_em).toLocaleString("pt-BR")} • {m.canal} • {m.tipo_mensagem} • {m.status_envio}</div>
            </div>
            <div className="text-sm whitespace-pre-wrap mt-2">{m.mensagem}</div>
            {m.resposta_cliente && <div className="text-sm mt-2 p-2 bg-muted/40 rounded"><b>Resposta:</b> {m.resposta_cliente}</div>}
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma mensagem.</Card>}
      </div>
    </div>
  );
}