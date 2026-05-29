import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useCurrentEmployee() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) { setRole(null); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("employees")
      .select("role,email")
      .ilike("email", user.email)
      .maybeSingle()
      .then(({ data }) => {
        setRole((data as any)?.role ?? null);
        setLoading(false);
      });
  }, [user?.email]);

  return {
    role,
    loading,
    isSeller: role === "vendedor",
    isTechnician: role === "tecnico",
    isSellerOrTech: role === "vendedor" || role === "tecnico",
  };
}