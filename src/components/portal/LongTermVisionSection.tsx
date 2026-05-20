import { Play } from "lucide-react";
import { openExternalUrl } from "@/utils/openExternalUrl";

export interface VisionPer90Target {
  metric: string;
  target: string;
  unit?: string;
}

export interface VisionRoadmap {
  six_months?: string;
  eighteen_months?: string;
  thirty_six_months?: string;
}

export interface VisionPlayerToWatch {
  name: string;
  reason?: string;
  url?: string;
}

interface LongTermVisionSectionProps {
  skillset?: string | null;
  per90Targets?: VisionPer90Target[] | null;
  roadmap?: VisionRoadmap | null;
  playersToWatch?: VisionPlayerToWatch[] | null;
}

const Tile = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(43,49%,61%)]/60 to-transparent" />
    <h3 className="font-heading tracking-tight text-base md:text-lg mb-3 text-[hsl(43,49%,61%)]">{title}</h3>
    <div className="text-sm text-foreground/90 space-y-2 leading-relaxed">{children}</div>
  </div>
);

export const LongTermVisionSection = ({
  skillset,
  per90Targets,
  roadmap,
  playersToWatch,
}: LongTermVisionSectionProps) => {
  const hasSkillset = !!(skillset && skillset.trim());
  const hasTargets = !!(per90Targets && per90Targets.length > 0);
  const hasRoadmap = !!(roadmap && (roadmap.six_months || roadmap.eighteen_months || roadmap.thirty_six_months));
  const hasWatch = !!(playersToWatch && playersToWatch.length > 0);

  if (!hasSkillset && !hasTargets && !hasRoadmap && !hasWatch) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="font-heading tracking-tight text-2xl md:text-3xl">Long-Term Vision</h2>
        <p className="text-sm text-muted-foreground mt-1">
          How we see your trajectory, the markers along the way, and who to study.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {hasSkillset && (
          <Tile title="Skillset &amp; Potential">
            <p className="whitespace-pre-wrap">{skillset}</p>
          </Tile>
        )}
        {hasTargets && (
          <Tile title="Per-90 Targets">
            <ul className="space-y-2">
              {per90Targets!.map((t, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
                  <span className="text-foreground/90">{t.metric}</span>
                  <span className="font-heading text-[hsl(43,49%,61%)]">
                    {t.target}{t.unit ? ` ${t.unit}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>
        )}
        {hasRoadmap && (
          <Tile title="Development Road Map">
            <div className="space-y-3">
              {roadmap!.six_months && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">6 Months</div>
                  <p className="whitespace-pre-wrap">{roadmap!.six_months}</p>
                </div>
              )}
              {roadmap!.eighteen_months && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">18 Months</div>
                  <p className="whitespace-pre-wrap">{roadmap!.eighteen_months}</p>
                </div>
              )}
              {roadmap!.thirty_six_months && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">36 Months</div>
                  <p className="whitespace-pre-wrap">{roadmap!.thirty_six_months}</p>
                </div>
              )}
            </div>
          </Tile>
        )}
        {hasWatch && (
          <Tile title="Players to Watch">
            <div className="space-y-2">
              {playersToWatch!.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    {p.reason && (
                      <div className="text-xs text-muted-foreground truncate">{p.reason}</div>
                    )}
                  </div>
                  {p.url && (
                    <button
                      type="button"
                      onClick={() => openExternalUrl(p.url!)}
                      aria-label={`Watch ${p.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(43,49%,61%)]/15 text-[hsl(43,49%,61%)] ring-1 ring-[hsl(43,49%,61%)]/40 transition hover:bg-[hsl(43,49%,61%)]/25"
                    >
                      <Play className="h-4 w-4" fill="currentColor" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Tile>
        )}
      </div>
    </div>
  );
};