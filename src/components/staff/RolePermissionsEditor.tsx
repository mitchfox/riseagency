import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Eye, Edit, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Permission {
  id: string;
  role: string;
  section_id: string;
  section_title: string;
  category_id: string;
  category_title: string;
  can_view: boolean;
  can_edit: boolean;
}

interface GroupedPermissions {
  [categoryId: string]: {
    title: string;
    permissions: Permission[];
  };
}

const ROLES = ["admin", "staff", "marketeer"] as const;
type Role = typeof ROLES[number];

export const RolePermissionsEditor = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("staff");

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("category_id")
        .order("section_id");

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const groupPermissionsByCategory = (role: Role): GroupedPermissions => {
    const rolePermissions = permissions.filter((p) => p.role === role);
    return rolePermissions.reduce((acc, perm) => {
      if (!acc[perm.category_id]) {
        acc[perm.category_id] = {
          title: perm.category_title,
          permissions: [],
        };
      }
      acc[perm.category_id].permissions.push(perm);
      return acc;
    }, {} as GroupedPermissions);
  };

  const handlePermissionChange = (
    permissionId: string,
    field: "can_view" | "can_edit",
    value: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id === permissionId) {
          // If turning off view, also turn off edit
          if (field === "can_view" && !value) {
            return { ...p, can_view: false, can_edit: false };
          }
          // If turning on edit, also turn on view
          if (field === "can_edit" && value) {
            return { ...p, can_view: true, can_edit: true };
          }
          return { ...p, [field]: value };
        }
        return p;
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all permissions in a batch
      const updates = permissions.map((p) => ({
        id: p.id,
        role: p.role,
        section_id: p.section_id,
        section_title: p.section_title,
        category_id: p.category_id,
        category_title: p.category_title,
        can_view: p.can_view,
        can_edit: p.can_edit,
      }));

      const { error } = await supabase
        .from("role_permissions")
        .upsert(updates, { onConflict: "id" });

      if (error) throw error;

      toast.success("Permissions saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "staff":
        return "Staff";
      case "marketeer":
        return "Marketeer";
    }
  };

  const getRoleDescription = (role: Role) => {
    switch (role) {
      case "admin":
        return "Full system access - be careful when modifying";
      case "staff":
        return "Standard staff member access";
      case "marketeer":
        return "Marketing and content focused access";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-left">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Permissions Editor
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which features each role can view and edit
          </p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                {ROLES.map((role) => (
                  <TabsTrigger key={role} value={role} className="capitalize">
                    {getRoleLabel(role)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {ROLES.map((role) => {
                const grouped = groupPermissionsByCategory(role);
                return (
                  <TabsContent key={role} value={role}>
                    <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {getRoleDescription(role)}
                      </p>
                    </div>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {Object.entries(grouped).map(([categoryId, category]) => (
                          <div
                            key={categoryId}
                            className="border border-primary/20 rounded-lg p-4"
                          >
                            <h4 className="font-semibold text-primary mb-3">
                              {category.title}
                            </h4>
                            <div className="space-y-2">
                              {/* Header row */}
                              <div className="grid grid-cols-[1fr,80px,80px] gap-2 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
                                <span>Section</span>
                                <span className="text-center flex items-center justify-center gap-1">
                                  <Eye className="h-3 w-3" /> View
                                </span>
                                <span className="text-center flex items-center justify-center gap-1">
                                  <Edit className="h-3 w-3" /> Edit
                                </span>
                              </div>
                              {/* Permission rows */}
                              {category.permissions.map((perm) => (
                                <div
                                  key={perm.id}
                                  className="grid grid-cols-[1fr,80px,80px] gap-2 items-center py-1"
                                >
                                  <span className="text-sm">{perm.section_title}</span>
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={perm.can_view}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(
                                          perm.id,
                                          "can_view",
                                          !!checked
                                        )
                                      }
                                      disabled={role === "admin" && perm.section_id === "staffaccounts"}
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={perm.can_edit}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(
                                          perm.id,
                                          "can_edit",
                                          !!checked
                                        )
                                      }
                                      disabled={role === "admin" && perm.section_id === "staffaccounts"}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {hasChanges && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Permission Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
