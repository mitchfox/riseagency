import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, startOfDay, differenceInDays } from "date-fns";

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

interface GroupedNotifications {
  label: string;
  date: Date;
  notifications: Notification[];
  unreadCount: number;
}

export const StaffNotificationsDropdown = ({ userId }: StaffNotificationsDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["Today"]));

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

  const groupNotificationsByDay = (): GroupedNotifications[] => {
    const groups: Map<string, GroupedNotifications> = new Map();
    
    notifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      const dayStart = startOfDay(date);
      let label: string;
      
      if (isToday(date)) {
        label = "Today";
      } else if (isYesterday(date)) {
        label = "Yesterday";
      } else {
        const daysAgo = differenceInDays(new Date(), date);
        if (daysAgo <= 7) {
          label = format(date, "EEEE"); // Day name
        } else {
          label = format(date, "MMM d");
        }
      }
      
      const key = dayStart.toISOString();
      
      if (!groups.has(key)) {
        groups.set(key, {
          label,
          date: dayStart,
          notifications: [],
          unreadCount: 0,
        });
      }
      
      const group = groups.get(key)!;
      group.notifications.push(notification);
      if (!notification.read_by?.includes(userId)) {
        group.unreadCount++;
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
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

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.read_by?.includes(userId))
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    for (const id of unreadIds) {
      await markAsRead(id);
    }
  };

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const getNotificationIcon = (eventType: string) => {
    switch (eventType) {
      case "visitor":
        return "👁️";
      case "form_submission":
        return "📝";
      case "clip_upload":
        return "🎬";
      case "playlist_change":
        return "📋";
      case "calendar_event":
        return "📅";
      case "task_assigned":
        return "✅";
      case "task_completed":
        return "🎉";
      case "goal_added":
        return "🎯";
      case "portal_login":
        return "🚪";
      case "portal_performance_view":
        return "📊";
      case "portal_analysis_view":
        return "🔍";
      case "portal_transfer_submission":
        return "📤";
      case "portal_club_submission":
        return "🏢";
      default:
        return "🔔";
    }
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

  const getNotificationBody = (notification: Notification) => {
    if (notification.body) return notification.body;
    
    const data = notification.event_data;
    switch (notification.event_type) {
      case "visitor":
        return data?.page ? `Visited ${data.page}` : "New site visit";
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
        return "";
    }
  };

  const groupedNotifications = groupNotificationsByDay();

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
          ) : groupedNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications in the last 7 days
            </div>
          ) : (
            <div className="p-1">
              {groupedNotifications.map((group) => (
                <Collapsible
                  key={group.label}
                  open={expandedSections.has(group.label)}
                  onOpenChange={() => toggleSection(group.label)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2">
                        {expandedSections.has(group.label) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">{group.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {group.notifications.length} notification{group.notifications.length !== 1 ? 's' : ''}
                        </span>
                        {group.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                            {group.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {group.notifications.map((notification) => {
                      const isRead = notification.read_by?.includes(userId);
                      return (
                        <div
                          key={notification.id}
                          className={`flex items-start gap-3 p-3 cursor-pointer rounded-md ml-4 ${
                            !isRead ? "bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <span className="text-lg flex-shrink-0">
                            {getNotificationIcon(notification.event_type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!isRead ? "font-medium" : ""}`}>
                              {getNotificationTitle(notification)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {getNotificationBody(notification)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(notification.created_at), "h:mm a")}
                            </p>
                          </div>
                          {!isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
