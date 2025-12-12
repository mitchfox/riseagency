import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, Brain, Zap, Crosshair } from "lucide-react";
import { SCOUTING_POSITIONS, POSITION_SKILLS, ScoutingPosition } from "@/data/scoutingSkills";
import { useLanguage } from "@/contexts/LanguageContext";

const domainConfig = {
  Physical: {
    icon: Activity,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    solidBg: "bg-red-500"
  },
  Psychological: {
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    solidBg: "bg-purple-500"
  },
  Technical: {
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    solidBg: "bg-blue-500"
  },
  Tactical: {
    icon: Crosshair,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    solidBg: "bg-green-500"
  }
};

const positionInitials: Record<ScoutingPosition, string> = {
  "Goalkeeper": "GK",
  "Full-Back": "FB",
  "Centre-Back": "CB",
  "Central Defensive Midfielder": "CDM",
  "Central Midfielder": "CM",
  "Central Attacking Midfielder": "CAM",
  "Winger / Wide Forward": "W/WF",
  "Centre Forward / Striker": "CF/ST"
};

interface WhatWeLookForDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WhatWeLookForDialog = ({ open, onOpenChange }: WhatWeLookForDialogProps) => {
  const { t } = useLanguage();
  const [selectedPosition, setSelectedPosition] = useState<ScoutingPosition>(SCOUTING_POSITIONS[0]);
  const [expandedDomain, setExpandedDomain] = useState<keyof typeof domainConfig>("Physical");

  const positionSkills = POSITION_SKILLS[selectedPosition];
  const skillsByDomain = positionSkills.reduce((acc, skill) => {
    if (!acc[skill.domain]) acc[skill.domain] = [];
    acc[skill.domain].push(skill);
    return acc;
  }, {} as Record<string, typeof positionSkills>);

  const currentDomain = expandedDomain;
  const config = domainConfig[currentDomain];
  const skills = skillsByDomain[currentDomain] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-center bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            {t('scouts.what_we_look', 'What We Look For')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {t('scouts.criteria_desc', 'Our 4-corner scouting model for each position')}
          </p>
        </DialogHeader>

        <div className="p-4 md:p-6">
          {/* Position Selection */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1 mb-4 border-2 border-border rounded-xl overflow-hidden">
            {SCOUTING_POSITIONS.map((position) => (
              <button
                key={position}
                onClick={() => setSelectedPosition(position)}
                className={`py-3 px-2 font-bebas uppercase tracking-wider text-xs md:text-sm transition-all ${
                  selectedPosition === position
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                {positionInitials[position]}
              </button>
            ))}
          </div>

          {/* Domain Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(Object.keys(domainConfig) as Array<keyof typeof domainConfig>).map((domain) => {
              const domainConf = domainConfig[domain];
              const DomainIcon = domainConf.icon;
              const isActive = currentDomain === domain;
              
              return (
                <button
                  key={domain}
                  onClick={() => setExpandedDomain(domain)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border-2 ${
                    isActive 
                      ? `border-primary ${domainConf.bgColor}` 
                      : `${domainConf.borderColor} ${domainConf.bgColor} hover:border-primary/50`
                  }`}
                >
                  <DomainIcon className={`h-4 w-4 ${domainConf.color}`} />
                  <span className={`font-bebas uppercase tracking-wider text-sm ${isActive ? 'text-primary' : domainConf.color}`}>
                    {domain}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Skills Grid */}
          <div className="grid md:grid-cols-2 gap-3">
            {skills.map((skill, idx) => (
              <div 
                key={idx} 
                className={`bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl overflow-hidden border ${config.borderColor}`}
              >
                <div className={`${config.solidBg} px-4 py-2`}>
                  <h4 className="font-bold text-black text-sm">
                    {skill.skill_name}
                  </h4>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {skill.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
