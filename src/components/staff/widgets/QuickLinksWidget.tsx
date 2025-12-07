import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, Edit2, GripVertical, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickLink {
  id: string;
  title: string;
  url: string; // Can be internal route or external URL
  isExternal: boolean;
}

const DEFAULT_LINKS: QuickLink[] = [
  { id: "1", title: "Player Portal", url: "/players", isExternal: false },
  { id: "2", title: "Club Network", url: "/staff?tab=contacts", isExternal: false },
  { id: "3", title: "Analysis Tools", url: "/staff?tab=analysis", isExternal: false },
  { id: "4", title: "Marketing Hub", url: "/staff?tab=marketing", isExternal: false },
  { id: "5", title: "Legal Docs", url: "/staff?tab=legal", isExternal: false },
];

interface QuickLinksWidgetProps {
  userId?: string;
}

export const QuickLinksWidget = ({ userId }: QuickLinksWidgetProps) => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<QuickLink[]>(DEFAULT_LINKS);
  const [editMode, setEditMode] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLink, setNewLink] = useState({ title: "", url: "" });

  // Load links from localStorage
  useEffect(() => {
    const storageKey = userId ? `quick_links_${userId}` : 'quick_links';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setLinks(JSON.parse(saved));
      } catch {
        setLinks(DEFAULT_LINKS);
      }
    }
  }, [userId]);

  // Save links to localStorage
  const saveLinks = (newLinks: QuickLink[]) => {
    const storageKey = userId ? `quick_links_${userId}` : 'quick_links';
    localStorage.setItem(storageKey, JSON.stringify(newLinks));
    setLinks(newLinks);
  };

  const handleLinkClick = (link: QuickLink) => {
    if (editMode) return;
    
    if (link.isExternal) {
      window.open(link.url, '_blank');
    } else {
      navigate(link.url);
    }
  };

  const addLink = () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    
    const isExternal = newLink.url.startsWith('http://') || newLink.url.startsWith('https://');
    const newLinkObj: QuickLink = {
      id: Date.now().toString(),
      title: newLink.title.trim(),
      url: newLink.url.trim(),
      isExternal,
    };
    
    saveLinks([...links, newLinkObj]);
    setNewLink({ title: "", url: "" });
    setShowAddDialog(false);
  };

  const removeLink = (id: string) => {
    saveLinks(links.filter(l => l.id !== id));
  };

  const resetToDefaults = () => {
    saveLinks(DEFAULT_LINKS);
    setEditMode(false);
  };

  return (
    <div className="space-y-1.5 h-full flex flex-col">
      {/* Header actions */}
      <div className="flex items-center justify-end gap-1 mb-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px]"
          onClick={() => setEditMode(!editMode)}
        >
          <Edit2 className="w-2.5 h-2.5 mr-1" />
          {editMode ? "Done" : "Edit"}
        </Button>
        {editMode && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground"
            onClick={resetToDefaults}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Links list */}
      <div className="flex-1 space-y-1 overflow-auto">
        {links.map((link) => (
          <div
            key={link.id}
            className={`flex items-center gap-1 ${editMode ? '' : 'cursor-pointer'}`}
          >
            {editMode && (
              <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
            <Button
              className={`flex-1 justify-start h-7 text-xs ${editMode ? 'bg-muted hover:bg-muted' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              size="sm"
              onClick={() => handleLinkClick(link)}
              disabled={editMode}
            >
              {link.isExternal && <ExternalLink className="w-3 h-3 mr-1.5 flex-shrink-0" />}
              <span className="truncate">{link.title}</span>
            </Button>
            {editMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeLink(link.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add new link */}
      {editMode && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs border-dashed"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Add Quick Link
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g., Scouting Reports"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL or Route</label>
                <Input
                  placeholder="e.g., /staff?tab=scouting or https://example.com"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground">
                  Use /path for internal routes or https://... for external sites
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={addLink}>
                  Add Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
