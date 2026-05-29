import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lembrete_id } = await req.json();
    if (!lembrete_id) return json({ error: "lembrete_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lembrete, error: lErr } = await supabase
      .from("lembretes_whatsapp").select("*").eq("id", lembrete_id).maybeSingle();
    if (lErr || !lembrete) return json({ error: "lembrete não encontrado" }, 404);

    const { data: cliente } = await supabase
      .from("customers").select("*").eq("id", lembrete.cliente_id).maybeSingle();
    if (!cliente) return json({ error: "cliente não encontrado" }, 404);

    const { data: settings } = await supabase.from("settings").select("crm_webhook_url").eq("id", 1).maybeSingle();
    const webhook = settings?.crm_webhook_url;
    if (!webhook) {
      return json({ error: "webhook não configurado", hint: "Configure em Configurações CRM" }, 400);
    }

    // Evitar duplicado no mesmo dia
    const today = new Date().toISOString().slice(0, 10);
    const { data: dup } = await supabase
      .from("mensagens_whatsapp").select("id")
      .eq("cliente_id", cliente.id)
      .gte("enviado_em", `${today}T00:00:00`)
      .limit(1);
    if (dup && dup.length > 0) {
      return json({ error: "Mensagem já enviada hoje para esse cliente", skipped: true }, 200);
    }

    const payload = {
      lembrete_id: lembrete.id,
      cliente_id: cliente.id,
      nome: cliente.name,
      telefone: cliente.phone,
      whatsapp: cliente.whatsapp || cliente.phone,
      equipamento: null as string | null,
      tipo_lembrete: lembrete.tipo_lembrete,
      mensagem: lembrete.mensagem,
      data_programada: lembrete.data_programada,
    };

    if (lembrete.manutencao_id) {
      const { data: m } = await supabase.from("manutencoes").select("equipamento").eq("id", lembrete.manutencao_id).maybeSingle();
      payload.equipamento = m?.equipamento || null;
    }

    try {
      const r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`webhook ${r.status}: ${await r.text()}`);

      await supabase.from("lembretes_whatsapp").update({
        status: "enviado",
        enviado_em: new Date().toISOString(),
        tentativa_envio: (lembrete.tentativa_envio || 0) + 1,
        erro_envio: null,
      }).eq("id", lembrete.id);

      await supabase.from("mensagens_whatsapp").insert({
        cliente_id: cliente.id,
        lembrete_id: lembrete.id,
        telefone: payload.whatsapp,
        mensagem: lembrete.mensagem,
        tipo_mensagem: "automatica",
        status_envio: "enviado",
        canal: "api",
      });

      return json({ ok: true });
    } catch (e) {
      const msg = (e as Error).message;
      await supabase.from("lembretes_whatsapp").update({
        status: "erro",
        erro_envio: msg,
        tentativa_envio: (lembrete.tentativa_envio || 0) + 1,
      }).eq("id", lembrete.id);
      return json({ error: msg }, 500);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}