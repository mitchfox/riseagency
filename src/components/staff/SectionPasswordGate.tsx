import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lock, Settings, Trash2 } from "lucide-react";

interface SectionPasswordGateProps {
  sectionName: string;
  children: React.ReactNode;
  isAdmin?: boolean;
}

const SectionPasswordGate = ({ sectionName, children, isAdmin = false }: SectionPasswordGateProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    checkPassword();
  }, [sectionName]);

  const checkPassword = async () => {
    const { data, error } = await supabase
      .from('staff_section_passwords')
      .select('*')
      .eq('section_name', sectionName)
      .maybeSingle();

    if (error) {
      console.error('Error checking section password:', error);
      setLoading(false);
      setIsUnlocked(true); // Allow access if there's an error checking
      return;
    }

    if (data) {
      setHasPassword(true);
      // Check if already unlocked in session
      const sessionKey = `section_unlocked_${sectionName}`;
      if (sessionStorage.getItem(sessionKey) === 'true') {
        setIsUnlocked(true);
      }
    } else {
      setHasPassword(false);
      setIsUnlocked(true);
    }
    setLoading(false);
  };

  const handleUnlock = async () => {
    if (!password.trim()) {
      toast.error('Please enter a password');
      return;
    }

    const { data, error } = await supabase
      .from('staff_section_passwords')
      .select('password_hash')
      .eq('section_name', sectionName)
      .single();

    if (error || !data) {
      toast.error('Error verifying password');
      return;
    }

    // Simple hash comparison (in production, use proper hashing)
    const inputHash = btoa(password);
    if (inputHash === data.password_hash) {
      setIsUnlocked(true);
      sessionStorage.setItem(`section_unlocked_${sectionName}`, 'true');
      toast.success('Section unlocked');
    } else {
      toast.error('Incorrect password');
    }
    setPassword("");
  };

  const handleSetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    const passwordHash = btoa(newPassword);

    const { error } = await supabase
      .from('staff_section_passwords')
      .upsert({
        section_name: sectionName,
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'section_name' });

    if (error) {
      console.error('Error setting password:', error);
      toast.error('Failed to set password');
      return;
    }

    toast.success('Section password set');
    setShowSetPasswordDialog(false);
    setNewPassword("");
    setConfirmPassword("");
    setHasPassword(true);
    // Keep unlocked since admin just set it
    setIsUnlocked(true);
    sessionStorage.setItem(`section_unlocked_${sectionName}`, 'true');
  };

  const handleRemovePassword = async () => {
    const { error } = await supabase
      .from('staff_section_passwords')
      .delete()
      .eq('section_name', sectionName);

    if (error) {
      console.error('Error removing password:', error);
      toast.error('Failed to remove password');
      return;
    }

    toast.success('Section password removed');
    setHasPassword(false);
    setIsUnlocked(true);
    sessionStorage.removeItem(`section_unlocked_${sectionName}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isUnlocked && hasPassword) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Lock className="h-16 w-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">Password Protected</h2>
        <p className="text-muted-foreground mb-6">This section requires a password to access</p>
        
        <div className="w-full max-w-sm space-y-4">
          <div>
            <Label htmlFor="section-password">Password</Label>
            <Input
              id="section-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter password"
            />
          </div>
          <Button onClick={handleUnlock} className="w-full">
            Unlock Section
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Admin password management controls */}
      {isAdmin && (
        <div className="flex justify-end mb-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSetPasswordDialog(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {hasPassword ? 'Change Password' : 'Set Password'}
          </Button>
          {hasPassword && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemovePassword}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove Password
            </Button>
          )}
        </div>
      )}

      {children}

      {/* Set Password Dialog */}
      <Dialog open={showSetPasswordDialog} onOpenChange={setShowSetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hasPassword ? 'Change Section Password' : 'Set Section Password'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword}>
              {hasPassword ? 'Update Password' : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SectionPasswordGate;
