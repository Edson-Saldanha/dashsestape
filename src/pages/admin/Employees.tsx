import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, UserPlus, Power, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSalesData } from "@/lib/useSalesData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import PermissionsManager from "@/components/PermissionsManager";
import { useRoles } from "@/lib/useRole";
import { generateEmployeeEmail, EMPLOYEE_EMAIL_DOMAIN } from "@/lib/employeeEmail";

const roles = [
  { v: "vendedor", l: "Vendedor" },
  { v: "tecnico", l: "Técnico" },
  { v: "gestor", l: "Gestor" },
  { v: "financeiro", l: "Financeiro" },
  { v: "outro", l: "Outro" },
];

const sectors = [
  { v: "vendas", l: "Vendas" },
  { v: "ti_interno", l: "TI Interno" },
];

export default function Employees() {
  const { employees } = useSalesData();
  const { isAdmin } = useRoles();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("vendedor");
  const [sector, setSector] = useState("vendas");
  const [photo, setPhoto] = useState("");
  const [email, setEmail] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);

  const suggestedEmail = useMemo(() => generateEmployeeEmail(name), [name]);
  useEffect(() => {
    if (!emailEdited) setEmail(suggestedEmail);
  }, [suggestedEmail, emailEdited]);

  const resetForm = () => { setEditingId(null); setName(""); setRole("vendedor"); setSector("vendas"); setPhoto(""); setEmail(""); setEmailEdited(false); };

  const save = async () => {
    if (!name.trim()) return toast.error("Informe o nome");
    if (editingId) {
      const { error } = await supabase.from("employees")
        .update({ name, role: role as any, sector, photo_url: photo || null, email: email || null } as any)
        .eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Funcionário atualizado");
      logActivity("employee.updated", "employees", editingId, { name, email });
    } else {
      const finalEmail = email || generateEmployeeEmail(name);
      const { error } = await supabase.from("employees").insert({ name, role: role as any, sector, photo_url: photo || null, email: finalEmail || null } as any);
      if (error) return toast.error(error.message);
      toast.success("Funcionário cadastrado");
      logActivity("employee.created", "employees", undefined, { name, email: finalEmail });
    }
    setOpen(false);
    resetForm();
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setName(e.name);
    setRole(e.role);
    setSector((e as any).sector || "vendas");
    setPhoto(e.photo_url || "");
    setEmail(e.email || generateEmployeeEmail(e.name));
    setEmailEdited(!!e.email);
    setOpen(true);
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("employees").update({ active: !active }).eq("id", id);
    logActivity(active ? "employee.deactivated" : "employee.activated", "employees", id);
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir funcionário?")) return;
    await supabase.from("employees").delete().eq("id", id);
    logActivity("employee.deleted", "employees", id);
    toast.success("Removido");
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Equipe</div>
          <h1 className="font-display text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">Gerencie sua equipe comercial e técnica</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-primary text-white shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo funcionário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{editingId ? "Editar funcionário" : "Cadastrar funcionário"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome completo</Label><Input value={name} onChange={e=>setName(e.target.value)} /></div>
              <div>
                <Label>E-mail do funcionário</Label>
                <Input
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailEdited(true); }}
                  placeholder={`nome.sobrenome@${EMPLOYEE_EMAIL_DOMAIN}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gerado automaticamente a partir do nome. Você pode editar antes de salvar.
                </p>
              </div>
              <div><Label>Função</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map(r=><SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Setor responsável</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sectors.map(s=><SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>URL da foto (opcional)</Label><Input value={photo} onChange={e=>setPhoto(e.target.value)} placeholder="https://..." /></div>
              <Button onClick={save} className="w-full bg-gradient-primary text-white"><UserPlus className="h-4 w-4 mr-2" />{editingId ? "Atualizar" : "Salvar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {employees.map((e, i) => (
            <motion.div key={e.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl p-5 border shadow-elegant relative overflow-hidden group">
              <div className={`absolute top-3 right-3 h-2 w-2 rounded-full ${e.active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              <div className="flex items-center gap-3 mb-3">
                {e.photo_url ? (
                  <img src={e.photo_url} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-primary text-white font-display font-bold text-xl flex items-center justify-center shadow-glow">
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{e.name}</div>
                  <div className="text-xs text-primary uppercase tracking-wider">{roles.find(r=>r.v===e.role)?.l}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggle(e.id, e.active)} className="flex-1">
                  <Power className="h-3 w-3 mr-1" /> {e.active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {employees.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed">
            Nenhum funcionário cadastrado.
          </div>
        )}
      </div>

      {isAdmin && (
        <section className="bg-card rounded-2xl border shadow-elegant p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Permissões de Acesso</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Defina quais áreas do sistema cada usuário pode acessar. Administradores e proprietários sempre têm acesso total.
          </p>
          <PermissionsManager />
        </section>
      )}
    </div>
  );
}
