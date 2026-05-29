import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useRoles } from "@/lib/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Mail, RefreshCw, Crown, UserPlus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useSalesData } from "@/lib/useSalesData";

const ACTION_LABELS: Record<string, { label: string; tone: string }> = {
  "sale.created": { label: "Venda registrada", tone: "bg-emerald-500/10 text-emerald-600" },
  "sale.updated": { label: "Venda editada", tone: "bg-emerald-500/10 text-emerald-600" },
  "sale.deleted": { label: "Venda excluída", tone: "bg-destructive/10 text-destructive" },
  "employee.created": { label: "Funcionário cadastrado", tone: "bg-blue-500/10 text-blue-600" },
  "employee.updated": { label: "Funcionário atualizado", tone: "bg-blue-500/10 text-blue-600" },
  "employee.deleted": { label: "Funcionário excluído", tone: "bg-destructive/10 text-destructive" },
  "employee.activated": { label: "Funcionário ativado", tone: "bg-emerald-500/10 text-emerald-600" },
  "employee.deactivated": { label: "Funcionário desativado", tone: "bg-amber-500/10 text-amber-600" },
  "product.created": { label: "Produto cadastrado", tone: "bg-blue-500/10 text-blue-600" },
  "product.updated": { label: "Produto atualizado", tone: "bg-blue-500/10 text-blue-600" },
  "product.deleted": { label: "Produto excluído", tone: "bg-destructive/10 text-destructive" },
  "customer.created": { label: "Cliente cadastrado", tone: "bg-blue-500/10 text-blue-600" },
  "customer.updated": { label: "Cliente atualizado", tone: "bg-blue-500/10 text-blue-600" },
  "customer.deleted": { label: "Cliente excluído", tone: "bg-destructive/10 text-destructive" },
  "order.created": { label: "Ordem de serviço criada", tone: "bg-purple-500/10 text-purple-600" },
  "order.updated": { label: "Ordem de serviço atualizada", tone: "bg-purple-500/10 text-purple-600" },
  "order.deleted": { label: "Ordem de serviço excluída", tone: "bg-destructive/10 text-destructive" },
  "stock.movement": { label: "Movimentação de estoque", tone: "bg-indigo-500/10 text-indigo-600" },
  "settings.updated": { label: "Configurações alteradas", tone: "bg-amber-500/10 text-amber-600" },
  "user.created": { label: "Usuário criado", tone: "bg-emerald-500/10 text-emerald-600" },
  "user.updated": { label: "Usuário atualizado", tone: "bg-blue-500/10 text-blue-600" },
  "user.deleted": { label: "Usuário excluído", tone: "bg-destructive/10 text-destructive" },
  "permission.changed": { label: "Permissão alterada", tone: "bg-amber-500/10 text-amber-600" },
  "auth.login": { label: "Acesso ao sistema", tone: "bg-muted text-muted-foreground" },
  "auth.logout": { label: "Saída do sistema", tone: "bg-muted text-muted-foreground" },
};

const ENTITY_LABELS: Record<string, string> = {
  sales: "Vendas",
  employees: "Funcionários",
  products: "Produtos",
  customers: "Clientes",
  orders: "Ordens de Serviço",
  stock: "Estoque",
  settings: "Configurações",
  users: "Usuários",
  permissions: "Permissões",
  auth: "Autenticação",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  amount: "Valor",
  employee: "Funcionário",
  customer: "Cliente",
  product: "Produto",
  quantity: "Quantidade",
  monthly_goal: "Meta mensal",
  role: "Função",
  status: "Situação",
  module: "Módulo",
  allowed: "Permitido",
  reason: "Motivo",
  notes: "Observações",
  supplier: "Fornecedor",
  cost: "Custo",
  movement_type: "Tipo de movimento",
  phone: "Telefone",
  cpf: "CPF",
  address: "Endereço",
};

const formatValue = (key: string, value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key === "amount" || key === "cost" || key === "monthly_goal") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatDetails = (details: any): { key: string; label: string; value: string }[] => {
  if (!details || typeof details !== "object") return [];
  return Object.entries(details).map(([k, v]) => ({
    key: k,
    label: FIELD_LABELS[k] || k.replace(/_/g, " "),
    value: formatValue(k, v),
  }));
};

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
  last_sign_in_at: string | null;
  created_at: string;
}

export default function OwnerPanel() {
  const { isOwner, loading } = useRoles();
  const { employees } = useSalesData();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "owner" | "funcionario" | "none">("admin");
  const [savingNew, setSavingNew] = useState(false);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.functions.invoke("owner-admin", {
      body: { action: "listUsers" },
    });
    if (error) toast.error(error.message);
    else setUsers(data?.users || []);
    setLoadingUsers(false);
  };

  const fetchActivity = async () => {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setActivity(data || []);
  };

  useEffect(() => {
    if (isOwner) {
      fetchUsers();
      fetchActivity();
    }
  }, [isOwner]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isOwner) return <Navigate to="/admin" replace />;

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditEmail(u.email);
    setEditName(u.display_name || "");
  };

  const saveUser = async () => {
    if (!editing) return;
    if (editEmail && editEmail !== editing.email) {
      const { error } = await supabase.functions.invoke("owner-admin", {
        body: { action: "updateEmail", user_id: editing.id, email: editEmail },
      });
      if (error) return toast.error(error.message);
    }
    if ((editName || "") !== (editing.display_name || "")) {
      const { error } = await supabase.functions.invoke("owner-admin", {
        body: { action: "updateName", user_id: editing.id, display_name: editName },
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Usuário atualizado");
    setEditing(null);
    fetchUsers();
  };

  const createUser = async () => {
    if (!newEmail || !newPassword) return toast.error("Email e senha obrigatórios");
    setSavingNew(true);
    const { error } = await supabase.functions.invoke("owner-admin", {
      body: {
        action: "createUser",
        email: newEmail,
        password: newPassword,
        display_name: newName,
        role: newRole === "none" ? null : newRole,
      },
    });
    setSavingNew(false);
    if (error) return toast.error(error.message);
    toast.success("Usuário criado");
    setCreating(false);
    setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("admin");
    fetchUsers();
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Excluir usuário ${u.email}? Esta ação é permanente.`)) return;
    const { error } = await supabase.functions.invoke("owner-admin", {
      body: { action: "deleteUser", user_id: u.id },
    });
    if (error) return toast.error(error.message);
    toast.success("Usuário excluído");
    fetchUsers();
  };

  const changeRole = async (u: UserRow, role: "owner" | "admin" | "funcionario" | "none") => {
    const current = u.roles.includes("owner") ? "owner" : u.roles.includes("admin") ? "admin" : u.roles.includes("funcionario") ? "funcionario" : "none";
    if (current === role) return;
    const label = role === "owner" ? "Dono" : role === "admin" ? "Admin" : role === "funcionario" ? "Funcionário" : "Nenhum";
    if (!confirm(`Alterar papel de ${u.display_name || u.email} para ${label}?`)) return;
    const { error } = await supabase.functions.invoke("owner-admin", {
      body: { action: "setRole", user_id: u.id, role: role === "none" ? null : role },
    });
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    fetchUsers();
  };

  const filteredActivity = filterUser
    ? activity.filter((a) => a.user_id === filterUser)
    : activity;

  // Map email -> user account for quick lookup
  const userByEmail = new Map(users.map((u) => [(u.email || "").toLowerCase(), u]));
  const adminUsers = users.filter((u) => u.roles.includes("owner") || u.roles.includes("admin"));
  const adminEmails = new Set(adminUsers.map((u) => (u.email || "").toLowerCase()));
  const adminNames = new Set(
    adminUsers
      .map((u) => (u.display_name || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const employeeRows = (employees || [])
    .filter((e: any) => {
      if (!e.active) return false;
      if (e.email && adminEmails.has(String(e.email).toLowerCase())) return false;
      if (e.name && adminNames.has(String(e.name).trim().toLowerCase())) return false;
      return true;
    })
    .map((e: any) => ({
      employee: e,
      user: e.email ? userByEmail.get(String(e.email).toLowerCase()) : undefined,
    }));

  const resetEmployeePassword = async (u: UserRow) => {
    const pwd = prompt(`Nova senha para ${u.display_name || u.email}:`, Math.random().toString(36).slice(-10));
    if (!pwd) return;
    if (pwd.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    const { error } = await supabase.functions.invoke("owner-admin", {
      body: { action: "resetPassword", user_id: u.id, password: pwd },
    });
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida");
  };

  const deleteEmployee = async (e: any) => {
    if (!confirm(`Excluir funcionário ${e.name}? Esta ação é permanente.`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Funcionário excluído");
    window.location.reload();
  };

  const viewActivity = (userId: string) => {
    setFilterUser(userId);
    setActiveTab("activity");
  };

  const createAccessForEmployee = async (emp: any) => {
    if (!emp.email) return toast.error("Funcionário sem e-mail cadastrado");
    const pwd = prompt(
      `Definir senha para ${emp.name} (${emp.email}):`,
      Math.random().toString(36).slice(-10),
    );
    if (!pwd || pwd.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    setCreatingFor(emp.id);
    const { error } = await supabase.functions.invoke("owner-admin", {
      body: {
        action: "createUser",
        email: emp.email,
        password: pwd,
        display_name: emp.name,
        role: "funcionario",
      },
    });
    setCreatingFor(null);
    if (error) return toast.error(error.message);
    toast.success(`Acesso criado para ${emp.name}`);
    fetchUsers();
  };

  return (
    <div className="p-8 space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1 flex items-center gap-2">
          <Crown className="h-3 w-3" /> Área do Dono
        </div>
        <h1 className="font-display text-3xl font-bold">Administração</h1>
        <p className="text-muted-foreground">Gerencie usuários e monitore atividades</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Usuários & Funcionários</TabsTrigger>
          <TabsTrigger value="activity">Histórico de Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button size="sm" className="bg-gradient-primary text-white" onClick={() => setCreating(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Adicionar usuário
            </Button>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
          <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-display font-bold">Donos e Administradores</h3>
              <p className="text-xs text-muted-foreground">Usuários com acesso administrativo ao sistema.</p>
            </div>
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Papel</th>
                  <th className="p-4">Último acesso</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {adminUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="p-4 font-medium">{u.display_name || "—"}</td>
                    <td className="p-4 text-sm">{u.email}</td>
                    <td className="p-4">
                      <select
                        className="text-xs bg-background border rounded-md h-8 px-2"
                        value={u.roles.includes("owner") ? "owner" : u.roles.includes("admin") ? "admin" : u.roles.includes("funcionario") ? "funcionario" : "none"}
                        onChange={(e) => changeRole(u, e.target.value as any)}
                      >
                        <option value="owner">Dono</option>
                        <option value="admin">Admin</option>
                        <option value="funcionario">Funcionário</option>
                        <option value="none">Nenhum</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => viewActivity(u.id)}>
                          Atividades
                        </Button>
                        {!u.roles.includes("owner") && (
                          <Button size="sm" variant="ghost" onClick={() => deleteUser(u)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {adminUsers.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">
                    {loadingUsers ? "Carregando..." : "Nenhum administrador."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-display font-bold">Funcionários</h3>
              <p className="text-xs text-muted-foreground">
                Veja as atividades de cada funcionário. Crie o acesso para quem ainda não tem login.
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Nome</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Função</th>
                  <th className="p-4">Situação</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employeeRows.map(({ employee: e, user: u }) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="p-4 font-medium">{e.name}</td>
                    <td className="p-4 text-sm">{e.email || <span className="text-muted-foreground italic">sem e-mail</span>}</td>
                    <td className="p-4 text-xs uppercase tracking-wider text-muted-foreground">{e.role}</td>
                    <td className="p-4 text-xs">
                      {u ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 uppercase tracking-wider">Com acesso</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 uppercase tracking-wider">Sem acesso</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {u ? (
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => viewActivity(u.id)}>
                            Atividades
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Editar nome / e-mail">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resetEmployeePassword(u)} title="Nova senha">
                            <KeyRound className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteEmployee(e)} className="text-destructive hover:text-destructive" title="Excluir funcionário">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2 items-center">
                          {e.email ? (
                            <Button
                              size="sm"
                              className="bg-gradient-primary text-white"
                              disabled={creatingFor === e.id}
                              onClick={() => createAccessForEmployee(e)}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              {creatingFor === e.id ? "Criando..." : "Criar acesso"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Cadastre um e-mail</span>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteEmployee(e)} className="text-destructive hover:text-destructive" title="Excluir funcionário">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {employeeRows.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Nenhum funcionário ativo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="bg-card rounded-2xl border shadow-elegant p-5">
            <h2 className="font-display font-bold text-lg mb-1">Histórico detalhado</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe tudo o que foi feito no sistema: vendas, alterações em funcionários, produtos, clientes, ordens de serviço, estoque e configurações. Filtre por usuário para ver somente as ações de uma pessoa específica.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Filtrar por usuário:</Label>
            <select
              className="text-sm bg-background border rounded-md h-9 px-2"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.display_name || u.email}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={fetchActivity}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredActivity.length} registro{filteredActivity.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="bg-card rounded-2xl border shadow-elegant overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Quando</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Entidade</th>
                  <th className="p-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredActivity.map((a) => {
                  const meta = ACTION_LABELS[a.action] || { label: a.action, tone: "bg-primary/10 text-primary" };
                  const entityLabel = a.entity ? (ENTITY_LABELS[a.entity] || a.entity) : "—";
                  const fields = formatDetails(a.details);
                  return (
                    <tr key={a.id} className="hover:bg-muted/20 align-top">
                      <td className="p-4 text-sm whitespace-nowrap">{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-4 text-sm">{a.user_email || "—"}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${meta.tone}`}>{meta.label}</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{entityLabel}</td>
                      <td className="p-4 text-xs max-w-md">
                        {fields.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {fields.map((f) => (
                              <span key={f.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border">
                                <span className="text-muted-foreground capitalize">{f.label}:</span>
                                <span className="font-medium">{f.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredActivity.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Nenhuma atividade registrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Mail className="h-4 w-4" /> Editar usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome de exibição</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
            <Button onClick={saveUser} className="w-full bg-gradient-primary text-white">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Adicionar usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome de exibição</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: João Silva" /></div>
            <div><Label>Email</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="usuario@empresa.com" /></div>
            <div><Label>Senha</Label><Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <div>
              <Label>Papel</Label>
              <select className="w-full bg-background border rounded-md h-10 px-3 mt-1" value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
                <option value="admin">Admin</option>
                <option value="owner">Dono</option>
                <option value="funcionario">Funcionário</option>
                <option value="none">Nenhum</option>
              </select>
            </div>
            <Button onClick={createUser} disabled={savingNew} className="w-full bg-gradient-primary text-white">
              {savingNew ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
