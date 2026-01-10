import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, MessageCircle } from "lucide-react";

interface AskQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleTitle?: string;
}

export const AskQuestionDialog = ({ open, onOpenChange, articleTitle }: AskQuestionDialogProps) => {
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error("Please enter your question");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("form_submissions")
      .insert({
        form_type: "btl_question",
        data: {
          question: question.trim(),
          email: email.trim() || null,
          articleTitle: articleTitle || null,
          submittedAt: new Date().toISOString()
        }
      });

    if (error) {
      toast.error("Failed to submit question");
    } else {
      toast.success("Question submitted! We may feature your question in a future article.");
      setQuestion("");
      setEmail("");
      onOpenChange(false);
    }
    
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bebas text-2xl uppercase tracking-wider flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Ask a Question
          </DialogTitle>
          <DialogDescription>
            Have a question about this topic? Submit it below and we may answer it in a future article.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="question">Your Question *</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know?"
              rows={4}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-muted-foreground text-sm">(optional - to be notified when answered)</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full btn-shine font-bebas uppercase tracking-wider"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Question"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
