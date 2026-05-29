import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSystemModules } from "@/lib/usePermissions";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface Profile { id: string; email: string | null; full_name: string | null; display_name: string | null; }
interface Employee { id: string; name: string; active: boolean; email: string | null; }
interface UserOption {
  key: string;
  label: string;
  hint?: string;
  userId: string | null;
}

const normalizeText = (value: string | null | undefined) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const profileMatchesEmployee = (profile: Profile, employee: Employee) => {
  if (employee.email && profile.email && normalizeText(employee.email) === normalizeText(profile.email)) {
    return true;
  }
  const employeeName = normalizeText(employee.name);
  if (!employeeName) return false;

  const candidates = [
    profile.display_name,
    profile.full_name,
    profile.email?.split("@")[0] || null,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return candidates.some((candidate) => (
    candidate === employeeName ||
    candidate.startsWith(`${employeeName} `) ||
    employeeName.startsWith(`${candidate} `)
  ));
};

export default function PermissionsManager() {
  const { modules } = useSystemModules();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id,email,full_name,display_name").order("created_at"),
      supabase.from("employees").select("id,name,active,email").order("name"),
    ]).then(([profilesResult, employeesResult]) => {
      if (profilesResult.error) toast.error(profilesResult.error.message);
      if (employeesResult.error) toast.error(employeesResult.error.message);

      const profiles = (profilesResult.data as Profile[] | null) || [];
      const employees = (employeesResult.data as Employee[] | null) || [];
      const matchedProfileIds = new Set<string>();

      const employeeOptions: UserOption[] = employees.map((employee) => {
        const matchedProfile = profiles.find((profile) => profileMatchesEmployee(profile, employee));
        if (matchedProfile) matchedProfileIds.add(matchedProfile.id);

        return {
          key: matchedProfile ? `profile:${matchedProfile.id}` : `employee:${employee.id}`,
          label: employee.email ? `${employee.name} (${employee.email})` : employee.name,
          hint: matchedProfile ? "Funcionário com acesso ao sistema" : "Funcionário sem acesso ao sistema",
          userId: matchedProfile?.id || employee.id,
        };
      });

      const adminOnlyOptions: UserOption[] = profiles
        .filter((profile) => !matchedProfileIds.has(profile.id))
        .map((profile) => ({
          key: `profile:${profile.id}`,
          label: profile.display_name || profile.full_name || profile.email || "Usuário sem nome",
          hint: "Usuário do sistema",
          userId: profile.id,
        }));

      setUsers(
        [...employeeOptions, ...adminOnlyOptions].sort((a, b) =>
          a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" })
        )
      );
    });
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.key === selectedKey) || null,
    [selectedKey, users],
  );

  const userId = selectedUser?.userId || "";

  useEffect(() => {
    if (!userId) { setPerms({}); return; }
    supabase.from("employee_permissions").select("module_key, allowed").eq("user_id", userId).then(({ data }) => {
      const map: Record<string, boolean> = {};
      (data || []).forEach((r: any) => { map[r.module_key] = !!r.allowed; });
      // Default: if user has no row → grant all (legacy/new user without setup)
      if (Object.keys(map).length === 0) {
        modules.forEach(m => { map[m.key] = true; });
      }
      setPerms(map);
    });
  }, [userId, modules]);

  const toggle = async (key: string, value: boolean) => {
    if (!userId) return;
    setPerms(p => ({ ...p, [key]: value }));
    setSaving(true);
    const { error } = await supabase
      .from("employee_permissions")
      .upsert({ user_id: userId, module_key: key, allowed: value }, { onConflict: "user_id,module_key" });
    setSaving(false);
    if (error) { toast.error(error.message); setPerms(p => ({ ...p, [key]: !value })); return; }
    toast.success(value ? "Acesso liberado" : "Acesso bloqueado");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2 mb-2"><Users className="h-4 w-4" /> Usuário do sistema</Label>
        <Select value={selectedKey} onValueChange={setSelectedKey}>
          <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
          <SelectContent>
            {users.map(u => (
              <SelectItem key={u.key} value={u.key}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUser?.hint && (
        <div className="text-xs text-muted-foreground">{selectedUser.hint}</div>
      )}

      {userId && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map(m => (
            <div key={m.key} className="flex items-center justify-between p-3 rounded-lg border bg-background">
              <div>
                <div className="font-medium text-sm">{m.label}</div>
                <div className="text-xs text-muted-foreground font-mono">{m.key}</div>
              </div>
              <Switch checked={!!perms[m.key]} disabled={saving} onCheckedChange={(v) => toggle(m.key, v)} />
            </div>
          ))}
        </div>
      )}
      {!selectedKey && <div className="text-sm text-muted-foreground">Selecione um usuário para configurar as permissões.</div>}
    </div>
  );
}