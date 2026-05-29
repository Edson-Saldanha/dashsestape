import { useEffect, useState } from "react";
import { useSalesData } from "@/lib/useSalesData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export default function SettingsPage() {
  const { settings } = useSalesData();
  const { user } = useAuth();
  const [goal, setGoal] = useState("");
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [sounds, setSounds] = useState(true);
  const [newPwd, setNewPwd] = useState("");

  useEffect(() => {
    if (settings) {
      setGoal(String(settings.monthly_goal));
      setName(settings.company_name);
      setLogo(settings.logo_url || "");
      setSounds(settings.tv_sounds);
    }
  }, [settings]);

  const save = async () => {
    const { error } = await supabase.from("settings").update({
      monthly_goal: parseFloat(goal || "0"), company_name: name, logo_url: logo || null, tv_sounds: sounds
    }).eq("id", 1);
    if (error) toast.error(error.message); else { toast.success("Configurações salvas"); logActivity("settings.updated", "settings", "1", { monthly_goal: parseFloat(goal||"0") }); }
  };

  const updatePwd = async () => {
    if (newPwd.length < 6) return toast.error("Mínimo 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada"); setNewPwd(""); logActivity("auth.password_changed"); }
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Sistema</div>
        <h1 className="font-display text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Ajuste meta, identidade e preferências</p>
      </header>

      <div className="bg-card rounded-2xl border shadow-elegant p-6 space-y-4">
        <h3 className="font-display text-xl font-bold">Empresa & Meta</h3>
        <div><Label>Nome da empresa</Label><Input value={name} onChange={e=>setName(e.target.value)} /></div>
        <div><Label>Meta mensal (R$)</Label><CurrencyInput value={goal} onValueChange={v=>setGoal(String(v))} /></div>
        <div><Label>URL do Logo</Label><Input value={logo} onChange={e=>setLogo(e.target.value)} placeholder="https://..." /></div>
        <div className="flex items-center justify-between">
          <div><Label>Sons no Modo TV</Label><div className="text-sm text-muted-foreground">Toca som ao registrar nova venda</div></div>
          <Switch checked={sounds} onCheckedChange={setSounds} />
        </div>
        <Button onClick={save} className="bg-gradient-primary text-white"><Save className="h-4 w-4 mr-2" />Salvar</Button>
      </div>

      {user ? (
      <div className="bg-card rounded-2xl border shadow-elegant p-6 space-y-4">
        <h3 className="font-display text-xl font-bold">Senha do administrador</h3>
        <div><Label>Nova senha</Label><Input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} /></div>
        <Button onClick={updatePwd} variant="outline"><Lock className="h-4 w-4 mr-2" />Alterar senha</Button>
      </div>
      ) : null}
    </div>
  );
}
