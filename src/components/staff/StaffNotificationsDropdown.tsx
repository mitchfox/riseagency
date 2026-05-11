import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, ChevronDown, ChevronRight, Users, FileText, Film, ListMusic, Calendar, CheckSquare, Target, LogIn, BarChart3, Search, Send, Building2, TrendingUp, PenLine, GitCompare, Cake, ExternalLink, AlertOctagon, Activity, MessageSquare, Pencil, UserPlus } from "lucide-react";
import { ImprovementReportDialog } from "./ImprovementReportDialog";
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
  task_reminder: { label: "Task Reminders", icon: Bell },
  schedule_item_completed: { label: "Schedule Items Completed", icon: CheckSquare },
  goal_added: { label: "Goals Added", icon: Target },
  portal_login: { label: "Portal Logins", icon: LogIn },
  portal_performance_view: { label: "Performance Views", icon: BarChart3 },
  portal_analysis_view: { label: "Analysis Views", icon: Search },
  portal_transfer_submission: { label: "Transfer Submissions", icon: Send },
  portal_club_submission: { label: "Club Suggestions", icon: Building2 },
  performance_improvement: { label: "Performance Improvements", icon: TrendingUp },
  contract_signed: { label: "Contracts Signed", icon: PenLine },
  contract_event: { label: "Contract Events", icon: PenLine },
  comparison_request: { label: "Comparison Requests", icon: GitCompare },
  player_birthday: { label: "Player Birthdays", icon: Cake },
  player_turning_18: { label: "Player Birthdays", icon: Cake },
  fixture_countdown: { label: "Upcoming Fixtures", icon: Calendar },
  error_report: { label: "Error Reports", icon: AlertOctagon },
  staff_activity: { label: "Staff Activity", icon: Activity },
  message_sent: { label: "Messages Sent", icon: MessageSquare },
  player_updated: { label: "Player Updates", icon: Pencil },
  player_created: { label: "New Players", icon: UserPlus },
};

// Friendly fallback label derivation when an event_type is not pre-registered
const titleCaseFromEventType = (eventType: string): string => {
  return eventType
    .split(/[_-]/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
};

export const StaffNotificationsDropdown = ({ userId }: StaffNotificationsDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [improvementReport, setImprovementReport] = useState<any>(null);
  // Tick used to recompute live "in X hours" labels for fixture_countdown notifications
  // while the dropdown is open.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowTick(t => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

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

  // Map event types that should be merged into another category
  const MERGE_MAP: Record<string, string> = {
    player_turning_18: 'player_birthday',
  };

  const groupNotificationsByCategory = (): CategoryGroup[] => {
    const groups: Map<string, CategoryGroup> = new Map();
    
    notifications.forEach((notification) => {
      const rawType = notification.event_type;
      // Merge turning_18 into birthdays
      const eventType = MERGE_MAP[rawType] || rawType;
      const config = CATEGORY_CONFIG[eventType] || { label: titleCaseFromEventType(eventType), icon: Bell };

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
    // Include merged event types (e.g. player_turning_18 merges into player_birthday)
    const mergedTypes = Object.entries(MERGE_MAP)
      .filter(([, target]) => target === category)
      .map(([source]) => source);
    const allTypes = [category, ...mergedTypes];

    const categoryNotifications = notifications.filter(
      (n) => allTypes.includes(n.event_type) && !n.read_by?.includes(userId)
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
      case "performance_improvement":
        return "Performance Improvement";
      case "contract_signed":
        return "Contract Signed";
      case "comparison_request":
        return "Comparison Requested";
      case "player_birthday":
        return notification.event_data?.age ? `Player Turning ${notification.event_data.age}` : "Player Birthday";
      case "player_turning_18":
        return "Player Turning 18";
      default:
        return titleCaseFromEventType(notification.event_type);
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
      case "form_submission": {
        const form = data?.form_type ? String(data.form_type) : "form";
        const inner = data?.data || {};
        const name = inner.name || inner.fullName || inner.first_name;
        const dob = inner.dob || inner.date_of_birth;
        const club = inner.currentClub || inner.club;
        const position = inner.position;
        let age: number | null = null;
        if (dob) {
          const d = new Date(dob);
          if (!isNaN(d.getTime())) {
            const diff = Date.now() - d.getTime();
            age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
          }
        }
        const parts: string[] = [];
        if (name) parts.push(String(name));
        if (age != null) parts.push(`age ${age}`);
        if (position) parts.push(String(position));
        if (club) parts.push(String(club));
        if (parts.length === 0) return `${form} form submitted`;
        return `${form}: ${parts.join(" • ")}`;
      }
      case "clip_upload":
        return data?.player_name ? `Clip for ${data.player_name}` : "New clip uploaded";
      case "playlist_change":
        return data?.event ? `Playlist ${data.event.toLowerCase()}` : "Playlist updated";
      case "calendar_event": {
        const title = data?.title || "Event";
        const when = data?.event_date || data?.start_date || data?.date;
        if (when) {
          const d = new Date(when);
          if (!isNaN(d.getTime())) {
            return `${title} • ${format(d, "EEE d MMM, h:mm a")}`;
          }
        }
        return String(title);
      }
      case "task_assigned": {
        const title = data?.title || data?.task_title || "Task";
        const due = data?.due_date || data?.due_at;
        const assigner = data?.assigned_by_name;
        const parts = [String(title)];
        if (due) {
          const d = new Date(due);
          if (!isNaN(d.getTime())) parts.push(`due ${format(d, "EEE d MMM")}`);
        }
        if (assigner) parts.push(`from ${assigner}`);
        return parts.join(" • ");
      }
      case "task_completed": {
        const title = data?.task_title || data?.title || "A task";
        const who = data?.user_name;
        return who ? `${who} completed ${title}` : `${title} marked complete`;
      }
      case "task_reminder": {
        const title = data?.title || data?.task_title || "Task";
        const due = data?.due_date || data?.due_at;
        if (due) {
          const d = new Date(due);
          if (!isNaN(d.getTime())) return `${title} • due ${format(d, "EEE d MMM")}`;
        }
        return String(title);
      }
      case "schedule_item_completed": {
        const who = data?.user_name || "Someone";
        const postType = data?.post_type;
        const fmt = data?.platform_format;
        const parts = [`${who} completed`];
        if (postType) parts.push(String(postType));
        if (fmt) parts.push(`(${fmt})`);
        return parts.join(" ");
      }
      case "goal_added":
        return data?.title ? `${data.title}` : "A new goal was set";
      case "portal_login": {
        const name = data?.player_name || data?.player_email || "A player";
        const when = format(new Date(notification.created_at), "EEE d MMM, h:mm a");
        return `${name} logged in at ${when}`;
      }
      case "portal_performance_view": {
        const name = data?.player_name || "A player";
        return `${name} opened their performance reports`;
      }
      case "portal_analysis_view": {
        const name = data?.player_name || "A player";
        const sub = data?.sub_tab ? ` (${String(data.sub_tab).replace(/-/g, ' ')})` : "";
        return `${name} opened analysis${sub}`;
      }
      case "portal_transfer_submission":
        return data?.player_name ? `${data.player_name} made a submission` : "New transfer hub submission";
      case "portal_club_submission":
        return data?.player_name ? `${data.player_name} suggested a club` : "New club suggestion submitted";
      case "performance_improvement": {
        const improvements = data?.improvements || [];
        const playerName = data?.player_name || "Player";
        const opponent = data?.opponent || "";
        const r90Current = data?.r90_current;
        const r90Previous = data?.r90_previous;
        const parts: string[] = [];
        if (opponent) parts.push(`vs ${opponent}`);
        if (r90Previous != null && r90Current != null) {
          parts.push(`R90: ${Number(r90Previous).toFixed(2)} → ${Number(r90Current).toFixed(2)}`);
        }
        if (improvements.length > 1) parts.push(`+${improvements.length - (r90Current ? 1 : 0)} more`);
        return `${playerName} ${parts.join(' · ')}`;
      }
      case "contract_signed":
        return data?.player_name ? `${data.player_name} signed a contract` : "New contract signed";
      case "comparison_request":
        return data?.player_name ? `Comparison requested for ${data.player_name}` : "New comparison request";
      case "player_birthday": {
        const name = data?.player_name || "Player";
        const age = data?.age;
        const club = data?.club;
        const parts = [`${name} turns ${age || '?'} today`];
        if (club) parts.push(String(club));
        return parts.join(" • ");
      }
      case "player_turning_18": {
        const name = data?.player_name || "Player";
        const club = data?.club;
        return club ? `${name} turns 18 today • ${club}` : `${name} turns 18 today`;
      }
      case "player_contactable_age": {
        const name = data?.player_name || "Player";
        const minAge = data?.min_contact_age;
        const club = data?.club;
        const country = data?.country;
        const parts = [`${name} now contactable${minAge ? ` (age ${minAge}+)` : ''}`];
        if (club) parts.push(String(club));
        if (country) parts.push(String(country));
        return parts.join(" • ");
      }
      case "error_report": {
        const route = data?.route || "unknown route";
        const ctx = data?.context;
        return ctx ? `${route} • ${String(ctx).slice(0, 80)}` : String(route);
      }
      case "fixture_countdown": {
        const matchDate = data?.match_date as string | undefined;
        const matchTime = (data?.match_time as string | undefined) || "15:00";
        const home = data?.home_team || "Home";
        const away = data?.away_team || "Away";
        const competition = data?.competition;
        const venue = data?.venue && data.venue !== "TBD" ? data.venue : null;
        if (!matchDate) return notification.body || `${home} vs ${away}`;
        const kickoff = new Date(`${matchDate}T${matchTime || "15:00"}:00`).getTime();
        const diffMs = kickoff - Date.now();
        let when: string;
        if (diffMs <= -90 * 60_000) {
          when = "kicked off earlier";
        } else if (diffMs <= 0) {
          when = "kicking off now";
        } else {
          const totalMins = Math.round(diffMs / 60_000);
          if (totalMins < 60) {
            when = `in ${totalMins} minute${totalMins === 1 ? "" : "s"}`;
          } else {
            const totalHours = Math.round(diffMs / 3_600_000);
            if (totalHours < 24) {
              when = `in ${totalHours} hour${totalHours === 1 ? "" : "s"}`;
            } else {
              const days = Math.floor(totalHours / 24);
              const hours = totalHours % 24;
              when = hours > 0
                ? `in ${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`
                : `in ${days} day${days === 1 ? "" : "s"}`;
            }
          }
        }
        // Show the actual match date/kickoff, not the notification's created_at
        const dateLabel = format(new Date(`${matchDate}T${matchTime || "15:00"}:00`), "EEE d MMM, HH:mm");
        const tail = [competition, venue].filter(Boolean).join(" • ");
        const head = `${home} vs ${away} • ${dateLabel} (${when})`;
        return tail ? `${head} • ${tail}` : head;
      }
      default:
        return notification.body || "";
    }
  };

  const categoryGroups = groupNotificationsByCategory();

  return (
    <>
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
        side="bottom"
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
                          const isImprovement = notification.event_type === 'performance_improvement';
                          const improvementData = isImprovement ? notification.event_data : null;
                          
                          return (
                            <div
                              key={notification.id}
                              className={`flex items-start gap-3 p-2.5 cursor-pointer rounded-md transition-colors ${
                                !isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                              }`}
                              onClick={() => {
                                markAsRead(notification.id);
                                if (
                                  notification.event_type === "player_birthday" ||
                                  notification.event_type === "player_turning_18"
                                ) {
                                  window.dispatchEvent(
                                    new CustomEvent("openPlayerBirthday", {
                                      detail: notification.event_data || {},
                                    })
                                  );
                                  setOpen(false);
                                }
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!isRead ? "font-medium" : ""}`}>
                                  {getNotificationTitle(notification)}
                                  {notification.event_data?.cross_site_source_label && (
                                    <span className="ml-2 text-[10px] uppercase tracking-wider text-primary border border-primary/30 rounded px-1.5 py-0.5 align-middle">
                                      {notification.event_data.cross_site_source_label}
                                    </span>
                                  )}
                                </p>
                                
                                {/* Rich improvement report card */}
                                {isImprovement && improvementData?.improvements?.length > 0 ? (
                                  <div className="mt-1.5 space-y-1.5">
                                    <p className="text-xs text-muted-foreground">
                                      {improvementData.player_name} vs {improvementData.opponent}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1">
                                      {(improvementData.improvements as string[]).map((imp: string, i: number) => {
                                        const hasArrow = imp.includes('→');
                                        const hasPct = imp.includes('+');
                                        return (
                                          <div key={i} className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
                                            <TrendingUp className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                            <span className="text-[10px] text-emerald-400 truncate">{imp}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300 px-2 mt-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setImprovementReport(improvementData);
                                        setOpen(false);
                                      }}
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      View Report
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {getNotificationBody(notification)}
                                  </p>
                                )}
                                
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                  {(() => {
                                    const d = notification.event_data;
                                    // For fixture countdowns, surface the match's kickoff date instead
                                    // of when the reminder fired.
                                    if (notification.event_type === "fixture_countdown" && d?.match_date) {
                                      const t = d.match_time || "15:00";
                                      const dt = new Date(`${d.match_date}T${t}:00`);
                                      if (!isNaN(dt.getTime())) return `Kickoff ${format(dt, "EEE d MMM, HH:mm")}`;
                                    }
                                    if (notification.event_type === "calendar_event" && (d?.event_date || d?.start_date || d?.date)) {
                                      const dt = new Date(d.event_date || d.start_date || d.date);
                                      if (!isNaN(dt.getTime())) return format(dt, "EEE d MMM, h:mm a");
                                    }
                                    if ((notification.event_type === "task_assigned" || notification.event_type === "task_reminder") && (d?.due_date || d?.due_at)) {
                                      const dt = new Date(d.due_date || d.due_at);
                                      if (!isNaN(dt.getTime())) return `Due ${format(dt, "EEE d MMM")}`;
                                    }
                                    return format(new Date(notification.created_at), "MMM d, h:mm a");
                                  })()}
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

    <ImprovementReportDialog
      open={!!improvementReport}
      onOpenChange={(o) => { if (!o) setImprovementReport(null); }}
      data={improvementReport}
    />
    </>
  );
};
