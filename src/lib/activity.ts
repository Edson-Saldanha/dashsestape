import { supabase } from "@/integrations/supabase/client";

export async function logActivity(action: string, entity?: string, entity_id?: string, details?: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_log").insert({
      user_id: user.id,
      user_email: user.email,
      action,
      entity: entity || null,
      entity_id: entity_id || null,
      details: details || null,
    });
  } catch (e) {
    console.warn("activity log failed", e);
  }
}
