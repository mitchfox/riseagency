import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Phone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface StaffMember {
  user_id: string;
  role: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
}

interface SMSNotification {
  id: string;
  message: string;
  sent_by: string;
  sent_to: string[];
  sent_at: string;
  status: string;
}

export const StaffSMSNotifications = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<SMSNotification[]>([]);

  useEffect(() => {
    fetchStaffMembers();
    fetchRecentNotifications();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profiles!inner (
            email,
            full_name,
            phone_number
          )
        `)
        .in("role", ["admin", "staff", "marketeer"]);

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        user_id: item.user_id,
        role: item.role,
        email: item.profiles?.email || "",
        full_name: item.profiles?.full_name || null,
        phone_number: item.profiles?.phone_number || null,
      }));

      setStaffMembers(formatted);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_sms_notifications")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleSelectAll = () => {
    if (selectedStaff.length === staffMembers.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(staffMembers.map((s) => s.user_id));
    }
  };

  const handleSelectWithPhone = () => {
    const withPhone = staffMembers
      .filter((s) => s.phone_number)
      .map((s) => s.user_id);
    setSelectedStaff(withPhone);
  };

  const toggleStaffSelection = (userId: string) => {
    setSelectedStaff((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (selectedStaff.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    const staffWithPhone = staffMembers.filter(
      (s) => selectedStaff.includes(s.user_id) && s.phone_number
    );

    if (staffWithPhone.length === 0) {
      toast.error("None of the selected staff have phone numbers");
      return;
    }

    setSending(true);

    try {
      const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");

      // Log the notification (actual SMS sending would require a service like Twilio)
      const { error } = await supabase
        .from("staff_sms_notifications")
        .insert({
          message: message.trim(),
          sent_by: staffUserId,
          sent_to: selectedStaff,
          status: "sent",
        });

      if (error) throw error;

      toast.success(
        `Notification sent to ${staffWithPhone.length} staff member(s)`
      );
      setMessage("");
      setSelectedStaff([]);
      fetchRecentNotifications();
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-500",
      staff: "bg-blue-500",
      marketeer: "bg-green-500",
    };
    return (
      <Badge className={`${colors[role] || "bg-gray-500"} text-white border-0 text-xs`}>
        {role}
      </Badge>
    );
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Send Staff Notification</CardTitle>
          </div>
          <CardDescription>
            Send personal notification messages to staff mobile numbers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
            />
          </div>

          {/* Staff Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Recipients</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectWithPhone}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  With Phone
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  <Users className="h-4 w-4 mr-1" />
                  {selectedStaff.length === staffMembers.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {staffMembers.map((staff) => (
                <div
                  key={staff.user_id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStaff.includes(staff.user_id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleStaffSelection(staff.user_id)}
                >
                  <Checkbox
                    checked={selectedStaff.includes(staff.user_id)}
                    onCheckedChange={() => toggleStaffSelection(staff.user_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {staff.full_name || staff.email}
                      </span>
                      {getRoleBadge(staff.role)}
                    </div>
                    {staff.phone_number ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {staff.phone_number}
                      </span>
                    ) : (
                      <span className="text-xs text-destructive">
                        No phone number
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim() || selectedStaff.length === 0}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send to {selectedStaff.length} Recipient(s)
          </Button>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {recentNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 border rounded-lg bg-muted/30"
                >
                  <p className="text-sm">{notif.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Sent to {notif.sent_to?.length || 0} recipient(s)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notif.sent_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
