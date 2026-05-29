import { usePermissions } from "@/lib/usePermissions";
import { Lock } from "lucide-react";

export default function RequireModule({ module, children }: { module: string; children: JSX.Element }) {
  const { can, loading } = usePermissions();
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!can(module)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-1">Acesso restrito</h2>
        <p className="text-muted-foreground max-w-sm">Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }
  return children;
}