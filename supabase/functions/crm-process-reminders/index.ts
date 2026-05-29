import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);

  // Marca como pronto_para_envio
  const { data: due, error } = await supabase
    .from("lembretes_whatsapp")
    .update({ status: "pronto_para_envio" })
    .lte("data_programada", today)
    .eq("status", "aguardando")
    .select("id");

  if (error) return json({ error: error.message }, 500);

  // Se auto_send ativo, dispara envio
  const { data: settings } = await supabase.from("settings").select("crm_auto_send, crm_webhook_url").eq("id", 1).maybeSingle();
  let sent = 0; let failed = 0;
  if (settings?.crm_auto_send && settings?.crm_webhook_url && due) {
    const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-send-whatsapp`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    };
    for (const l of due) {
      try {
        const r = await fetch(base, { method: "POST", headers, body: JSON.stringify({ lembrete_id: l.id }) });
        if (r.ok) sent++; else failed++;
      } catch { failed++; }
    }
  }

  return json({ promoted: due?.length || 0, sent, failed });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}