import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ["⌘", "K"], description: "Open search" },
  { keys: ["Esc"], description: "Exit video / close dialog" },
  { keys: ["↑", "↓"], description: "Navigate sections" },
  { keys: ["1-9"], description: "Jump to category" },
  { keys: ["?"], description: "Show shortcuts" },
  { keys: ["A"], description: "Analysis" },
  { keys: ["R"], description: "Data" },
  { keys: ["P"], description: "Player Management" },
  { keys: ["D"], description: "Player Database" },
  { keys: ["M"], description: "Content Creator" },
  { keys: ["T"], description: "Tactics Board" },
  { keys: ["C"], description: "Meeting" },
];

export const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bebas uppercase tracking-wider">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded-md min-w-[28px] text-center"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
