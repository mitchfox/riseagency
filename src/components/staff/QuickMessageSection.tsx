import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, Settings, Plus, Trash2, Edit2, Phone } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  club_name: string | null;
  phone: string | null;
}

interface QuickMessage {
  id: string;
  message_title: string;
  message_content: string;
  recipient_type: string;
}

export const QuickMessageSection = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string>("");
  const [messageContent, setMessageContent] = useState("");
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<QuickMessage | null>(null);
  const [newMessageTitle, setNewMessageTitle] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [newMessageCategory, setNewMessageCategory] = useState("");

  useEffect(() => {
    fetchContacts();
    fetchQuickMessages();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("club_network_contacts")
      .select("id, name, club_name, phone")
      .not("phone", "is", null)
      .neq("phone", "")
      .order("name");
    
    if (error) {
      console.error("Error fetching contacts:", error);
      return;
    }
    setContacts(data || []);
  };

  const fetchQuickMessages = async () => {
    const { data, error } = await supabase
      .from("marketing_templates")
      .select("*")
      .order("recipient_type");
    
    if (error) {
      console.error("Error fetching quick messages:", error);
      return;
    }
    setQuickMessages(data || []);
  };

  const handleContactSelect = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    setSelectedContact(contact || null);
    updateMessageWithVariables(messageContent, contact || null);
  };

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessageId(messageId);
    if (messageId === "custom") {
      setMessageContent("");
      return;
    }
    const message = quickMessages.find(m => m.id === messageId);
    if (message) {
      updateMessageWithVariables(message.message_content, selectedContact);
    }
  };

  const updateMessageWithVariables = (content: string, contact: Contact | null) => {
    if (!contact) {
      setMessageContent(content);
      return;
    }
    const updated = content
      .replace(/\{\{contact_name\}\}/g, contact.name)
      .replace(/\{\{club_name\}\}/g, contact.club_name || "");
    setMessageContent(updated);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, "");
    // Ensure it starts with country code
    if (!cleaned.startsWith("+")) {
      // Assume UK if no country code
      if (cleaned.startsWith("0")) {
        cleaned = "+44" + cleaned.substring(1);
      } else {
        cleaned = "+" + cleaned;
      }
    }
    return cleaned.replace("+", "");
  };

  const handleSendWhatsApp = () => {
    if (!selectedContact || !selectedContact.phone) {
      toast.error("Please select a contact with a phone number");
      return;
    }
    if (!messageContent.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const phoneNumber = formatPhoneNumber(selectedContact.phone);
    const encodedMessage = encodeURIComponent(messageContent);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const handleSaveMessage = async () => {
    if (!newMessageTitle.trim() || !newMessageContent.trim()) {
      toast.error("Title and message content are required");
      return;
    }

    if (editingMessage) {
      const { error } = await supabase
        .from("marketing_templates")
        .update({
          message_title: newMessageTitle,
          message_content: newMessageContent,
          recipient_type: newMessageCategory || "General",
        })
        .eq("id", editingMessage.id);

      if (error) {
        toast.error("Failed to update message");
        return;
      }
      toast.success("Message updated");
    } else {
      const { error } = await supabase
        .from("marketing_templates")
        .insert({
          message_title: newMessageTitle,
          message_content: newMessageContent,
          recipient_type: newMessageCategory || "General",
        });

      if (error) {
        toast.error("Failed to save message");
        return;
      }
      toast.success("Message saved");
    }

    resetForm();
    fetchQuickMessages();
    setIsAddOpen(false);
  };

  const handleDeleteMessage = async (id: string) => {
    const { error } = await supabase
      .from("marketing_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete message");
      return;
    }
    toast.success("Message deleted");
    fetchQuickMessages();
  };

  const handleEditMessage = (message: QuickMessage) => {
    setEditingMessage(message);
    setNewMessageTitle(message.message_title);
    setNewMessageContent(message.message_content);
    setNewMessageCategory(message.recipient_type || "");
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setEditingMessage(null);
    setNewMessageTitle("");
    setNewMessageContent("");
    setNewMessageCategory("");
  };

  return (
    <div className="space-y-4">
      {/* Message Writer Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Quick WhatsApp Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Selector */}
            <div className="space-y-2">
              <Label>Select Contact</Label>
              <Select onValueChange={handleContactSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No contacts with phone numbers
                    </SelectItem>
                  ) : (
                    contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.club_name ? `- ${contact.club_name}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedContact && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <Phone className="w-4 h-4" />
                  {selectedContact.phone}
                </div>
              )}
            </div>

            {/* Quick Message Selector */}
            <div className="space-y-2">
              <Label>Quick Message Template</Label>
              <Select value={selectedMessageId} onValueChange={handleMessageSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template or write custom..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">✏️ Write custom message</SelectItem>
                  {quickMessages.map((msg) => (
                    <SelectItem key={msg.id} value={msg.id}>
                      {msg.message_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message Preview/Editor */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type your message here... Use {{contact_name}} and {{club_name}} as variables."
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Variables: {"{{contact_name}}"}, {"{{club_name}}"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={handleSendWhatsApp} disabled={!selectedContact || !messageContent.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Message Templates</CardTitle>
            <Dialog open={isAddOpen} onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingMessage ? "Edit Template" : "Add New Template"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newMessageTitle}
                      onChange={(e) => setNewMessageTitle(e.target.value)}
                      placeholder="e.g., Initial Outreach"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category (optional)</Label>
                    <Input
                      value={newMessageCategory}
                      onChange={(e) => setNewMessageCategory(e.target.value)}
                      placeholder="e.g., Outreach, Follow-up"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message Content</Label>
                    <Textarea
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder="Hi {{contact_name}}, ..."
                      className="min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {"{{contact_name}}"} and {"{{club_name}}"} as placeholders
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveMessage}>
                      {editingMessage ? "Update" : "Save"} Template
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {quickMessages.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No templates yet. Add your first template!
            </p>
          ) : (
            <div className="space-y-2">
              {quickMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{msg.message_title}</h4>
                        {msg.recipient_type && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {msg.recipient_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {msg.message_content}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditMessage(msg)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteMessage(msg.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
