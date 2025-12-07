import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, Unlock, Building2, FileText, TrendingUp, MessageSquare, Key } from "lucide-react";
import { toast } from "sonner";
import { PlayerClubInterest } from "@/components/PlayerClubInterest";
import { PlayerTransferStatus } from "./PlayerTransferStatus";
import { PlayerAgentNotes } from "./PlayerAgentNotes";

interface PlayerTransferHubProps {
  playerId: string;
}

export const PlayerTransferHub = ({ playerId }: PlayerTransferHubProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("interest");
  
  // Password reset state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUnlock = async () => {
    if (!password) {
      setError("Please enter a password");
      return;
    }

    // Fetch player's contracts password (same password for both)
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
        <h3 className="text-xl font-semibold mb-2">Transfer Hub Protected</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Enter your password to access transfer information and club interest.
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
            Unlock Transfer Hub
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
          <span className="text-sm text-muted-foreground">Transfer Hub unlocked</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
          <Key className="h-4 w-4 mr-2" />
          Change Password
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 gap-2 h-auto p-2 bg-muted">
          <TabsTrigger value="interest" className="font-medium text-sm">
            <Building2 className="h-4 w-4 mr-2" />
            Club Interest
          </TabsTrigger>
          <TabsTrigger value="status" className="font-medium text-sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Transfer Status
          </TabsTrigger>
          <TabsTrigger value="notes" className="font-medium text-sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Agent Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interest" className="mt-6 space-y-6">
          <PlayerClubInterest playerId={playerId} />
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <PlayerTransferStatus playerId={playerId} />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <PlayerAgentNotes playerId={playerId} />
        </TabsContent>
      </Tabs>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your Transfer Hub access password
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
