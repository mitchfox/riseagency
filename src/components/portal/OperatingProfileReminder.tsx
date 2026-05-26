import { ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/portalTranslations";

interface Props {
  visible: boolean;
  inProgress: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  portalLanguage?: string | null;
}

export const OperatingProfileReminder = ({ visible, inProgress, onOpen, onDismiss, portalLanguage }: Props) => {
  if (!visible) return null;
  return (
    <div className="sticky top-16 z-40 px-3 sm:px-4 pwa-safe-top">
      <div className="mx-auto max-w-4xl mt-2">
        <div className="rounded-xl border border-[hsl(43,49%,61%)]/40 bg-card/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] px-3 sm:px-4 py-2.5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(43,49%,61%)]/15 text-[hsl(43,49%,61%)]">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium leading-tight">
              {inProgress
                ? t(portalLanguage, "op_profile_resume_title")
                : t(portalLanguage, "op_profile_intro_title")}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {inProgress
                ? t(portalLanguage, "op_profile_resume_body")
                : t(portalLanguage, "op_profile_intro_body")}
            </div>
          </div>
          <Button size="sm" className="h-8 bg-[hsl(43,49%,61%)] text-black hover:bg-[hsl(43,49%,55%)]" onClick={onOpen}>
            {inProgress ? t(portalLanguage, "op_profile_continue") : t(portalLanguage, "op_profile_start")}
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="p-1 text-muted-foreground hover:text-foreground rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};