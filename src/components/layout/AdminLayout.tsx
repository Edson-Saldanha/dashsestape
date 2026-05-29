import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingCart, BarChart3, Settings, Tv, LogOut, TrendingUp, Lock, Crown, Wrench, Package, UserSquare, Boxes, ClipboardList, ChevronDown, Truck, FileText, ListTodo, ListChecks, Tags, Menu, X, HeartHandshake, Bell, MessageSquare, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/useRole";
import { usePermissions } from "@/lib/usePermissions";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoSestape from "@/assets/logo-sestape.png";

const itemsBefore = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, module: "dashboard" },
];
const itemsAfter = [
  { to: "/admin/purchase-orders", icon: ClipboardList, label: "Novos Pedidos", module: "novos_pedidos" },
  { to: "/admin/quotes", icon: FileText, label: "Cotações", module: "cotacoes" },
  { to: "/admin/product-evaluations", icon: ClipboardCheck, label: "Avaliação de Produtos", module: "avaliacao_produtos" },
  { to: "/admin/settings", icon: Settings, label: "Configurações", module: "configuracoes" },
];

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const { isOwner } = useRoles();
  const { can } = usePermissions();
  const nav = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const isClientesActive = location.pathname.startsWith("/admin/customers") || location.pathname.startsWith("/admin/suppliers");
  const [clientesOpen, setClientesOpen] = useState<boolean>(isClientesActive);
  useEffect(() => { if (isClientesActive) setClientesOpen(true); }, [isClientesActive]);
  const isFuncActive = location.pathname.startsWith("/admin/employees") || location.pathname.startsWith("/admin/tasks");
  const [funcOpen, setFuncOpen] = useState<boolean>(isFuncActive);
  useEffect(() => { if (isFuncActive) setFuncOpen(true); }, [isFuncActive]);
  const isProdActive = location.pathname.startsWith("/admin/products") || location.pathname.startsWith("/admin/product-categories");
  const isProdActiveFull = isProdActive || location.pathname.startsWith("/admin/stock");
  const [prodOpen, setProdOpen] = useState<boolean>(isProdActive);
  useEffect(() => { if (isProdActiveFull) setProdOpen(true); }, [isProdActiveFull]);
  const isOSActive = location.pathname.startsWith("/admin/orders") || location.pathname.startsWith("/admin/checklist");
  const [osOpen, setOsOpen] = useState<boolean>(isOSActive);
  useEffect(() => { if (isOSActive) setOsOpen(true); }, [isOSActive]);
  const isVendasActive = location.pathname === "/admin/sales" || location.pathname.startsWith("/admin/deliveries");
  const [vendasOpen, setVendasOpen] = useState<boolean>(isVendasActive);
  useEffect(() => { if (isVendasActive) setVendasOpen(true); }, [isVendasActive]);
  const isCrmActive = location.pathname.startsWith("/admin/crm");
  const [crmOpen, setCrmOpen] = useState<boolean>(isCrmActive);
  useEffect(() => { if (isCrmActive) setCrmOpen(true); }, [isCrmActive]);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Fecha o menu mobile ao trocar de rota
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  // Bloqueia scroll do body quando o drawer estiver aberto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!user) { setDisplayName(null); return; }
    supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || data?.full_name || null);
      });
  }, [user]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Top bar mobile */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b"
        style={{ background: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))", borderColor: "hsl(var(--sidebar-border))" }}
      >
        <img src={logoSestape} alt="Sestape Store" className="h-7 w-auto object-contain" />
        <button
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMobileOpen(o => !o)}
          className="p-2 rounded-lg hover:bg-white/10 transition"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "w-72 lg:w-64 shrink-0 flex flex-col overflow-y-auto",
          "fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-out lg:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ background: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))" }}
      >
        <div className="p-6 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex flex-col items-start">
            <img src={logoSestape} alt="Sestape Store" className="max-w-[180px] h-auto object-contain" />
          </div>
          {user ? (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
              <div className="text-xs opacity-60">Conectado como</div>
              <div className="text-sm font-medium truncate mb-2">{displayName || user.email}</div>
              <button
                onClick={async () => {
                  await signOut();
                  nav("/admin");
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium shadow-glow hover:opacity-95 transition"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
              <button
                onClick={() => nav("/login")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm opacity-80"
              >
                <Lock className="h-4 w-4" /> Acesso Restrito
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {itemsBefore.filter(it => it.module === "dashboard" && can(it.module)).map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )
              }
            >
              <it.icon className="h-4 w-4" /> {it.label}
            </NavLink>
          ))}
          {can("vendas") && (
            <div>
              <button
                type="button"
                onClick={() => setVendasOpen(o => !o)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isVendasActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )}
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="flex-1 text-left">Vendas</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", vendasOpen && "rotate-180")} />
              </button>
              {vendasOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                  <NavLink
                    to="/admin/sales"
                    end
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> Vendas
                  </NavLink>
                  <NavLink
                    to="/admin/deliveries"
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <Truck className="h-3.5 w-3.5" /> Entregas
                  </NavLink>
                </div>
              )}
            </div>
          )}
          {itemsBefore.filter(it => it.module !== "dashboard" && can(it.module)).map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={(it as any).end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )
              }
            >
              <it.icon className="h-4 w-4" /> {it.label}
            </NavLink>
          ))}
          {can("ordens_servico") && (
            <div>
              <button
                type="button"
                onClick={() => setOsOpen(o => !o)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isOSActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )}
              >
                <Wrench className="h-4 w-4" />
                <span className="flex-1 text-left">Ordens de Serviço</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", osOpen && "rotate-180")} />
              </button>
              {osOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                  <NavLink
                    to="/admin/orders"
                    end
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <Wrench className="h-3.5 w-3.5" /> Ordens de Serviço
                  </NavLink>
                  <NavLink
                    to="/admin/checklist"
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <ListChecks className="h-3.5 w-3.5" /> Checklist
                  </NavLink>
                </div>
              )}
            </div>
          )}
          {can("produtos") && (
            <div>
              <button
                type="button"
                onClick={() => setProdOpen(o => !o)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isProdActiveFull ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )}
              >
                <Package className="h-4 w-4" />
                <span className="flex-1 text-left">Produtos</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", prodOpen && "rotate-180")} />
              </button>
              {prodOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                  <NavLink
                    to="/admin/products"
                    end
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <Package className="h-3.5 w-3.5" /> Produtos
                  </NavLink>
                  <NavLink
                    to="/admin/product-categories"
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <Tags className="h-3.5 w-3.5" /> Categorias
                  </NavLink>
                  {can("estoque") && (
                    <NavLink
                      to="/admin/stock"
                      className={({ isActive }) => cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                        isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                      )}
                    >
                      <Boxes className="h-3.5 w-3.5" /> Estoque
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}
          {can("clientes") && (
            <div>
              <button
                type="button"
                onClick={() => setClientesOpen(o => !o)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isClientesActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )}
              >
                <UserSquare className="h-4 w-4" />
                <span className="flex-1 text-left">Clientes</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", clientesOpen && "rotate-180")} />
              </button>
              {clientesOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                  <NavLink
                    to="/admin/customers"
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <UserSquare className="h-3.5 w-3.5" /> Clientes
                  </NavLink>
                  <NavLink
                    to="/admin/suppliers"
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <Truck className="h-3.5 w-3.5" /> Novos Fornecedores
                  </NavLink>
                </div>
              )}
            </div>
          )}
          {itemsAfter.filter(it => can(it.module)).map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )
              }
            >
              <it.icon className="h-4 w-4" /> {it.label}
            </NavLink>
          ))}
          {can("crm") && (
            <div>
              <button
                type="button"
                onClick={() => setCrmOpen(o => !o)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isCrmActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )}
              >
                <HeartHandshake className="h-4 w-4" />
                <span className="flex-1 text-left">CRM Pós-venda</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", crmOpen && "rotate-180")} />
              </button>
              {crmOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                  <NavLink to="/admin/crm" end className={({ isActive }) => cn("flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm", isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80")}>
                    <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard CRM
                  </NavLink>
                  <NavLink to="/admin/crm/clientes" className={({ isActive }) => cn("flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm", isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80")}>
                    <UserSquare className="h-3.5 w-3.5" /> Clientes CRM
                  </NavLink>
                  <NavLink to="/admin/crm/manutencoes" className={({ isActive }) => cn("flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm", isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80")}>
                    <Wrench className="h-3.5 w-3.5" /> Manutenções
                  </NavLink>
                  <NavLink to="/admin/crm/lembretes" className={({ isActive }) => cn("flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm", isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80")}>
                    <Bell className="h-3.5 w-3.5" /> Lembretes WhatsApp
                  </NavLink>
                  <NavLink to="/admin/crm/mensagens" className={({ isActive }) => cn("flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm", isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80")}>
                    <MessageSquare className="h-3.5 w-3.5" /> Mensagens
                  </NavLink>
                  <NavLink to="/admin/crm/configuracoes" className={({ isActive }) => cn("flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm", isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80")}>
                    <Settings className="h-3.5 w-3.5" /> Configurações CRM
                  </NavLink>
                </div>
              )}
            </div>
          )}
          {can("funcionarios") && (
            <div>
              <button
                type="button"
                onClick={() => setFuncOpen(o => !o)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isFuncActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )}
              >
                <Users className="h-4 w-4" />
                <span className="flex-1 text-left">Funcionários</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", funcOpen && "rotate-180")} />
              </button>
              {funcOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                  <NavLink
                    to="/admin/employees"
                    end
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <Users className="h-3.5 w-3.5" /> Funcionários
                  </NavLink>
                  <NavLink
                    to="/admin/tasks"
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 opacity-80",
                    )}
                  >
                    <ListTodo className="h-3.5 w-3.5" /> Tarefas
                  </NavLink>
                </div>
              )}
            </div>
          )}
          {user && can("relatorios") ? (
            <NavLink
              to="/admin/reports"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )
              }
            >
              <BarChart3 className="h-4 w-4" /> Relatórios
            </NavLink>
          ) : null}
          {isOwner ? (
            <NavLink
              to="/admin/owner"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  isActive ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-white/5 opacity-80",
                )
              }
            >
              <Crown className="h-4 w-4" /> Administração
            </NavLink>
          ) : null}
          {can("modo_tv") && (
            <a
              href="/tv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium hover:bg-white/5 opacity-80 mt-4"
            >
              <Tv className="h-4 w-4" /> Modo TV
            </a>
          )}
        </nav>

      </aside>

      <main className="flex-1 overflow-auto pt-14 lg:pt-0 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
