import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppRole = "owner" | "admin";

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles((data || []).map((r: any) => r.role as AppRole));
      setLoading(false);
    });
  }, [user]);

  return {
    roles,
    loading,
    isOwner: roles.includes("owner"),
    isAdmin: roles.includes("admin") || roles.includes("owner"),
  };
}
