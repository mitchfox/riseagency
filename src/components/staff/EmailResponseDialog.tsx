import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Save, Trash2 } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

interface EmailResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail: string;
  recipientName: string;
  submissionType: string;
}

export const EmailResponseDialog = ({
  open,
  onOpenChange,
  recipientEmail,
  recipientName,
  submissionType,
}: EmailResponseDialogProps) => {
  const [subject, setSubject] = useState(`Response from RISE Football - ${submissionType}`);
  const [message, setMessage] = useState(
    `Dear ${recipientName},\n\nThank you for your interest in RISE Football. We have received your submission and wanted to reach out to you personally.\n\n\n\nBest regards,\nThe RISE Team\n\nRISE Football\nRealising Potential`
  );
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleLoadTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setMessage(template.message);
    toast.success(`Template "${template.name}" loaded`);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    try {
      const { error } = await supabase
        .from("email_templates")
        .insert({
          name: templateName,
          subject: subject,
          message: message,
        });

      if (error) throw error;

      toast.success("Template saved successfully");
      setTemplateName("");
      setShowSaveTemplate(false);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(`Template "${name}" deleted`);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: {
          to: recipientEmail,
          subject: subject,
          message: message,
        },
      });

      if (error) throw error;

      toast.success("Email sent successfully!");
      onOpenChange(false);
      setMessage(
        `Dear ${recipientName},\n\nThank you for your interest in RISE Football. We have received your submission and wanted to reach out to you personally.\n\n\n\nBest regards,\nThe RISE Team\n\nRISE Football\nRealising Potential`
      );
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bebas text-2xl uppercase tracking-wider">
            Send Email Response
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Templates Section */}
          {templates.length > 0 && (
            <div>
              <Label>Quick Templates</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadTemplate(template)}
                      className="text-xs"
                    >
                      {template.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="recipient">To</Label>
            <Input
              id="recipient"
              value={recipientEmail}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          {/* Save Template Section */}
          {showSaveTemplate ? (
            <div className="flex gap-2">
              <Input
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveTemplate} size="sm">
                Save
              </Button>
              <Button 
                onClick={() => {
                  setShowSaveTemplate(false);
                  setTemplateName("");
                }} 
                variant="ghost" 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveTemplate(true)}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Template
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
