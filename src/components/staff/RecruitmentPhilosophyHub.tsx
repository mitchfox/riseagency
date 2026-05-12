import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Heart,
  Users,
  MessageCircle,
  Eye,
  Compass,
  Layers,
  Globe2,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  Music2,
  Gamepad2,
  Shirt,
  Car,
  Plane,
  Sun,
  Target,
  ListChecks,
} from "lucide-react";

/**
 * Recruitment Philosophy Hub.
 *
 * The primary view of the Scripts area. The rebuild reframes the section
 * away from a small bank of outreach messages and into a full
 * communication and player-psychology guide. Templates (existing scripts)
 * and Case Studies sit underneath this as supporting examples.
 */

type Pillar = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  intro: string;
  bullets?: string[];
  blocks?: { heading: string; body?: string; bullets?: string[] }[];
};

const PILLARS: Pillar[] = [
  {
    id: "core",
    icon: Compass,
    title: "Core philosophy",
    intro:
      "The best agency conversations rarely feel like agency conversations. Players, especially aged 17 to 21, respond when they feel understood, socially comfortable, respected, emotionally read correctly and spoken to naturally.",
    blocks: [
      {
        heading: "The goal is not",
        bullets: ["Getting replies", "Booking calls", "Forcing representation discussions"],
      },
      {
        heading: "The real objective is",
        bullets: [
          "Understanding the player's environment",
          "Learning personality",
          "Building long-term trust",
          "Positioning RISE correctly",
          "Progressing relationships naturally over time",
        ],
      },
      {
        heading: "How a player should feel",
        body:
          "\u201CThese people understand football and understand people.\u201D Not: \u201CThis is another agency trying to recruit me.\u201D",
      },
    ],
  },
  {
    id: "identity",
    icon: Sparkles,
    title: "RISE communication identity",
    intro: "Reinforce a clear style across every staff conversation.",
    bullets: [
      "Football-first",
      "Calm confidence",
      "Intelligent",
      "Observant",
      "Culturally aware",
      "Well connected",
      "Grounded",
      "Ambitious without arrogance",
    ],
  },
  {
    id: "style",
    icon: MessageCircle,
    title: "Writing and messaging style",
    intro: "Casual professional UK football tone. Smart football people speaking naturally.",
    blocks: [
      {
        heading: "Do",
        bullets: [
          "Natural conversational flow",
          "Short readable paragraphs",
          "Calm energy",
          "Slight banter where appropriate",
          "Confident without hype",
        ],
      },
      {
        heading: "Avoid",
        bullets: [
          "Corporate jargon",
          "Robotic wording",
          "Fake slang",
          "Fanboy behaviour",
          "Desperate energy",
        ],
      },
    ],
  },
  {
    id: "young-players",
    icon: Heart,
    title: "Understanding young players",
    intro:
      "Most talented young players carry some level of ego. Treat that as normal rather than something to feed or judge.",
    blocks: [
      {
        heading: "Not the objective",
        bullets: ["Feeding arrogance", "Fake hype", "Excessive praise"],
      },
      {
        heading: "The real objective",
        bullets: [
          "Calm validation",
          "Grounded confidence",
          "Intelligent conversation",
          "Socially aware interaction",
          "Making them feel understood",
        ],
      },
      {
        heading: "Young players respond to people who",
        bullets: [
          "Understand football culture",
          "Don't try too hard",
          "Don't worship them",
          "Don't sound corporate",
          "Balance confidence with grounded energy",
        ],
      },
    ],
  },
  {
    id: "pre-conversation",
    icon: Eye,
    title: "Pre-conversation intelligence",
    intro:
      "Good outreach starts before the first message. Understand the player beyond football before you ever open a chat.",
    blocks: [
      {
        heading: "Background and identity",
        bullets: [
          "Languages spoken",
          "Cultural background",
          "Countries lived in or travelled to",
          "Schools attended",
          "Academies",
          "Family influence",
          "Friendship groups",
        ],
      },
      {
        heading: "Football intelligence",
        bullets: [
          "Recent matches",
          "Position and role",
          "Playing style",
          "Strengths and weaknesses",
          "Contract situation",
          "Injury history",
          "Representation status",
          "Career trajectory",
          "Mentality on the pitch",
          "Personality during games",
        ],
      },
      {
        heading: "Lifestyle and interests",
        body:
          "Music, athletes followed, gaming, fashion, personalised boots, jewellery, cars, repeated quotes, hobbies, travel. These reveal personality, motivations, confidence, influences, ego, aspirations and emotional drivers.",
      },
      {
        heading: "Environment and influences",
        bullets: [
          "Who they follow",
          "Who follows them",
          "Tagged posts and photos",
          "Close friendships",
          "Teammates",
          "Existing connections to RISE / FFF",
          "Controversial influencers",
          "Social image and online behaviour",
        ],
      },
    ],
  },
  {
    id: "casual",
    icon: Brain,
    title: "Casual conversation principles",
    intro:
      "Especially with younger players, conversations should not feel like interviews or networking. Best interactions feel relaxed, observant, socially aware, slightly playful, grounded and natural.",
    blocks: [
      {
        heading: "Avoid stacking questions",
        body:
          "Bad: \u201CWhat music do you like? What games do you play? Any hobbies outside football?\u201D\nBetter: \u201CSaw you had Central Cee on your story the other day. Feels like every footballer's got him in rotation right now.\u201D Then build naturally from the reply.",
      },
      {
        heading: "Comment on answers, don't just ask",
        bullets: [
          "\u201CFair enough.\u201D",
          "\u201CThat's class.\u201D",
          "\u201CMakes sense.\u201D",
          "\u201CEveryone's playing that right now.\u201D",
          "\u201CYeah I've heard that's addictive.\u201D",
          "\u201CCan't lie that's a dangerous purchase at 18.\u201D",
          "\u201CThat actually suits your game weirdly.\u201D",
        ],
      },
    ],
  },
  {
    id: "stages",
    icon: Layers,
    title: "Relationship progression",
    intro: "Bad recruitment jumps straight to representation, calls and selling. Good recruitment paces itself.",
    blocks: [
      { heading: "Stage 1 \u2014 Comfort and familiarity", body: "No selling. Just relevance and natural interaction." },
      { heading: "Stage 2 \u2014 Rapport building", body: "Football discussion, lifestyle conversation, personality understanding." },
      { heading: "Stage 3 \u2014 Understanding situation", body: "Representation, career ambitions, frustrations, family influence, future thinking." },
      { heading: "Stage 4 \u2014 Introducing value", body: "Only once trust exists. RISE value should feel intelligent, strategic, calm and developmental, not sales-heavy." },
      { heading: "Stage 5 \u2014 Relationship progression", body: "Calls, meetings and representation discussions should feel natural and earned." },
    ],
  },
  {
    id: "personalities",
    icon: Users,
    title: "Personality types",
    intro: "Adapt the communication style to the player in front of you.",
    blocks: [
      { heading: "Quiet / reserved", bullets: ["Shorter messages", "Patience", "Less hype"] },
      { heading: "Confident / ego-driven", bullets: ["Talk ambition and ceiling", "Belief", "Calm banter without overfeeding ego"] },
      { heading: "Analytical", bullets: ["Tactical detail", "Performance discussion", "Development conversation"] },
      { heading: "Distrustful", bullets: ["Slower build", "Consistency", "Honesty"] },
      { heading: "Highly recruited", bullets: ["Differentiate through intelligence, conversation quality, understanding and authenticity, not hype"] },
    ],
  },
  {
    id: "regional",
    icon: Globe2,
    title: "Regional communication notes",
    intro: "Important for international recruitment consistency.",
    blocks: [
      { heading: "Scandinavia", bullets: ["Understated", "Direct", "Honest"] },
      { heading: "UK", bullets: ["Relaxed football tone", "Casual confidence"] },
      { heading: "Southern Europe", bullets: ["Warmer relationship building is acceptable"] },
      { heading: "Africa", bullets: ["Respect", "Ambition", "Family awareness", "Relationship trust"] },
    ],
  },
  {
    id: "follow-up",
    icon: Target,
    title: "Follow-up philosophy",
    intro: "Patience and timing. Re-engagement should add value, not chase.",
    blocks: [
      { heading: "Good follow-ups", bullets: ["Add value", "Reference context", "Feel natural"] },
      { heading: "Bad follow-ups", bullets: ["Feel desperate", "Repetitive", "Force replies"] },
      {
        heading: "Re-engage around real moments",
        bullets: ["Performances", "Milestones", "Transfers", "Injuries", "Call-ups", "Life moments"],
      },
    ],
  },
  {
    id: "avoid",
    icon: ShieldAlert,
    title: "What to avoid",
    intro: "Restraint and credibility matter heavily.",
    bullets: [
      "Fake hype",
      "Fanboy behaviour",
      "Corporate language",
      "Robotic outreach",
      "Overpromising",
      "Fake urgency",
      "Desperate follow-ups",
      "Interrogative questioning",
      "Forcing calls too early",
      "Talking money too early",
      "Pretending deep knowledge after minimal scouting",
    ],
  },
  {
    id: "internal-notes",
    icon: ListChecks,
    title: "Internal staff notes after every meaningful interaction",
    intro: "Log it so the agency builds a real picture of the player over time.",
    bullets: [
      "Personality read",
      "Communication style",
      "Ego / confidence level",
      "Ambition level",
      "Family influence",
      "Trust level",
      "Emotional state",
      "Representation situation",
      "Openness to moving",
      "Potential fit for RISE",
      "Next action",
    ],
  },
];

const CONVERSATION_AREAS: { id: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string }[] = [
  {
    id: "music",
    icon: Music2,
    title: "Music",
    body: "\u201CWhat music's always in your playlist?\u201D Often reveals personality, energy, confidence, culture and social environment.",
  },
  {
    id: "gaming",
    icon: Gamepad2,
    title: "Gaming",
    body: "Games played, characters, Ultimate Team, competitive games. One of the easiest ways to build relaxed conversation with younger players.",
  },
  {
    id: "fashion",
    icon: Shirt,
    title: "Fashion and style",
    body: "Outfits, jewellery, boots. Personalised boots can reveal family importance, mentality, identity and emotional motivations.",
  },
  {
    id: "cars",
    icon: Car,
    title: "Cars",
    body: "Especially around 18 when status, freedom and purchases become interesting. Often tied to ambition, ego and lifestyle aspirations.",
  },
  {
    id: "travel",
    icon: Plane,
    title: "Travel",
    body: "Countries visited, training camps, holidays. Naturally opens conversations around culture and experience.",
  },
  {
    id: "daily",
    icon: Sun,
    title: "Daily life",
    body: "\u201CHow's life outside football been?\u201D Simple but valuable. Often reveals emotional state, stress, confidence, happiness and environment.",
  },
];

const PillarCard = ({
  pillar,
  open,
  onOpenChange,
}: {
  pillar: Pillar;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const Icon = pillar.icon;
  return (
    <Card className="overflow-hidden border-border/60">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left hover:bg-muted/30 transition"
          >
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg leading-tight">{pillar.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{pillar.intro}</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 mt-2 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 px-4 sm:px-5 pb-5">
            {pillar.bullets && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {pillar.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {pillar.blocks?.map((blk) => (
              <div key={blk.heading} className="rounded-md border border-border/60 bg-muted/20 p-3">
                <p className="text-sm font-semibold text-foreground">{blk.heading}</p>
                {blk.body && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{blk.body}</p>
                )}
                {blk.bullets && (
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {blk.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const RecruitmentPhilosophyHub = () => {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const allOpen = PILLARS.every((p) => openMap[p.id]);
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    if (!allOpen) PILLARS.forEach((p) => (next[p.id] = true));
    setOpenMap(next);
  };
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-6">
        <Badge variant="outline" className="border-primary/50 text-primary">Recruitment intelligence</Badge>
        <h2 className="mt-3 text-xl sm:text-2xl font-semibold leading-tight">
          Modern football recruitment intelligence
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
          Scripts here are not a bank of outreach messages. The core of the section is understanding players,
          building trust, social intelligence, football culture awareness, conversation flow, emotional reading,
          relationship progression and communication psychology. Templates and case studies sit underneath as
          supporting examples.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pillars</h3>
        <Button size="sm" variant="ghost" onClick={toggleAll}>
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      <div className="grid gap-3">
        {PILLARS.map((p) => (
          <PillarCard
            key={p.id}
            pillar={p}
            open={!!openMap[p.id]}
            onOpenChange={(v) => setOpenMap((m) => ({ ...m, [p.id]: v }))}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Useful non-football conversation areas
        </h3>
        <p className="text-sm text-muted-foreground">
          Explore these naturally over time rather than forcing them.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONVERSATION_AREAS.map((a) => {
            const Icon = a.icon;
            return (
              <Card key={a.id} className="border-border/60">
                <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecruitmentPhilosophyHub;