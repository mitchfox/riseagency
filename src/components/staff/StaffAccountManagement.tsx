import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";

interface StaffAccount {
  email: string;
  password: string;
  role: "admin" | "staff";
  full_name: string;
}

export const StaffAccountManagement = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAccount, setNewAccount] = useState<StaffAccount>({
    email: "",
    password: "",
    role: "staff",
    full_name: "",
  });

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(newAccount),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create account");
      }

      toast.success(`${newAccount.role === "admin" ? "Admin" : "Staff"} account created successfully`);
      setNewAccount({
        email: "",
        password: "",
        role: "staff",
        full_name: "",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Staff Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  value={newAccount.full_name}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, full_name: e.target.value })
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
                  onValueChange={(value: "admin" | "staff") =>
                    setNewAccount({ ...newAccount, role: value })
                  }
                >
                  <SelectTrigger id="staff-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    <SelectItem value="staff">Staff (View Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Access Levels:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong>Admin:</strong> Can view and edit all content</li>
                <li>• <strong>Staff:</strong> Can view all content but cannot make changes</li>
              </ul>
            </div>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create the required accounts for Rise Football Agency:
          </p>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Master Accounts (Admin):</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• jolonlevene98@gmail.com</li>
              <li>• jolon.levene@risefootballagency.com</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Staff Accounts (View Only):</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• kuda.butawo@risefootballagency.com</li>
              <li>• anthony.odum@risefootballagency.com</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
