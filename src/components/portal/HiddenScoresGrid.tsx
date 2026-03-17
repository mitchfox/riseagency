import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HiddenScoresGridProps {
  placeholderRawScore: number | null | undefined;
  placeholderMinutes: number | null | undefined;
  placeholderPer: number | null | undefined;
  placeholderSr: number | null | undefined;
  t: (lang: string, key: string) => string;
  reportLanguage: string;
}

const SCORE_EXPLANATIONS = {
  r90: "R90 measures a player's actual impact on the match result through every action made on and off the ball, normalised to 90 minutes.",
  per: "Player Efficiency Rating standardises performance across different match contexts and playing times.",
  sr: "Statistical Rating based purely on the success rate within actions performed during the match.",
};

export const HiddenScoresGrid = ({
  placeholderRawScore,
  placeholderMinutes,
  placeholderPer,
  placeholderSr,
  t,
  reportLanguage,
}: HiddenScoresGridProps) => {
  const hasR90 = placeholderRawScore != null && (placeholderMinutes ?? 0) > 0;
  const r90Value = hasR90 ? ((placeholderRawScore! / placeholderMinutes!) * 90).toFixed(2) : null;

  const scores = [
    ...(hasR90
      ? [
          { label: t(reportLanguage, "raw_score"), value: placeholderRawScore!.toFixed(3), highlight: false },
          { label: "R90", value: r90Value!, highlight: true, explanation: SCORE_EXPLANATIONS.r90 },
          { label: t(reportLanguage, "mins_short"), value: String(placeholderMinutes), highlight: false },
        ]
      : []),
    ...(placeholderPer != null ? [{ label: "PER", value: placeholderPer.toFixed(2), highlight: false, explanation: SCORE_EXPLANATIONS.per }] : []),
    ...(placeholderSr != null ? [{ label: "SR", value: placeholderSr.toFixed(1), highlight: false, explanation: SCORE_EXPLANATIONS.sr }] : []),
  ];

  if (scores.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(reportLanguage, "placeholder_stats_not_set")}</p>;
  }

  return (
    <TooltipProvider>
      <div className={`grid gap-4 max-w-lg mx-auto p-4 bg-accent/20 rounded-lg`} style={{ gridTemplateColumns: `repeat(${scores.length}, minmax(0, 1fr))` }}>
        {scores.map((score) => (
          <div
            key={score.label}
            className={`text-center p-2 ${score.highlight ? "bg-primary text-primary-foreground rounded-lg md:p-4" : ""}`}
          >
            <p className={`text-[10px] md:text-sm ${score.highlight ? "opacity-90" : "text-muted-foreground"} mb-0.5 md:mb-1`}>
              {score.label}
            </p>
            <p className={`${score.highlight ? "text-lg md:text-3xl" : "text-base md:text-2xl"} font-bold`}>
              {score.value}
            </p>
            {score.explanation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={`mt-1 inline-flex ${score.highlight ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[250px] text-xs">
                  {score.explanation}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
};
