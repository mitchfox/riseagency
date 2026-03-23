import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFormGradeConfigs } from "@/hooks/useFormGradeConfigs";

interface HiddenScoresGridProps {
  placeholderRawScore: number | null | undefined;
  placeholderMinutes: number | null | undefined;
  placeholderPer: number | null | undefined;
  placeholderSr: number | null | undefined;
  t: (lang: string, key: string) => string;
  reportLanguage: string;
}

const SCORE_EXPLANATIONS: Record<string, Record<string, string>> = {
  en: {
    r90: "R90 measures a player's actual impact on the match result through every action made on and off the ball, normalised to 90 minutes.",
    per: "Player Efficiency Rating standardises performance across different match contexts and playing times.",
    sr: "Statistical Rating based purely on the success rate within actions performed during the match.",
  },
  fr: {
    r90: "Le R90 mesure l'impact réel d'un joueur sur le résultat du match à travers chaque action réalisée avec et sans le ballon, normalisé sur 90 minutes.",
    per: "L'indice d'efficacité du joueur standardise la performance selon les différents contextes de match et les temps de jeu.",
    sr: "Note statistique basée uniquement sur le taux de réussite des actions effectuées pendant le match.",
  },
};

const getExplanation = (key: string, lang: string): string => {
  return SCORE_EXPLANATIONS[lang]?.[key] || SCORE_EXPLANATIONS.en[key] || "";
};

export const HiddenScoresGrid = ({
  placeholderRawScore,
  placeholderMinutes,
  placeholderPer,
  placeholderSr,
  t,
  reportLanguage,
}: HiddenScoresGridProps) => {
  const { getGradeForScore } = useFormGradeConfigs();

  const hasR90 = placeholderRawScore != null && (placeholderMinutes ?? 0) > 0;
  const r90Value = hasR90 ? ((placeholderRawScore! / placeholderMinutes!) * 90) : null;

  // Only show R90, PER and SR - no raw score or mins
  const scores = [
    ...(hasR90 && r90Value != null
      ? [{ label: "R90", value: r90Value.toFixed(2), numericValue: r90Value, metricKey: "r90", explanation: getExplanation("r90", reportLanguage) }]
      : []),
    ...(placeholderPer != null ? [{ label: "PER", value: placeholderPer.toFixed(2), numericValue: placeholderPer, metricKey: "per", explanation: getExplanation("per", reportLanguage) }] : []),
    ...(placeholderSr != null ? [{ label: "SR", value: placeholderSr.toFixed(1), numericValue: placeholderSr, metricKey: "sr", explanation: getExplanation("sr", reportLanguage) }] : []),
  ];

  if (scores.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(reportLanguage, "placeholder_stats_not_set")}</p>;
  }

  return (
    <TooltipProvider>
      <div className={`grid gap-6 max-w-md mx-auto p-6 bg-accent/20 rounded-lg`} style={{ gridTemplateColumns: `repeat(${scores.length}, minmax(0, 1fr))` }}>
        {scores.map((score) => {
          const gradeInfo = getGradeForScore(score.metricKey, score.numericValue);
          return (
            <div
              key={score.label}
              className="text-center p-3 flex flex-col items-center"
            >
              <p className="text-[10px] md:text-sm text-muted-foreground mb-1">
                {score.label}
              </p>
              <p className="text-xl md:text-3xl font-bold">
                {score.value}
              </p>
              {/* Grade indicator oval */}
              {gradeInfo.grade !== '-' && (
                <div
                  className="mt-2 px-3 py-0.5 rounded-full text-[10px] md:text-xs font-semibold text-white"
                  style={{ backgroundColor: gradeInfo.color }}
                >
                  {gradeInfo.grade}
                </div>
              )}
              {score.explanation && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="mt-1.5 inline-flex text-muted-foreground hover:text-foreground">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px] text-xs">
                    {score.explanation}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
