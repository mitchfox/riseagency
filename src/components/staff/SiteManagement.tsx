import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, Shield, AlertTriangle, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ComponentLock {
  id: string;
  component_name: string;
  component_path: string | null;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  description: string | null;
}

export const SiteManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [components, setComponents] = useState<ComponentLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    componentId: string;
    componentName: string;
    action: 'lock' | 'unlock';
  }>({ open: false, componentId: '', componentName: '', action: 'lock' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('component_locks')
        .select('*')
        .order('component_name');

      if (error) throw error;
      setComponents(data || []);
    } catch (error: any) {
      console.error('Error fetching components:', error);
      toast.error('Failed to load components');
    } finally {
      setLoading(false);
    }
  };

  const handleLockToggle = (component: ComponentLock) => {
    setConfirmDialog({
      open: true,
      componentId: component.id,
      componentName: component.component_name,
      action: component.is_locked ? 'unlock' : 'lock'
    });
  };

  const confirmLockToggle = async () => {
    if (!isAdmin) {
      toast.error('Only admins can lock/unlock components');
      return;
    }

    try {
      const { action, componentId, componentName } = confirmDialog;
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('component_locks')
        .update({
          is_locked: action === 'lock',
          locked_by: action === 'lock' ? user?.id : null,
          locked_at: action === 'lock' ? new Date().toISOString() : null
        })
        .eq('id', componentId);

      if (error) throw error;

      toast.success(`${componentName} ${action === 'lock' ? 'locked' : 'unlocked'} successfully`);
      fetchComponents();
      setConfirmDialog({ open: false, componentId: '', componentName: '', action: 'lock' });
    } catch (error: any) {
      console.error('Error toggling lock:', error);
      toast.error('Failed to update component lock status');
    }
  };

  const getStatusColor = (isLocked: boolean) => {
    return isLocked ? 'destructive' : 'secondary';
  };

  const generateCustomKnowledge = () => {
    const lockedComponents = components.filter(c => c.is_locked && c.component_path);
    const fileList = lockedComponents.map(c => `- ${c.component_path}`).join('\n');
    
    return `CRITICAL: The following files are LOCKED and must NEVER be edited without explicit user approval:

${fileList}

Before editing ANY of these files, the AI must:
1. Check if the file is in the locked list above
2. Ask for explicit user confirmation: "This file is locked. Do you want me to edit it anyway?"
3. Wait for user approval before proceeding
4. If user declines, provide alternative solutions that don't require editing locked files

These locks are enforced to prevent accidental modifications to critical system components.`;
  };

  const copyCustomKnowledge = async () => {
    try {
      const text = generateCustomKnowledge();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Custom Knowledge text copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const lockedCount = components.filter(c => c.is_locked).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading components...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                Site Component Management
              </CardTitle>
              <CardDescription>
                Lock critical components to prevent accidental modifications
              </CardDescription>
            </div>
            <Badge variant={lockedCount > 0 ? "destructive" : "secondary"} className="text-xs sm:text-sm">
              {lockedCount} Locked
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* AI Enforcement Warning */}
      <Card className="border-blue-500/50 bg-blue-500/10">
        <CardContent className="py-4 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-blue-500 text-sm">AI Enforcement Required</p>
              <p className="text-sm text-muted-foreground">
                Database locks track status but cannot technically prevent AI edits. To enforce protection, you must add the locked files list to your project's <strong>Custom Knowledge</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={copyCustomKnowledge}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  disabled={lockedCount === 0}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Protected Files List
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open('/settings', '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Project Settings
                </Button>
              </div>
            </div>
          </div>
          <div className="pl-8 text-xs text-muted-foreground space-y-1 border-l-2 border-blue-500/30">
            <p className="font-medium">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "Copy Protected Files List" above</li>
              <li>Go to Settings → Manage Knowledge</li>
              <li>Paste the copied text into Custom Knowledge</li>
              <li>Save changes</li>
            </ol>
            <p className="pt-2 italic">The AI will then ask for confirmation before editing any locked files.</p>
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-500 mb-1">View Only Mode</p>
              <p className="text-muted-foreground">
                Only administrators can lock or unlock components. Contact an admin to modify component lock status.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {components.map((component) => (
          <Card 
            key={component.id} 
            className={`transition-all ${component.is_locked ? 'border-red-500/50 bg-red-500/5' : ''}`}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-2">
                      {component.component_name}
                    </h3>
                    {component.component_path && (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {component.component_path}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {component.is_locked ? (
                      <Lock className="w-5 h-5 text-red-500" />
                    ) : (
                      <Unlock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {component.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {component.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant={getStatusColor(component.is_locked)} className="text-xs">
                    {component.is_locked ? 'Locked' : 'Unlocked'}
                  </Badge>
                  {isAdmin && (
                    <Switch
                      checked={component.is_locked}
                      onCheckedChange={() => handleLockToggle(component)}
                      aria-label={`Toggle lock for ${component.component_name}`}
                    />
                  )}
                </div>

                {component.is_locked && component.locked_at && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <p>Locked {new Date(component.locked_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent className="w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'lock' ? 'Lock Component' : 'Unlock Component'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'lock' ? (
                <>
                  Are you sure you want to lock <strong>{confirmDialog.componentName}</strong>?
                  <br /><br />
                  This will prevent any modifications to this component until it is unlocked.
                </>
              ) : (
                <>
                  Are you sure you want to unlock <strong>{confirmDialog.componentName}</strong>?
                  <br /><br />
                  This will allow modifications to this component.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLockToggle}>
              {confirmDialog.action === 'lock' ? 'Lock Component' : 'Unlock Component'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
