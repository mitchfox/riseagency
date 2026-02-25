import { motion } from "framer-motion";
import { 
  BarChart3, Calendar, FileText, Play, Bell, Brain, 
  Compass, Database, Eye, FolderOpen, Layers, LineChart, 
  Search, Users, Video, UtensilsCrossed, Trophy, TrendingUp,
  Activity, RefreshCw
} from "lucide-react";

const iconMap: Record<string, any> = {
  performance: Activity,
  form: LineChart,
  "video-reports": Video,
  data: Database,
  comparisons: Users,
  scouting: Search,
  "positional-guides": Compass,
  schemes: Layers,
  concepts: Brain,
  cognisance: Eye,
  other: FolderOpen,
  highlights: Play,
  programming: Calendar,
  nutrition: UtensilsCrossed,
  invoices: FileText,
  updates: Bell,
  "transfer-hub": RefreshCw,
  analysis: BarChart3,
  trophy: Trophy,
  trending: TrendingUp,
};

interface PortalEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PortalEmptyState = ({ icon = "other", title, description, children }: PortalEmptyStateProps) => {
  const IconComponent = iconMap[icon] || FolderOpen;

  return (
    <motion.div 
      className="py-12 flex flex-col items-center justify-center text-center space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <IconComponent className="h-8 w-8 text-primary/60" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-medium text-foreground/70">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
};
