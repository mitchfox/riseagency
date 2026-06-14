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
  musicstudio: "Suno AI music creation and portal music admin",
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
  clubnetwork: "Contacts, agents, scouts and industry network",
  playerlist: "Full player list with filtering and search",
  casestudies: "Sales scripts and messaging case studies",
  representationoffers: "Player representation offer pages and invitations",
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
  // Staff sections previously missing a description
  dashboard: "Daily dashboard with today's schedule, tasks and quick stats",
  businessplan: "Business plan, OKRs and long-term strategy doc",
  marketingschedule: "Weekly marketing schedule and post planning board",
  videocompressor: "Compress and re-encode videos for upload",
  highlightcompiler: "Compile player highlight reels from tagged actions",
  highlightmakers: "Highlight maker access management",
  psychology: "Psychology profiles, SPQ reports and mental performance",
  interactionhistory: "History of staff interactions with contacts",
  transferreports: "Transfer reports and recommendation write-ups",
  corporationtax: "Corporation tax filings and TinyTax exports",
  cluboutreach: "Outbound club and agent outreach campaigns with templates",
  datasetbuilder: "Roboflow dataset builder with YOLO export support",
  socialshare: "Social share previews and Open Graph card management",
  technical: "Technical programming, drills and ball mastery sessions",
  usage: "AI and platform usage tracking with cost breakdowns",
  // Investor portal sections
  investment: "Investment thesis, sections and overview cards",
  represented: "Players currently under representation",
  mandated: "Players mandated for transfer or contract work",
  previously: "Previously mandated players archive",
  prospects: "Prospect board pipeline with probability weighting",
  contracts: "Signature contracts and legal documents",
  spending: "Day-to-day spending log with receipts",
  commission: "Commission forecast across the represented roster",
  forecast: "Revenue forecast against ongoing spending",
  salaryCap: "Player salary cap modelling and analysis",
  tasks: "Investor view of staff tasks and progress",
  activity: "Activity feed of staff actions and notifications",
  outreach: "Player outreach pipeline for youth and pro targets",
  timeManagement: "Time management board grouped by category",
  priorities: "Priority board with daily, weekly and seasonal items",
  businessPlan: "Business plan, OKRs and long-term strategy document",
  timeline: "Agency timeline of milestones, signings and key events",
  capacity: "Staff capacity planning and workload distribution",
  execNotes: "Executive thought wall for ideas, notes and reflections",
  execScripts: "Executive scripts library for outreach and messaging",
  execWorkflow: "Executive workflow board for cross-team coordination",
  projections: "Long-range revenue and growth projections",
};

// Colour palette for section preview cards - cycles through these
const PREVIEW_GRADIENTS = [
  "from-blue-600/30 to-blue-900/50",
  "from-emerald-600/30 to-emerald-900/50",
  "from-violet-600/30 to-violet-900/50",
  "from-amber-600/30 to-amber-900/50",
  "from-rose-600/30 to-rose-900/50",
  "from-cyan-600/30 to-cyan-900/50",
  "from-indigo-600/30 to-indigo-900/50",
  "from-orange-600/30 to-orange-900/50",
];

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

  let globalIdx = 0;

  return (
    <div className="h-full min-h-0 flex flex-col font-sans normal-case tracking-normal">
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
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 scrollbar-thin">
        <div className="space-y-8 max-w-6xl mx-auto">
          {filteredCategories.map(cat => {
            const realSections = cat.sections.filter(s => !(s as any).isGroupLabel);
            if (realSections.length === 0) return null;
            const CatIcon = cat.icon;

            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold tracking-normal text-primary">
                    {cat.title}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {realSections.map((section, idx) => {
                    const Icon = section.icon || CatIcon;
                    const preview = SECTION_PREVIEWS[section.id] || "";
                    const gradientClass = PREVIEW_GRADIENTS[globalIdx % PREVIEW_GRADIENTS.length];
                    globalIdx++;
                    return (
                      <motion.button
                        key={section.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => onSelect(section.id, cat.id)}
                        className="group relative flex flex-col rounded-xl border border-border/50 bg-card hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-center overflow-hidden"
                      >
                        {/* Preview area with gradient and large icon */}
                        <div className={`relative w-full h-24 bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                          {/* Decorative pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-2 right-2 w-8 h-8 border border-white/30 rounded-full" />
                            <div className="absolute bottom-2 left-2 w-5 h-5 border border-white/20 rounded" />
                            <div className="absolute top-4 left-4 w-12 h-[1px] bg-white/20 rotate-45" />
                          </div>
                          <Icon className="w-10 h-10 text-primary drop-shadow-lg group-hover:scale-110 transition-transform" />
                        </div>
                        {/* Label and description */}
                        <div className="px-3 py-3 flex flex-col gap-1">
                          <span className="text-xs font-semibold leading-tight">{section.title}</span>
                          {preview && (
                            <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2 normal-case tracking-normal font-sans">
                              {preview}
                            </span>
                          )}
                        </div>
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
