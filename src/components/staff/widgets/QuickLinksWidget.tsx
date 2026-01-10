import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface QuickLinkOption {
  id: string;
  title: string;
  url: string;
  category: string;
}

// All available internal routes/sections
const AVAILABLE_LINKS: QuickLinkOption[] = [
  // Players
  { id: "players", title: "Players List", url: "/players", category: "Players" },
  { id: "stars", title: "Stars Page", url: "/stars", category: "Players" },
  
  // Staff Overview
  { id: "overview", title: "Staff Overview", url: "/staff", category: "Staff" },
  { id: "goals-tasks", title: "Goals & Tasks", url: "/staff?tab=goals-tasks", category: "Staff" },
  
  // Scouting & Recruitment
  { id: "scouting", title: "Scouting Reports", url: "/staff?tab=scouting", category: "Scouting" },
  { id: "prospects", title: "Prospects", url: "/staff?tab=prospects", category: "Scouting" },
  { id: "scouts", title: "Scout Network", url: "/staff?tab=scouts", category: "Scouting" },
  { id: "player-outreach", title: "Player Outreach", url: "/staff?tab=player-outreach", category: "Scouting" },
  
  // Analysis & Coaching
  { id: "analysis", title: "Analysis Tools", url: "/staff?tab=analysis", category: "Coaching" },
  { id: "coaching", title: "Coaching Library", url: "/staff?tab=coaching", category: "Coaching" },
  { id: "programmes", title: "Programmes", url: "/staff?tab=programmes", category: "Coaching" },
  { id: "positional-guides", title: "Positional Guides", url: "/staff?tab=positional-guides", category: "Coaching" },
  
  // Marketing & Communications
  { id: "marketing", title: "Marketing Hub", url: "/staff?tab=marketing", category: "Marketing" },
  { id: "communications", title: "Communications", url: "/staff?tab=communications", category: "Marketing" },
  { id: "gallery", title: "Media Gallery", url: "/staff?tab=gallery", category: "Marketing" },
  
  // Network & Contacts
  { id: "contacts", title: "Club Network", url: "/staff?tab=contacts", category: "Network" },
  { id: "club-outreach", title: "Club Outreach", url: "/staff?tab=club-outreach", category: "Network" },
  
  // Finance & Legal
  { id: "invoices", title: "Invoices", url: "/staff?tab=invoices", category: "Finance" },
  { id: "payments", title: "Payments", url: "/staff?tab=payments", category: "Finance" },
  { id: "legal", title: "Legal Documents", url: "/staff?tab=legal", category: "Finance" },
  { id: "bank-details", title: "Bank Details", url: "/staff?tab=bank-details", category: "Finance" },
  
  // Admin & Settings
  { id: "jobs", title: "Jobs Management", url: "/staff?tab=jobs", category: "Admin" },
  { id: "fixtures", title: "Fixtures", url: "/staff?tab=fixtures", category: "Admin" },
  { id: "updates", title: "Updates Manager", url: "/staff?tab=updates", category: "Admin" },
  { id: "analytics", title: "Site Analytics", url: "/staff?tab=analytics", category: "Admin" },
  { id: "settings", title: "Settings", url: "/staff?tab=settings", category: "Admin" },
];

const DEFAULT_SELECTED_IDS = ["players", "contacts", "analysis", "marketing", "legal"];

interface QuickLinksWidgetProps {
  userId?: string;
}

export const QuickLinksWidget = ({ userId }: QuickLinksWidgetProps) => {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_IDS);
  const [editMode, setEditMode] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Load selected links from localStorage
  useEffect(() => {
    const storageKey = userId ? `quick_links_${userId}` : 'quick_links';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Handle legacy format (array of link objects) or new format (array of ids)
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          setSelectedIds(parsed);
        } else if (parsed.length > 0 && parsed[0].id) {
          // Legacy format - extract ids that match available links
          const legacyIds = parsed.map((l: any) => {
            const match = AVAILABLE_LINKS.find(al => al.url === l.url);
            return match?.id;
          }).filter(Boolean);
          setSelectedIds(legacyIds.length > 0 ? legacyIds : DEFAULT_SELECTED_IDS);
        }
      } catch {
        setSelectedIds(DEFAULT_SELECTED_IDS);
      }
    }
  }, [userId]);

  // Save selected links to localStorage
  const saveSelectedIds = (ids: string[]) => {
    const storageKey = userId ? `quick_links_${userId}` : 'quick_links';
    localStorage.setItem(storageKey, JSON.stringify(ids));
    setSelectedIds(ids);
  };

  const handleLinkClick = (link: QuickLinkOption) => {
    if (editMode) return;
    navigate(link.url);
  };

  const toggleLink = (id: string) => {
    if (selectedIds.includes(id)) {
      saveSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      saveSelectedIds([...selectedIds, id]);
    }
  };

  const resetToDefaults = () => {
    saveSelectedIds(DEFAULT_SELECTED_IDS);
    setEditMode(false);
  };

  const selectedLinks = AVAILABLE_LINKS.filter(l => selectedIds.includes(l.id));
  const categories = [...new Set(AVAILABLE_LINKS.map(l => l.category))];

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
        {selectedLinks.map((link) => (
          <div
            key={link.id}
            className="flex items-center gap-1"
          >
            <Button
              className={`flex-1 justify-start h-7 text-xs ${editMode ? 'bg-muted hover:bg-muted text-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              size="sm"
              onClick={() => handleLinkClick(link)}
              disabled={editMode}
            >
              <span className="truncate">{link.title}</span>
            </Button>
            {editMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => toggleLink(link.id)}
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
          <DialogContent className="sm:max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select Quick Links</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {categories.map(category => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {AVAILABLE_LINKS.filter(l => l.category === category).map(link => {
                        const isSelected = selectedIds.includes(link.id);
                        return (
                          <div
                            key={link.id}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary/10 border border-primary/30' 
                                : 'hover:bg-muted border border-transparent'
                            }`}
                            onClick={() => toggleLink(link.id)}
                          >
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => toggleLink(link.id)}
                            />
                            <span className="text-sm flex-1">{link.title}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowAddDialog(false)}>
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
