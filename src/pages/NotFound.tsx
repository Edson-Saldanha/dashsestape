import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl">Página não encontrada</p>
      <Button asChild>
        <Link to="/admin">Voltar ao início</Link>
      </Button>
    </div>
  );
}
