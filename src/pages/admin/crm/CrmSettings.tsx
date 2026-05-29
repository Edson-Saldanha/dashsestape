import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

export default function CrmSettings() {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("settings")
        .select("crm_auto_send, crm_default_hour, crm_signature, crm_template_30, crm_template_60, crm_template_90, crm_template_6m, crm_template_1y")
        .eq("id", 1)
        .maybeSingle();
      const base: any = data || {};
      const { data: integ } = await (supabase as any).rpc("get_crm_integration");
      const row = Array.isArray(integ) ? integ[0] : integ;
      setS({ ...base, crm_webhook_url: row?.crm_webhook_url || "", crm_official_number: row?.crm_official_number || "" });
    })();
  }, []);
  if (!s) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  async function save() {
    const { error } = await supabase.from("settings").update({
      crm_auto_send: s.crm_auto_send, crm_default_hour: s.crm_default_hour,
      crm_signature: s.crm_signature,
      crm_template_30: s.crm_template_30, crm_template_60: s.crm_template_60, crm_template_90: s.crm_template_90,
      crm_template_6m: s.crm_template_6m, crm_template_1y: s.crm_template_1y,
    }).eq("id", 1);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    const { error: integErr } = await (supabase as any).rpc("update_crm_integration", {
      _webhook_url: s.crm_webhook_url || null,
      _official_number: s.crm_official_number || null,
    });
    if (integErr) return toast({ title: "Erro", description: integErr.message, variant: "destructive" });
    toast({ title: "Configurações salvas" });
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Configurações CRM / WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Templates e integração com API externa (Z-API, Evolution, WATI, Make, n8n, Take Blip, 360Dialog, Meta WhatsApp Cloud)</p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Integração API externa</h2>
        <div className="flex items-center justify-between">
          <div>
            <Label>Envio automático ativado</Label>
            <p className="text-xs text-muted-foreground">Se ativo, a rotina diária enviará os lembretes para o webhook configurado.</p>
          </div>
          <Switch checked={!!s.crm_auto_send} onCheckedChange={(v) => setS({ ...s, crm_auto_send: v })} />
        </div>
        <div>
          <Label>URL do webhook WhatsApp</Label>
          <Input value={s.crm_webhook_url || ""} onChange={e => setS({ ...s, crm_webhook_url: e.target.value })} placeholder="https://hook.make.com/... ou https://api.z-api.io/..." />
          <p className="text-xs text-muted-foreground mt-1">Cole o webhook da ferramenta escolhida.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Horário padrão de envio</Label><Input type="time" value={s.crm_default_hour || "09:00"} onChange={e => setS({ ...s, crm_default_hour: e.target.value })} /></div>
          <div><Label>Número oficial de atendimento</Label><Input value={s.crm_official_number || ""} onChange={e => setS({ ...s, crm_official_number: e.target.value })} placeholder="5551999999999" /></div>
        </div>
        <div>
          <Label>Assinatura padrão</Label>
          <Input value={s.crm_signature || ""} onChange={e => setS({ ...s, crm_signature: e.target.value })} />
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Templates de mensagem</h2>
        <p className="text-xs text-muted-foreground">Variáveis: <code>{"{{nome}}"}</code>, <code>{"{{equipamento}}"}</code>, <code>{"{{empresa}}"}</code>, <code>{"{{assinatura}}"}</code></p>
        {[
          { k: "crm_template_30", label: "30 dias" },
          { k: "crm_template_60", label: "60 dias" },
          { k: "crm_template_90", label: "90 dias" },
          { k: "crm_template_6m", label: "6 meses" },
          { k: "crm_template_1y", label: "1 ano" },
        ].map(t => (
          <div key={t.k}>
            <Label>Template {t.label}</Label>
            <Textarea rows={6} value={s[t.k] || ""} onChange={e => setS({ ...s, [t.k]: e.target.value })} />
          </div>
        ))}
      </Card>

      <Button onClick={save}>Salvar configurações</Button>
    </div>
  );
}