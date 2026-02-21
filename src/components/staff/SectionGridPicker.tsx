import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

interface SectionItem {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  isGroupLabel?: boolean;
}

interface Category {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: SectionItem[];
  locked?: boolean;
}

interface SectionGridPickerProps {
  categories: Category[];
  onSelect: (sectionId: string, categoryId: string) => void;
}

// Map section IDs to preview descriptions
const SECTION_PREVIEWS: Record<string, string> = {
  overview: "Dashboard overview with key metrics and quick actions",
  schedule: "Calendar view of upcoming fixtures and training sessions",
  meetings: "Meeting scheduler and notes",
  staffschedules: "Staff availability and shift management",
  focusedtasks: "Club networking, player outreach and content tasks",
  visionboard: "Goals, targets and strategic planning board",
  docs: "Document editor and file management",
  sheets: "Spreadsheet editor for data management",
  designstudio: "Graphic design workspace with templates",
  annotations: "Video annotation projects and frame-by-frame tagging",
  videoanalysis: "Full video analysis with clips and timestamps",
  streams: "Live stream management and channel setup",
  coaching: "Drills, sessions and exercise database",
  analysis: "Pre-match and post-match analysis builder",
  coachingdata: "Performance data, R90 reports and action stats",
  athletecentre: "Athlete development and periodisation planning",
  tacticsboard: "Interactive tactics board with formations",
  strengthpower: "Strength, power and speed programming",
  nutrition: "Nutrition plans and meal tracking",
  players: "Player profiles, fixtures and management",
  transferhub: "Transfer negotiations and club outreach",
  updates: "Player updates and announcements",
  requests: "Incoming requests and submissions",
  portalmanagement: "Player portal feature toggles and settings",
  clubnetwork: "Club contacts, agents and scouts network",
  playerlist: "Full player list with filtering and search",
  casestudies: "Messaging case studies and conversation examples",
  recruitment: "Prospect tracking and scouting targets",
  playerdatabase: "Searchable player database with profiles",
  scoutingcentre: "Scouting reports and evaluations centre",
  submissions: "Form submissions from website and portal",
  marketing: "Campaign management and social media planning",
  contentcreator: "Content creation workflow with AI tools",
  publiccontent: "Public-facing content management",
  salesdeck: "Sales deck builder and presentation tools",
  visitors: "Website visitor tracking and analytics",
  invoices: "Invoice creation and billing management",
  payments: "Payment tracking and reconciliation",
  expenses: "Expense logging with receipt uploads",
  taxrecords: "Tax record management and reporting",
  budgets: "Budget planning and forecasting",
  financialreports: "Financial reports and summaries",
  legal: "Legal documents and contract management",
  partners: "Partner organisations and relationships",
  jobs: "Job listings and recruitment",
  sitetext: "Website text and content editing",
  languages: "Multi-language content management",
  staffaccounts: "Staff account creation and role management",
  passwords: "Player password management",
  activitylog: "System activity log and audit trail",
  dataexport: "Database export and backup tools",
  pwainstall: "Progressive web app installation",
  offlinemanager: "Offline content caching and sync",
  pushnotifications: "Push notification settings",
  notifications: "Notification configuration",
  smsnotifications: "SMS notification management",
};

export const SectionGridPicker = ({ categories, onSelect }: SectionGridPickerProps) => {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories
      .map(cat => ({
        ...cat,
        sections: cat.sections.filter(s => {
          if ((s as any).isGroupLabel) return false;
          return s.title.toLowerCase().includes(q) ||
            (SECTION_PREVIEWS[s.id] || "").toLowerCase().includes(q);
        }),
      }))
      .filter(cat => cat.sections.length > 0);
  }, [categories, search]);

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="px-6 pt-6 pb-4">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-8 max-w-6xl mx-auto">
          {filteredCategories.map(cat => {
            const realSections = cat.sections.filter(s => !(s as any).isGroupLabel);
            if (realSections.length === 0) return null;
            const CatIcon = cat.icon;

            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    {cat.title}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {realSections.map((section, idx) => {
                    const Icon = section.icon || CatIcon;
                    const preview = SECTION_PREVIEWS[section.id] || "";
                    return (
                      <motion.button
                        key={section.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => onSelect(section.id, cat.id)}
                        className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:border-primary hover:bg-primary/5 transition-all text-center"
                      >
                        {/* Icon container with glossy effect */}
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-medium leading-tight">{section.title}</span>
                        {preview && (
                          <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {preview}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
