import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Link2, Linkedin, Mail, MessageCircle, Share2, Twitter } from "lucide-react";
import { toast } from "sonner";

interface JobShareButtonProps {
  url: string;
  title: string;
  summary?: string;
}

export function JobShareButton({ url, title, summary }: JobShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const text = `${title} — ${summary ?? "Join the RISE team"}`;
  const enc = (s: string) => encodeURIComponent(s);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: summary, url });
      } catch {
        // user cancelled
      }
    } else {
      setOpen(true);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Link2 className="w-4 h-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy this role's URL</TooltipContent>
        </Tooltip>

        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    if (navigator.share) {
                      e.preventDefault();
                      handleNativeShare();
                    }
                  }}
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Share this role</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-56 p-2">
            <div className="grid gap-1">
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
              ><Linkedin className="w-4 h-4 text-[#0a66c2]" /> LinkedIn</a>
              <a
                href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
              ><Twitter className="w-4 h-4" /> X / Twitter</a>
              <a
                href={`https://wa.me/?text=${enc(`${text} ${url}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
              ><MessageCircle className="w-4 h-4 text-[#25d366]" /> WhatsApp</a>
              <a
                href={`mailto:?subject=${enc(title)}&body=${enc(`${summary ?? ""}\n\n${url}`)}`}
                className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
              ><Mail className="w-4 h-4" /> Email</a>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}