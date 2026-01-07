import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Trash2, Check, X, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface StaffAccount {
  email: string;
  password: string;
  role: "admin" | "staff" | "marketeer";
  fullName: string;
}

export const StaffAccountManagement = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<StaffAccount | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState<StaffAccount>({
    email: "",
    password: "",
    role: "staff",
    fullName: "",
  });

  useEffect(() => {
    checkAdminRole();
    fetchExistingAccounts();
  }, []);

  const fetchExistingAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role,
          user_id,
          profiles!inner (
            email,
            full_name
          )
        `)
        .in('role', ['admin', 'staff', 'marketeer']);

      if (error) throw error;
      console.log('Fetched accounts:', data);
      setExistingAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error("Failed to load existing accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const checkAdminRole = async () => {
    try {
      // Check for staff session from localStorage (custom staff login)
      const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      
      if (!staffUserId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", staffUserId)
        .eq("role", "admin")
        .single();

      setIsAdmin(!!data);
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Get admin user ID from staff session
      const adminUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      if (!adminUserId) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: newAccount.email,
            password: newAccount.password,
            role: newAccount.role,
            full_name: newAccount.fullName,
            admin_user_id: adminUserId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create account");
      }

      // Check if account was newly created or updated
      if (result.updated) {
        toast.success(`Account role updated to ${newAccount.role}`);
        // Don't show credentials for existing accounts
        setCreatedAccount(null);
      } else {
        const roleLabel = newAccount.role === "admin" ? "Admin" : newAccount.role === "marketeer" ? "Marketeer" : "Staff";
        toast.success(`${roleLabel} account created successfully`);
        // Store created account details to display (only for new accounts)
        setCreatedAccount({ ...newAccount });
      }
      
      // Refresh the accounts list
      fetchExistingAccounts();
      
      // Reset form
      setNewAccount({
        email: "",
        password: "",
        role: "staff",
        fullName: "",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (email: string, role: string, fullName: string) => {
    setResettingPassword(email);

    try {
      // Send password reset email via Supabase Auth
      // Use the auth callback page which handles the token exchange
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/staff/update-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success(`Password reset email sent to ${email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setResettingPassword(null);
    }
  };

  const handleDeleteAccount = async (userId: string, email: string) => {
    setDeletingAccount(userId);

    try {
      // Get admin user ID from staff session
      const adminUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      if (!adminUserId) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-staff-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId, admin_user_id: adminUserId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete account");
      }

      toast.success(`Account ${email} deleted successfully`);
      fetchExistingAccounts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setDeletingAccount(null);
    }
  };

  const handleChangeRole = async (userId: string, email: string, newRole: "admin" | "staff" | "marketeer") => {
    setUpdatingRole(userId);

    try {
      // Get admin user ID from staff session
      const adminUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      if (!adminUserId) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            role: newRole,
            admin_user_id: adminUserId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update role");
      }

      toast.success(`Role updated to ${newRole}`);
      fetchExistingAccounts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setUpdatingRole(null);
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            You need admin permissions to manage staff accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  const [permissionsOpen, setPermissionsOpen] = useState(false);

  // Role permissions data - what each role can access
  type RolePermission = {
    label: string;
    description: string;
    categories: { name: string; sections: string[]; excluded?: string[] }[];
    excluded?: string[];
  };

  const rolePermissions: Record<"admin" | "staff" | "marketeer", RolePermission> = {
    admin: {
      label: "Admin",
      description: "Full access to all features",
      categories: [
        {
          name: "Overview",
          sections: ["Overview", "Focused Tasks", "Goals & Tasks", "Staff Schedules", "Notifications"]
        },
        {
          name: "Coaching",
          sections: ["Schedule", "Coaching Database", "Tactics Board", "Meetings", "Analysis Writer", "Athlete Centre"]
        },
        {
          name: "Management",
          sections: ["Player Management", "Transfer Hub", "Player Updates"]
        },
        {
          name: "Network & Recruitment",
          sections: ["Club Network", "Player List", "Recruitment", "Player Database", "Scouting Centre", "Form Submissions"]
        },
        {
          name: "Marketing & Brand",
          sections: ["Marketing", "Ideas", "Content Creator", "News Articles", "Between The Lines", "Open Access", "Site Visitors"]
        },
        {
          name: "Financial",
          sections: ["Invoices", "Payments In/Out", "Expenses", "Tax Records", "Budgets", "Reports"]
        },
        {
          name: "Admin & Legal",
          sections: ["Legal", "Site Text", "Languages", "Player Passwords", "Staff Accounts", "PWA Install", "Offline Content", "Push Notifications"]
        }
      ]
    },
    staff: {
      label: "Staff",
      description: "Access to most features except admin-only sections",
      categories: [
        {
          name: "Overview",
          sections: ["Overview", "Focused Tasks", "Goals & Tasks", "Staff Schedules"]
        },
        {
          name: "Coaching",
          sections: ["Schedule", "Coaching Database", "Tactics Board", "Meetings", "Analysis Writer", "Athlete Centre"]
        },
        {
          name: "Management",
          sections: ["Player Management", "Transfer Hub", "Player Updates"]
        },
        {
          name: "Network & Recruitment",
          sections: ["Club Network", "Player List", "Recruitment", "Player Database", "Scouting Centre", "Form Submissions"]
        },
        {
          name: "Marketing & Brand",
          sections: ["Marketing", "Ideas", "Content Creator", "News Articles", "Between The Lines", "Open Access", "Site Visitors"]
        },
        {
          name: "Financial",
          sections: ["Invoices", "Payments In/Out", "Expenses", "Tax Records", "Budgets", "Reports"]
        },
        {
          name: "Admin & Legal",
          sections: ["Legal", "Site Text", "Languages", "PWA Install", "Offline Content", "Push Notifications"],
          excluded: ["Player Passwords", "Staff Accounts"]
        }
      ]
    },
    marketeer: {
      label: "Marketeer",
      description: "Limited access focused on marketing and content",
      categories: [
        {
          name: "Overview",
          sections: ["Overview", "Focused Tasks (Content Creator only)", "Goals & Tasks"]
        },
        {
          name: "Management",
          sections: ["Player Management"]
        },
        {
          name: "Network & Recruitment",
          sections: ["Club Network", "Player List", "Recruitment", "Player Database", "Scouting Centre", "Form Submissions"]
        },
        {
          name: "Marketing & Brand",
          sections: ["Marketing", "Ideas", "Content Creator", "News Articles", "Between The Lines", "Open Access", "Site Visitors"]
        },
        {
          name: "Admin & Legal",
          sections: ["Legal", "PWA Install", "Offline Content"],
          excluded: ["Site Text", "Languages", "Player Passwords", "Staff Accounts", "Push Notifications"]
        }
      ],
      excluded: ["Coaching", "Financial", "Transfer Hub", "Player Updates", "Staff Schedules"]
    }
  };

  return (
    <div className="space-y-8">
      {/* Role Permissions Overview */}
      <Card>
        <Collapsible open={permissionsOpen} onOpenChange={setPermissionsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Permissions Overview
                </CardTitle>
                {permissionsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <p className="text-sm text-muted-foreground mt-1">
              Click to view what each role can access
            </p>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(["admin", "staff", "marketeer"] as const).map((role) => {
                  const perms = rolePermissions[role];
                  return (
                    <div
                      key={role}
                      className="border border-primary/20 rounded-lg p-4 bg-muted/20"
                    >
                      <div className="mb-3">
                        <h3 className="font-semibold text-lg capitalize">{perms.label}</h3>
                        <p className="text-xs text-muted-foreground">{perms.description}</p>
                      </div>
                      <ScrollArea className="h-[300px] pr-2">
                        <div className="space-y-3">
                          {perms.categories.map((cat) => (
                            <div key={cat.name}>
                              <p className="text-sm font-medium text-primary mb-1">{cat.name}</p>
                              <ul className="space-y-0.5">
                                {cat.sections.map((section) => (
                                  <li key={section} className="flex items-center gap-1.5 text-xs">
                                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                    <span>{section}</span>
                                  </li>
                                ))}
                                {cat.excluded?.map((section) => (
                                  <li key={section} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <X className="h-3 w-3 text-destructive flex-shrink-0" />
                                    <span className="line-through">{section}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {perms.excluded && (
                            <div>
                              <p className="text-sm font-medium text-destructive mb-1">No Access</p>
                              <ul className="space-y-0.5">
                                {perms.excluded.map((item) => (
                                  <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <X className="h-3 w-3 text-destructive flex-shrink-0" />
                                    <span className="line-through">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Existing Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Staff Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAccounts ? (
            <p className="text-muted-foreground">Loading accounts...</p>
          ) : existingAccounts.length === 0 ? (
            <p className="text-muted-foreground">No staff accounts found</p>
          ) : (
            <div className="space-y-2">
              {existingAccounts.map((account) => (
                <div 
                  key={account.user_id} 
                  className="p-3 md:p-4 border border-primary/20 rounded-lg bg-muted/30"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 items-center">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-sm md:text-base break-all">{account.profiles?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium text-sm md:text-base">{account.profiles?.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">Role</p>
                      <Select
                        value={account.role}
                        onValueChange={(value: "admin" | "staff" | "marketeer") =>
                          handleChangeRole(account.user_id, account.profiles?.email || '', value)
                        }
                        disabled={updatingRole === account.user_id}
                      >
                        <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="marketeer">Marketeer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3 md:mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(
                        account.profiles?.email || '',
                        account.role,
                        account.profiles?.full_name || ''
                      )}
                      disabled={resettingPassword === account.profiles?.email}
                      className="w-full sm:w-auto"
                    >
                      {resettingPassword === account.profiles?.email ? "Resetting..." : "Reset Password"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingAccount === account.user_id}
                          className="w-full sm:w-auto"
                        >
                          {deletingAccount === account.user_id ? "Deleting..." : <><Trash2 className="h-4 w-4 mr-1" /> Delete</>}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Staff Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the account for <strong>{account.profiles?.email}</strong>? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteAccount(account.user_id, account.profiles?.email || '')}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Created Account Credentials Alert */}
      {createdAccount && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-primary">Account Created Successfully</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreatedAccount(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive mb-4 font-medium">
              ⚠️ Save these credentials now - the password will not be shown again
            </p>
            <div className="space-y-3 bg-muted p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-mono font-medium">{createdAccount.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Password</p>
                <p className="font-mono font-medium">{createdAccount.password}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{createdAccount.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{createdAccount.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Account Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Staff Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email Address *</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={newAccount.email}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, email: e.target.value })
                  }
                  placeholder="staff@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-name">Full Name</Label>
                <Input
                  id="staff-name"
                  type="text"
                  value={newAccount.fullName}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, fullName: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-password">Password *</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={newAccount.password}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, password: e.target.value })
                  }
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-role">Role *</Label>
                <Select
                  value={newAccount.role}
                  onValueChange={(value: "admin" | "staff" | "marketeer") =>
                    setNewAccount({ ...newAccount, role: value })
                  }
                >
                  <SelectTrigger id="staff-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    <SelectItem value="staff">Staff (View Only)</SelectItem>
                    <SelectItem value="marketeer">Marketeer (Marketing & Recruitment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Access Levels:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong>Admin:</strong> Can view and edit all content</li>
                <li>• <strong>Staff:</strong> Can view all content but cannot make changes</li>
                <li>• <strong>Marketeer:</strong> Can edit Network & Recruitment and Marketing & Brand sections</li>
              </ul>
            </div>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
