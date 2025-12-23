import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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

export const StaffNotificationsDropdown = ({ userId }: StaffNotificationsDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_notification_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

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
          setNotifications((prev) => [payload.new as Notification, ...prev.slice(0, 49)]);
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
      default:
        return "";
    }
  };

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
          <span>Notifications</span>
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
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => {
              const isRead = notification.read_by?.includes(userId);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${
                    !isRead ? "bg-primary/5" : ""
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
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
