import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) {
      console.error("getClaims failed:", claimsErr?.message, "token prefix:", token.slice(0, 20));
      return json({ error: "Unauthorized", detail: claimsErr?.message }, 401);
    }
    const userData = { user: { id: claimsRes.claims.sub } };

    // Verify owner role
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "owner")
      .maybeSingle();
    if (!roleData) return json({ error: "Forbidden — owner only" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get("action");

    if (action === "listUsers") {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const ids = data.users.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("id, email, full_name, display_name").in("id", ids),
        admin.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) || [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        display_name: profileMap.get(u.id)?.display_name || profileMap.get(u.id)?.full_name || null,
        roles: roleMap.get(u.id) || [],
      }));
      return json({ users });
    }

    if (action === "updateEmail") {
      const { user_id, email } = body;
      if (!user_id || !email) return json({ error: "Missing fields" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { email, email_confirm: true });
      if (error) return json({ error: error.message }, 500);
      await admin.from("profiles").update({ email }).eq("id", user_id);
      return json({ ok: true });
    }

    if (action === "resetPassword") {
      const { user_id, password } = body;
      if (!user_id || !password || password.length < 6) {
        return json({ error: "Senha precisa ter ao menos 6 caracteres" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "updateName") {
      const { user_id, display_name } = body;
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      const { error } = await admin.from("profiles").update({ display_name }).eq("id", user_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "createUser") {
      const { email, password, display_name, role } = body;
      if (!email || !password) return json({ error: "Email e senha obrigatórios" }, 400);
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: display_name || email },
      });
      if (error) return json({ error: error.message }, 500);
      const uid = created.user!.id;
      await admin.from("profiles").upsert({ id: uid, email, full_name: display_name || email, display_name: display_name || null });
      if (role === "admin" || role === "owner") {
        await admin.from("user_roles").insert({ user_id: uid, role });
      }
      return json({ ok: true, user_id: uid });
    }

    if (action === "deleteUser") {
      const { user_id } = body;
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === userData.user.id) return json({ error: "Você não pode excluir a si mesmo" }, 400);
      await admin.from("user_roles").delete().eq("user_id", user_id);
      await admin.from("profiles").delete().eq("id", user_id);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "setRole") {
      const { user_id, role } = body; // role: "owner" | "admin" | null
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (role && !["owner", "admin", "funcionario"].includes(role)) {
        return json({ error: "Papel inválido" }, 400);
      }
      if (user_id === userData.user.id && role !== "owner") {
        return json({ error: "Você não pode remover seu próprio papel de Dono" }, 400);
      }
      // Replace existing roles with the new one (or none)
      await admin.from("user_roles").delete().eq("user_id", user_id);
      if (role) {
        const { error } = await admin.from("user_roles").insert({ user_id, role });
        if (error) return json({ error: error.message }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
