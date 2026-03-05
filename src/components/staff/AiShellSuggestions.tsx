import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, Check, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ShellSection {
  heading: string;
  prompt: string;
  bullet_points?: string[];
}

interface ShellSuggestion {
  id: string;
  shell_type: string;
  preview_text: string;
  shell_content: {
    sections: ShellSection[];
  };
}

interface AiShellSuggestionsProps {
  section: "athlete_centre" | "analysis" | "data" | "player_management";
  playerId: string | null;
  playerName?: string;
  onAccept?: (shell: ShellSuggestion) => void;
}

export const AiShellSuggestions = ({
  section,
  playerId,
  playerName,
  onAccept,
}: AiShellSuggestionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shells, setShells] = useState<ShellSuggestion[]>([]);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [expandedShell, setExpandedShell] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!playerId) {
      toast.error("Select a player first");
      return;
    }

    setLoading(true);
    const { data, error } = await invokeEdgeFunction<{ shells: ShellSuggestion[] }>(
      "generate-shell-suggestions",
      { body: { section, playerId } }
    );

    if (error) {
      toast.error(error.message || "Failed to generate suggestions");
      setLoading(false);
      return;
    }

    setShells(data?.shells || []);
    setLoading(false);
  };

  // Reset shells when player changes
  useEffect(() => {
    setShells([]);
    setRejectedIds(new Set());
    setExpandedShell(null);
  }, [playerId]);

  const handleAccept = async (shell: ShellSuggestion) => {
    // Record decision
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from("ai_shell_decisions").insert({
        suggestion_id: shell.id,
        player_id: playerId!,
        staff_user_id: userData.user.id,
        decision: "accepted",
      });
    }

    onAccept?.(shell);
    toast.success(`${shell.shell_type} shell accepted`);

    // Remove from list
    setShells((prev) => prev.filter((s) => s.id !== shell.id));
  };

  const handleReject = async (shell: ShellSuggestion) => {
    // Record decision
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from("ai_shell_decisions").insert({
        suggestion_id: shell.id,
        player_id: playerId!,
        staff_user_id: userData.user.id,
        decision: "rejected",
      });
    }

    setRejectedIds((prev) => new Set([...prev, shell.id]));
    toast("Shell dismissed for this session");
  };

  const visibleShells = shells.filter((s) => !rejectedIds.has(s.id));

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left group mb-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-primary flex-1">
            AI Shell Suggestions
            {visibleShells.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {visibleShells.length}
              </span>
            )}
          </span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-primary/60" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-primary/60" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mb-3">
        <div className="border border-primary/20 rounded-lg p-3 bg-primary/5 space-y-3">
          {!playerId && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Select a player above to generate AI suggestions.
            </p>
          )}

          {playerId && visibleShells.length === 0 && !loading && (
            <div className="text-center py-2">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchSuggestions}
                className="text-xs border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate shells for {playerName || "this player"}
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Generating suggestions...</span>
            </div>
          )}

          {visibleShells.map((shell) => (
            <div
              key={shell.id}
              className="border border-border/60 rounded-md bg-background p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{shell.shell_type}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {shell.preview_text}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleAccept(shell)}
                    title="Accept shell"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(shell)}
                    title="Dismiss shell"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Expandable detail */}
              <button
                onClick={() =>
                  setExpandedShell(expandedShell === shell.id ? null : shell.id)
                }
                className="text-[10px] text-primary/70 hover:text-primary underline"
              >
                {expandedShell === shell.id ? "Hide structure" : "Preview structure"}
              </button>

              {expandedShell === shell.id && shell.shell_content?.sections && (
                <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
                  {shell.shell_content.sections.map((sec, i) => (
                    <div key={i} className="text-[11px]">
                      <p className="font-medium text-foreground/90">{sec.heading}</p>
                      <p className="text-muted-foreground italic">{sec.prompt}</p>
                      {sec.bullet_points && sec.bullet_points.length > 0 && (
                        <ul className="ml-3 mt-0.5 list-disc text-muted-foreground/80">
                          {sec.bullet_points.map((bp, j) => (
                            <li key={j}>{bp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {visibleShells.length > 0 && (
            <div className="text-center pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchSuggestions}
                disabled={loading}
                className="text-[10px] text-muted-foreground hover:text-primary h-6"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Generate more
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
