import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/useRole";

export interface SystemModule {
  key: string;
  label: string;
  icon: string | null;
  sort_order: number;
}

export function useSystemModules() {
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("system_modules").select("*").order("sort_order").then(({ data }) => {
      setModules((data as any) || []);
      setLoading(false);
    });
  }, []);
  return { modules, loading };
}

export function usePermissions() {
  const { user } = useAuth();
  const { isOwner, isAdmin, loading: rolesLoading } = useRoles();
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setAllowed(new Set()); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("employee_permissions")
      .select("module_key, allowed")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const s = new Set<string>();
        (data || []).forEach((r: any) => { if (r.allowed) s.add(r.module_key); });
        setAllowed(s);
        setLoading(false);
      });
  }, [user]);

  const can = (moduleKey: string) => {
    if (rolesLoading || loading) return true; // do not flash-block while loading
    if (isOwner) return true; // only owner bypasses permissions
    // If user has no explicit permissions row at all → grant by default (legacy users).
    if (allowed.size === 0) return true;
    return allowed.has(moduleKey);
  };

  return { can, allowed, loading: loading || rolesLoading, isAdmin };
}