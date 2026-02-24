import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  action: 'created' | 'updated' | 'deleted';
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  details?: any;
}

/**
 * Log a staff action to the activity log.
 * Silently fails so it never blocks the main workflow.
 */
export const logActivity = async ({ action, entityType, entityId, entityName, details }: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('staff_activity_log').insert({
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      details: details || null,
      user_id: user.id,
      user_email: user.email || null,
    });
  } catch (err) {
    console.error('Activity log failed:', err);
  }
};
