import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, ExternalLink, Calendar, Copy, Check, Plus } from "lucide-react";
import { toast } from "sonner";

export const Meetings = () => {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const startNewMeeting = () => {
    // Opens Google Meet new meeting page
    window.open("https://meet.google.com/new", "_blank");
  };

  const openCalendar = () => {
    window.open("https://calendar.google.com", "_blank");
  };

  const loadMeeting = () => {
    if (!meetingUrl.trim()) {
      toast.error("Please enter a Google Meet URL");
      return;
    }

    // Extract the meeting code from various formats
    let meetCode = meetingUrl.trim();
    
    // Handle full URLs
    if (meetCode.includes("meet.google.com/")) {
      const match = meetCode.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
      if (match) {
        meetCode = match[1];
      }
    }

    // Validate format (xxx-xxxx-xxx)
    const isValidCode = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meetCode);
    
    if (!isValidCode) {
      toast.error("Invalid meeting code format. Expected: xxx-xxxx-xxx");
      return;
    }

    setEmbedUrl(`https://meet.google.com/${meetCode}`);
    toast.success("Meeting loaded");
  };

  const copyMeetingLink = () => {
    if (embedUrl) {
      navigator.clipboard.writeText(embedUrl);
      setCopied(true);
      toast.success("Meeting link copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Meetings
          </CardTitle>
          <CardDescription>
            Start or join Google Meet sessions for team meetings, player reviews, and coaching discussions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={startNewMeeting} className="gap-2">
              <Plus className="h-4 w-4" />
              Start New Meeting
            </Button>
            <Button variant="outline" onClick={openCalendar} className="gap-2">
              <Calendar className="h-4 w-4" />
              Open Calendar
            </Button>
          </div>

          {/* Join existing meeting */}
          <div className="space-y-3">
            <Label>Join an Existing Meeting</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter meeting code or URL (e.g., abc-defg-hij)"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadMeeting()}
              />
              <Button onClick={loadMeeting}>
                Load Meeting
              </Button>
            </div>
          </div>

          {/* Meeting Embed */}
          {embedUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Active Meeting</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyMeetingLink}>
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "Copied" : "Copy Link"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(embedUrl, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open in New Tab
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEmbedUrl("")}>
                    Close
                  </Button>
                </div>
              </div>
              
              <div className="relative rounded-lg overflow-hidden border bg-background aspect-video">
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Note: For best experience, you may need to open the meeting in a new tab due to browser security restrictions
              </p>
            </div>
          )}

          {!embedUrl && (
            <div className="py-12 text-center border rounded-lg bg-muted/30">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No active meeting. Start a new meeting or enter a meeting code above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={startNewMeeting}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="font-medium">Instant Meeting</p>
              <p className="text-sm text-muted-foreground">Start right now</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={openCalendar}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="font-medium">Schedule Meeting</p>
              <p className="text-sm text-muted-foreground">Plan ahead</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:border-primary/50 transition-colors cursor-pointer" 
          onClick={() => window.open("https://meet.google.com", "_blank")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Google Meet Home</p>
              <p className="text-sm text-muted-foreground">Full interface</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
