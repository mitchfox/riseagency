import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Users, Eye, FileText, Film, ClipboardList, Loader2, Save, Calendar, CheckSquare, Target, PartyPopper, LogIn, BarChart3, FileSearch, Send, Building2, Lightbulb, RefreshCw, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSetting {
  id: string;
  role: string;
  event_type: string;
  enabled: boolean;
}

const EVENT_TYPES = [
  // Site & Content
  { id: "visitor", label: "Site Visitors", icon: Eye, description: "When someone visits the site", category: "Site & Content" },
  { id: "form_submission", label: "Form Submissions", icon: FileText, description: "When a form is submitted", category: "Site & Content" },
  { id: "clip_upload", label: "Clip Uploads", icon: Film, description: "When a new clip is uploaded", category: "Site & Content" },
  { id: "playlist_change", label: "Playlist Changes", icon: ClipboardList, description: "When playlists are modified", category: "Site & Content" },
  // Staff Actions
  { id: "calendar_event", label: "Calendar Events", icon: Calendar, description: "When schedule items are added to their calendar", category: "Staff Actions" },
  { id: "task_assigned", label: "Task Assignments", icon: CheckSquare, description: "When tasks are assigned to someone", category: "Staff Actions" },
  { id: "task_completed", label: "Task Completions", icon: PartyPopper, description: "When a task is marked complete", category: "Staff Actions" },
  { id: "goal_added", label: "Goals Added", icon: Target, description: "When new goals are set", category: "Staff Actions" },
  // Portal Activity
  { id: "portal_login", label: "Portal Logins", icon: LogIn, description: "When a player logs into their portal", category: "Portal Activity" },
  { id: "portal_performance_view", label: "Performance Report Views", icon: BarChart3, description: "When a player views their performance reports", category: "Portal Activity" },
  { id: "portal_analysis_view", label: "Analysis Views", icon: FileSearch, description: "When a player views analysis content", category: "Portal Activity" },
  { id: "portal_transfer_submission", label: "Transfer Hub Submissions", icon: Send, description: "When a player submits in their transfer hub", category: "Portal Activity" },
  { id: "portal_club_submission", label: "Club Submissions", icon: Building2, description: "When a player submits a club suggestion", category: "Portal Activity" },
  // Marketing
  { id: "post_idea_new", label: "New Post Ideas", icon: Lightbulb, description: "When a new post idea is created", category: "Marketing" },
  { id: "post_idea_status", label: "Post Idea Status Changes", icon: RefreshCw, description: "When a post idea status changes", category: "Marketing" },
  { id: "post_idea_canva", label: "Canva Link Added", icon: Link, description: "When a Canva link is added to a post idea", category: "Marketing" },
  { id: "post_moved_to_schedule", label: "Post Moved to Schedule", icon: Calendar, description: "When a post is moved to schedule/ready to post", category: "Marketing" },
  { id: "post_posted", label: "Post Marked as Posted", icon: CheckSquare, description: "When a post is marked as posted", category: "Marketing" },
  { id: "post_image_added", label: "Image/Link Added to Post", icon: Film, description: "When an image or link is added to a post", category: "Marketing" },
  { id: "marketing_tip_new", label: "New Marketing Tip", icon: Lightbulb, description: "When a new tip, idea or lesson is added", category: "Marketing" },
  // Contracts
  { id: "contract_signed", label: "Contract Signed", icon: FileText, description: "When a contract is signed by the other party", category: "Contracts" },
];

const ROLES = [
  { id: "admin", label: "Admin", color: "bg-red-500" },
  { id: "staff", label: "Staff", color: "bg-blue-500" },
  { id: "marketeer", label: "Marketeer", color: "bg-green-500" },
];

export const NotificationSettingsManagement = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_notification_settings")
        .select("*")
        .order("role")
        .order("event_type");

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      toast.error("Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  const getSettingKey = (role: string, eventType: string) => `${role}-${eventType}`;

  const isEnabled = (role: string, eventType: string) => {
    const key = getSettingKey(role, eventType);
    if (changes.has(key)) {
      return changes.get(key)!;
    }
    const setting = settings.find(s => s.role === role && s.event_type === eventType);
    return setting?.enabled ?? false;
  };

  const toggleSetting = (role: string, eventType: string) => {
    const key = getSettingKey(role, eventType);
    const currentValue = isEnabled(role, eventType);
    const newChanges = new Map(changes);
    newChanges.set(key, !currentValue);
    setChanges(newChanges);
  };

  const saveChanges = async () => {
    if (changes.size === 0) return;

    setSaving(true);
    try {
      for (const [key, enabled] of changes.entries()) {
        const [role, eventType] = key.split("-");
        const existingSetting = settings.find(s => s.role === role && s.event_type === eventType);

        if (existingSetting) {
          const { error } = await supabase
            .from("staff_notification_settings")
            .update({ enabled })
            .eq("id", existingSetting.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("staff_notification_settings")
            .insert({ role, event_type: eventType, enabled });
          
          if (error) throw error;
        }
      }

      toast.success("Notification settings saved");
      setChanges(new Map());
      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          {changes.size > 0 && (
            <Button onClick={saveChanges} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes ({changes.size})
            </Button>
          )}
        </div>
        <CardDescription>
          Configure which notification types each role receives. Only you (head admin) can modify these settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Notification Type</th>
                {ROLES.map(role => (
                  <th key={role.id} className="text-center py-3 px-4">
                    <Badge variant="outline" className={`${role.color} text-white border-0`}>
                      {role.label}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_TYPES.map(eventType => {
                const Icon = eventType.icon;
                return (
                  <tr key={eventType.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{eventType.label}</p>
                          <p className="text-xs text-muted-foreground">{eventType.description}</p>
                        </div>
                      </div>
                    </td>
                    {ROLES.map(role => (
                      <td key={role.id} className="text-center py-4 px-4">
                        <Switch
                          checked={isEnabled(role.id, eventType.id)}
                          onCheckedChange={() => toggleSetting(role.id, eventType.id)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
