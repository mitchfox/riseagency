import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, ChevronDown, ChevronRight, Users, FileText, Film, ListMusic, Calendar, CheckSquare, Target, LogIn, BarChart3, Search, Send, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Notification {
  id: string;
  event_type: string;
  title: string | null;
  body: string | null;
  event_data: any;
  created_at: string;
  read_by: string[];
}

interface StaffNotificationsDropdownProps {
  userId: string;
}

interface CategoryGroup {
  category: string;
  label: string;
  icon: React.ElementType;
  notifications: Notification[];
  unreadCount: number;
}

// Category configuration
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  visitor: { label: "Site Visitors", icon: Users },
  form_submission: { label: "Form Submissions", icon: FileText },
  clip_upload: { label: "Clip Uploads", icon: Film },
  playlist_change: { label: "Playlist Changes", icon: ListMusic },
  calendar_event: { label: "Calendar Events", icon: Calendar },
  task_assigned: { label: "Tasks Assigned", icon: CheckSquare },
  task_completed: { label: "Tasks Completed", icon: CheckSquare },
  goal_added: { label: "Goals Added", icon: Target },
  portal_login: { label: "Portal Logins", icon: LogIn },
  portal_performance_view: { label: "Performance Views", icon: BarChart3 },
  portal_analysis_view: { label: "Analysis Views", icon: Search },
  portal_transfer_submission: { label: "Transfer Submissions", icon: Send },
  portal_club_submission: { label: "Club Suggestions", icon: Building2 },
};

export const StaffNotificationsDropdown = ({ userId }: StaffNotificationsDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchNotifications = async () => {
    try {
      // Fetch last 7 days of notifications
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("staff_notification_events")
        .select("*")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("staff_notifications_dropdown")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_notification_events",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.read_by?.includes(userId)
  ).length;

  const groupNotificationsByCategory = (): CategoryGroup[] => {
    const groups: Map<string, CategoryGroup> = new Map();
    
    notifications.forEach((notification) => {
      const eventType = notification.event_type;
      const config = CATEGORY_CONFIG[eventType] || { label: "Other", icon: Bell };
      
      if (!groups.has(eventType)) {
        groups.set(eventType, {
          category: eventType,
          label: config.label,
          icon: config.icon,
          notifications: [],
          unreadCount: 0,
        });
      }
      
      const group = groups.get(eventType)!;
      group.notifications.push(notification);
      if (!notification.read_by?.includes(userId)) {
        group.unreadCount++;
      }
    });
    
    // Sort by unread count (most unread first), then by total count
    return Array.from(groups.values()).sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return b.notifications.length - a.notifications.length;
    });
  };

  const markAsRead = async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification || notification.read_by?.includes(userId)) return;

    const updatedReadBy = [...(notification.read_by || []), userId];
    
    const { error } = await supabase
      .from("staff_notification_events")
      .update({ read_by: updatedReadBy })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_by: updatedReadBy } : n
        )
      );
    }
  };

  const markCategoryAsRead = async (category: string) => {
    const categoryNotifications = notifications.filter(
      (n) => n.event_type === category && !n.read_by?.includes(userId)
    );

    for (const notification of categoryNotifications) {
      await markAsRead(notification.id);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.read_by?.includes(userId))
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    for (const id of unreadIds) {
      await markAsRead(id);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getNotificationTitle = (notification: Notification) => {
    if (notification.title) return notification.title;
    
    switch (notification.event_type) {
      case "visitor":
        return "New Visitor";
      case "form_submission":
        return "Form Submission";
      case "clip_upload":
        return "Clip Uploaded";
      case "playlist_change":
        return "Playlist Updated";
      case "calendar_event":
        return "Calendar Event Added";
      case "task_assigned":
        return "Task Assigned";
      case "task_completed":
        return "Task Completed";
      case "goal_added":
        return "New Goal Added";
      case "portal_login":
        return "Player Portal Login";
      case "portal_performance_view":
        return "Performance Report Viewed";
      case "portal_analysis_view":
        return "Analysis Viewed";
      case "portal_transfer_submission":
        return "Transfer Hub Submission";
      case "portal_club_submission":
        return "Club Suggestion Submitted";
      default:
        return "Notification";
    }
  };

  const formatLocation = (location: any) => {
    if (!location) return "";
    const parts = [location.city, location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  };

  const getNotificationBody = (notification: Notification) => {
    const data = notification.event_data;
    
    switch (notification.event_type) {
      case "visitor": {
        const page = data?.page || "/";
        const location = formatLocation(data?.location);
        if (location) {
          return `${location} • ${page}`;
        }
        return `Visited ${page}`;
      }
      case "form_submission":
        return data?.form_type ? `${data.form_type} form submitted` : "New form submission";
      case "clip_upload":
        return data?.player_name ? `Clip for ${data.player_name}` : "New clip uploaded";
      case "playlist_change":
        return data?.event ? `Playlist ${data.event.toLowerCase()}` : "Playlist updated";
      case "calendar_event":
        return data?.title ? `${data.title}` : "New event added to your calendar";
      case "task_assigned":
        return data?.title ? `${data.title}` : "You've been assigned a new task";
      case "task_completed":
        return data?.title ? `${data.title} marked complete` : "A task was completed";
      case "goal_added":
        return data?.title ? `${data.title}` : "A new goal was set";
      case "portal_login":
        return data?.player_name ? `${data.player_name} logged in` : "A player logged into their portal";
      case "portal_performance_view":
        return data?.player_name ? `${data.player_name} viewed their reports` : "Player viewed performance reports";
      case "portal_analysis_view":
        return data?.player_name ? `${data.player_name} viewed analysis` : "Player viewed analysis content";
      case "portal_transfer_submission":
        return data?.player_name ? `${data.player_name} made a submission` : "New transfer hub submission";
      case "portal_club_submission":
        return data?.player_name ? `${data.player_name} suggested a club` : "New club suggestion submitted";
      default:
        return notification.body || "";
    }
  };

  const categoryGroups = groupNotificationsByCategory();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-popover border border-border shadow-lg z-50"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications (Last 7 Days)</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : categoryGroups.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications in the last 7 days
            </div>
          ) : (
            <div className="p-1 space-y-1">
              {categoryGroups.map((group) => {
                const IconComponent = group.icon;
                const isExpanded = expandedCategories.has(group.category);
                
                return (
                  <Collapsible
                    key={group.category}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(group.category)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/50 rounded-md border border-transparent hover:border-border/50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                            <IconComponent className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-medium text-sm">{group.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {group.notifications.length}
                          </span>
                          {group.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                              {group.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 border-l border-border/50 pl-2 mt-1 mb-2">
                        {/* Mark category as read button */}
                        {group.unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-xs text-muted-foreground hover:text-foreground mb-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              markCategoryAsRead(group.category);
                            }}
                          >
                            <Check className="h-3 w-3 mr-1.5" />
                            Mark all {group.label.toLowerCase()} as read
                          </Button>
                        )}
                        
                        {group.notifications.slice(0, 10).map((notification) => {
                          const isRead = notification.read_by?.includes(userId);
                          return (
                            <div
                              key={notification.id}
                              className={`flex items-start gap-3 p-2.5 cursor-pointer rounded-md transition-colors ${
                                !isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                              }`}
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!isRead ? "font-medium" : ""}`}>
                                  {getNotificationTitle(notification)}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {getNotificationBody(notification)}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                  {format(new Date(notification.created_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                              {!isRead && (
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                          );
                        })}
                        
                        {group.notifications.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            +{group.notifications.length - 10} more
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
