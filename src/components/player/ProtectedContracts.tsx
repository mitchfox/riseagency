import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, Unlock, FileText, Download, Key } from "lucide-react";
import { toast } from "sonner";

interface LegalDocument {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string;
  file_url: string | null;
  effective_date: string | null;
}

interface ProtectedContractsProps {
  playerId: string;
}

export const ProtectedContracts = ({ playerId }: ProtectedContractsProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [contracts, setContracts] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Password reset state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('category', 'contract')
      .order('effective_date', { ascending: false });

    if (!error) {
      setContracts(data || []);
    }
    setLoading(false);
  };

  const handleUnlock = async () => {
    if (!password) {
      setError("Please enter a password");
      return;
    }

    // Fetch player's contracts password
    const { data, error } = await supabase
      .from('players')
      .select('contracts_password')
      .eq('id', playerId)
      .single();

    if (error) {
      setError("Error verifying password");
      return;
    }

    const storedPassword = data?.contracts_password || "12345";
    
    if (password === storedPassword) {
      setIsUnlocked(true);
      setError("");
      setPassword("");
    } else {
      setError("Incorrect password");
    }
  };

  const handleResetPassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    // Verify current password
    const { data, error: fetchError } = await supabase
      .from('players')
      .select('contracts_password')
      .eq('id', playerId)
      .single();

    if (fetchError) {
      toast.error("Error verifying password");
      return;
    }

    const storedPassword = data?.contracts_password || "12345";
    
    if (currentPassword !== storedPassword) {
      toast.error("Current password is incorrect");
      return;
    }

    // Update password
    const { error: updateError } = await supabase
      .from('players')
      .update({ contracts_password: newPassword })
      .eq('id', playerId);

    if (updateError) {
      toast.error("Error updating password");
      return;
    }

    toast.success("Password updated successfully");
    setShowResetDialog(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-muted/50 rounded-full p-6 mb-6">
          <Lock className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Contracts Protected</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Enter your password to access your contract documents.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="text-center"
            />
            {error && <p className="text-sm text-destructive mt-2 text-center">{error}</p>}
          </div>
          <Button onClick={handleUnlock} className="w-full">
            <Unlock className="h-4 w-4 mr-2" />
            Unlock Contracts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Unlock className="h-5 w-5 text-green-500" />
          <span className="text-sm text-muted-foreground">Contracts unlocked</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
          <Key className="h-4 w-4 mr-2" />
          Change Password
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading contracts...</div>
      ) : contracts.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No contracts available yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:bg-accent/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {contract.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contract.description && (
                  <p className="text-sm text-muted-foreground mb-3">{contract.description}</p>
                )}
                {contract.effective_date && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Effective: {new Date(contract.effective_date).toLocaleDateString()}
                  </p>
                )}
                {contract.content && (
                  <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap mb-3">
                    {contract.content}
                  </div>
                )}
                {contract.file_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(contract.file_url!, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your contracts access password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
              <Button onClick={handleResetPassword}>Update Password</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProtectedContracts;
