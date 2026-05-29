import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "./pages/Login";
import TVMode from "./pages/TVMode";
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Sales from "./pages/admin/Sales";
import Deliveries from "./pages/admin/Deliveries";
import Employees from "./pages/admin/Employees";
import Reports from "./pages/admin/Reports";
import SettingsPage from "./pages/admin/SettingsPage";
import OwnerPanel from "./pages/admin/OwnerPanel";
import ServiceOrders from "./pages/admin/ServiceOrders";
import Checklist from "./pages/admin/Checklist";
import Products from "./pages/admin/Products";
import ProductCategories from "./pages/admin/ProductCategories";
import Customers from "./pages/admin/Customers";
import Suppliers from "./pages/admin/Suppliers";
import Stock from "./pages/admin/Stock";
import PurchaseOrders from "./pages/admin/PurchaseOrders";
import Quotes from "./pages/admin/Quotes";
import Tasks from "./pages/admin/Tasks";
import ProductEvaluations from "./pages/admin/ProductEvaluations";
import ProductEvaluationDetail from "./pages/admin/ProductEvaluationDetail";
import CrmDashboard from "./pages/admin/crm/CrmDashboard";
import CrmCustomers from "./pages/admin/crm/CrmCustomers";
import CrmCustomerDetail from "./pages/admin/crm/CrmCustomerDetail";
import CrmManutencoes from "./pages/admin/crm/CrmManutencoes";
import CrmLembretes from "./pages/admin/crm/CrmLembretes";
import CrmMensagens from "./pages/admin/crm/CrmMensagens";
import CrmSettings from "./pages/admin/crm/CrmSettings";
import RequireModule from "./components/RequireModule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/tv" element={<ProtectedRoute><TVMode /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<RequireModule module="dashboard"><AdminDashboard /></RequireModule>} />
              <Route path="sales" element={<RequireModule module="vendas"><Sales /></RequireModule>} />
              <Route path="deliveries" element={<RequireModule module="vendas"><Deliveries /></RequireModule>} />
              <Route path="orders" element={<RequireModule module="ordens_servico"><ServiceOrders /></RequireModule>} />
              <Route path="checklist" element={<RequireModule module="ordens_servico"><Checklist /></RequireModule>} />
              <Route path="products" element={<RequireModule module="produtos"><Products /></RequireModule>} />
              <Route path="product-categories" element={<RequireModule module="produtos"><ProductCategories /></RequireModule>} />
              <Route path="customers" element={<RequireModule module="clientes"><Customers /></RequireModule>} />
              <Route path="suppliers" element={<RequireModule module="clientes"><Suppliers /></RequireModule>} />
              <Route path="stock" element={<RequireModule module="estoque"><Stock /></RequireModule>} />
              <Route path="purchase-orders" element={<RequireModule module="novos_pedidos"><PurchaseOrders /></RequireModule>} />
              <Route path="quotes" element={<RequireModule module="cotacoes"><Quotes /></RequireModule>} />
              <Route path="product-evaluations" element={<RequireModule module="avaliacao_produtos"><ProductEvaluations /></RequireModule>} />
              <Route path="product-evaluations/:id" element={<RequireModule module="avaliacao_produtos"><ProductEvaluationDetail /></RequireModule>} />
              <Route path="employees" element={<RequireModule module="funcionarios"><Employees /></RequireModule>} />
              <Route path="tasks" element={<RequireModule module="tarefas"><Tasks /></RequireModule>} />
              <Route path="crm" element={<RequireModule module="crm"><CrmDashboard /></RequireModule>} />
              <Route path="crm/clientes" element={<RequireModule module="crm"><CrmCustomers /></RequireModule>} />
              <Route path="crm/clientes/:id" element={<RequireModule module="crm"><CrmCustomerDetail /></RequireModule>} />
              <Route path="crm/manutencoes" element={<RequireModule module="crm"><CrmManutencoes /></RequireModule>} />
              <Route path="crm/lembretes" element={<RequireModule module="crm"><CrmLembretes /></RequireModule>} />
              <Route path="crm/mensagens" element={<RequireModule module="crm"><CrmMensagens /></RequireModule>} />
              <Route path="crm/configuracoes" element={<RequireModule module="crm"><CrmSettings /></RequireModule>} />
              <Route path="reports" element={<ProtectedRoute><RequireModule module="relatorios"><Reports /></RequireModule></ProtectedRoute>} />
              <Route path="settings" element={<RequireModule module="configuracoes"><SettingsPage /></RequireModule>} />
              <Route path="owner" element={<ProtectedRoute><OwnerPanel /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
