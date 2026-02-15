import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Eye, Edit, Save, Loader2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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

interface AvailableRole {
  role_key: string;
  role_label: string;
  description: string | null;
}

interface GroupedPermissions {
  [categoryId: string]: {
    title: string;
    permissions: Permission[];
  };
}

export const RolePermissionsEditor = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("staff");
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [permRes, roleRes] = await Promise.all([
        supabase.from("role_permissions").select("*").order("category_id").order("section_id"),
        supabase.from("available_roles").select("*").order("role_key"),
      ]);

      if (permRes.error) throw permRes.error;
      if (roleRes.error) throw roleRes.error;

      setPermissions(permRes.data || []);
      setRoles(roleRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const groupPermissionsByCategory = (role: string): GroupedPermissions => {
    const rolePermissions = permissions.filter((p) => p.role === role);
    return rolePermissions.reduce((acc, perm) => {
      if (!acc[perm.category_id]) {
        acc[perm.category_id] = { title: perm.category_title, permissions: [] };
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
          if (field === "can_view" && !value) return { ...p, can_view: false, can_edit: false };
          if (field === "can_edit" && value) return { ...p, can_view: true, can_edit: true };
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

  const handleCreateRole = async () => {
    const key = newRoleKey.trim().toLowerCase().replace(/\s+/g, "_");
    const label = newRoleLabel.trim();

    if (!key || !label) {
      toast.error("Role key and label are required");
      return;
    }

    if (roles.find((r) => r.role_key === key)) {
      toast.error("A role with that key already exists");
      return;
    }

    setCreatingRole(true);
    try {
      // 1. Add to available_roles
      const { error: roleErr } = await supabase
        .from("available_roles")
        .insert({ role_key: key, role_label: label, description: newRoleDesc.trim() || null });

      if (roleErr) throw roleErr;

      // 2. Add enum value to app_role so user_roles table accepts it
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        const res = await supabase.functions.invoke("manage-roles", {
          body: { action: "add_enum_value", role_key: key },
        });
        if (res.error) {
          console.warn("Could not add enum value (may already exist):", res.error);
        }
      }

      const adminPerms = permissions.filter((p) => p.role === "admin");
      const newPerms = adminPerms.map((p) => ({
        role: key,
        section_id: p.section_id,
        section_title: p.section_title,
        category_id: p.category_id,
        category_title: p.category_title,
        can_view: false,
        can_edit: false,
      }));

      if (newPerms.length > 0) {
        const { error: permErr } = await supabase
          .from("role_permissions")
          .insert(newPerms);

        if (permErr) throw permErr;
      }

      toast.success(`Role "${label}" created`);
      setNewRoleKey("");
      setNewRoleLabel("");
      setNewRoleDesc("");
      setDialogOpen(false);
      setSelectedRole(key);
      await fetchData();
    } catch (error: any) {
      console.error("Error creating role:", error);
      toast.error(error.message || "Failed to create role");
    } finally {
      setCreatingRole(false);
    }
  };

  const getRoleLabel = (roleKey: string) => {
    return roles.find((r) => r.role_key === roleKey)?.role_label || roleKey;
  };

  const getRoleDescription = (roleKey: string) => {
    return roles.find((r) => r.role_key === roleKey)?.description || "";
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

  const roleKeys = roles.map((r) => r.role_key);

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
            <div className="flex items-center gap-2 mb-4">
              <Tabs
                value={selectedRole}
                onValueChange={setSelectedRole}
                className="flex-1"
              >
                <div className="flex items-center gap-2">
                  <TabsList className="flex-1 flex-wrap h-auto gap-1">
                    {roleKeys.map((role) => (
                      <TabsTrigger key={role} value={role} className="capitalize">
                        {getRoleLabel(role)}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label>Role Key</Label>
                          <Input
                            placeholder="e.g. scout"
                            value={newRoleKey}
                            onChange={(e) => setNewRoleKey(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Lowercase identifier used internally
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Display Name</Label>
                          <Input
                            placeholder="e.g. Scout"
                            value={newRoleLabel}
                            onChange={(e) => setNewRoleLabel(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (optional)</Label>
                          <Input
                            placeholder="e.g. Scouting and recruitment focused access"
                            value={newRoleDesc}
                            onChange={(e) => setNewRoleDesc(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleCreateRole} disabled={creatingRole}>
                          {creatingRole ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Create Role
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {roleKeys.map((role) => {
                  const grouped = groupPermissionsByCategory(role);
                  return (
                    <TabsContent key={role} value={role}>
                      {getRoleDescription(role) && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {getRoleDescription(role)}
                          </p>
                        </div>
                      )}
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
                                <div className="grid grid-cols-[1fr,80px,80px] gap-2 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
                                  <span>Section</span>
                                  <span className="text-center flex items-center justify-center gap-1">
                                    <Eye className="h-3 w-3" /> View
                                  </span>
                                  <span className="text-center flex items-center justify-center gap-1">
                                    <Edit className="h-3 w-3" /> Edit
                                  </span>
                                </div>
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
                                          handlePermissionChange(perm.id, "can_view", !!checked)
                                        }
                                        disabled={role === "admin" && perm.section_id === "staffaccounts"}
                                      />
                                    </div>
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={perm.can_edit}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(perm.id, "can_edit", !!checked)
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
                          <Button onClick={handleSave} disabled={saving} className="w-full">
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
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
