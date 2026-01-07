import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RolePermission {
  id: string;
  role: string;
  section_id: string;
  section_title: string;
  category_id: string;
  category_title: string;
  can_view: boolean;
  can_edit: boolean;
}

export const useRolePermissions = (role: string | null) => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role) {
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from("role_permissions")
          .select("*")
          .eq("role", role)
          .order("category_id")
          .order("section_id");

        if (error) throw error;
        setPermissions(data || []);
      } catch (error) {
        console.error("Error fetching role permissions:", error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [role]);

  const canView = (sectionId: string): boolean => {
    const perm = permissions.find((p) => p.section_id === sectionId);
    return perm?.can_view ?? false;
  };

  const canEdit = (sectionId: string): boolean => {
    const perm = permissions.find((p) => p.section_id === sectionId);
    return perm?.can_edit ?? false;
  };

  const getViewableSections = (): string[] => {
    return permissions.filter((p) => p.can_view).map((p) => p.section_id);
  };

  const getEditableSections = (): string[] => {
    return permissions.filter((p) => p.can_edit).map((p) => p.section_id);
  };

  return {
    permissions,
    loading,
    canView,
    canEdit,
    getViewableSections,
    getEditableSections,
  };
};
