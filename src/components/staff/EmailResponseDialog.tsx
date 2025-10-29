import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";

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
