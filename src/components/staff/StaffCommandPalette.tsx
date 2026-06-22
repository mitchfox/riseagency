import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Network, ClipboardList, FileText, ArrowRight, LayoutGrid, Search } from "lucide-react";

type StaffSection = { id: string; title: string; icon?: any };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: StaffSection[];
  onNavigateSection: (sectionId: string) => void;
}

type EntityResult = {
  type: "player" | "fixture" | "contact" | "task" | "contract";
  id: string;
  title: string;
  subtitle?: string;
  sectionId?: string;
  navigateTo?: string;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

const TYPE_ICON: Record<EntityResult["type"], any> = {
  player: Users,
  fixture: Calendar,
  contact: Network,
  task: ClipboardList,
  contract: FileText,
};

const TYPE_LABEL: Record<EntityResult["type"], string> = {
  player: "Players",
  fixture: "Fixtures",
  contact: "Network contacts",
  task: "Tasks",
  contract: "Contracts",
};

export const StaffCommandPalette = ({ open, onOpenChange, sections, onNavigateSection }: Props) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced entity search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const like = `%${q}%`;
      try {
        const [players, fixtures, contacts, tasks, contracts] = await Promise.all([
          supabase
            .from("players")
            .select("id, name, position, club, representation_status")
            .ilike("name", like)
            .limit(6),
          supabase
            .from("fixtures")
            .select("id, home_team, away_team, match_date, competition")
            .or(`home_team.ilike.${like},away_team.ilike.${like},competition.ilike.${like}`)
            .order("match_date", { ascending: false })
            .limit(6),
          supabase
            .from("club_network_contacts")
            .select("id, name, club_name, position")
            .or(`name.ilike.${like},club_name.ilike.${like}`)
            .limit(6),
          supabase
            .from("staff_tasks")
            .select("id, title, completed, priority")
            .ilike("title", like)
            .limit(6),
          supabase
            .from("signature_contracts")
            .select("id, title, status")
            .ilike("title", like)
            .limit(6),
        ]);

        const out: EntityResult[] = [];
        (players.data || []).forEach((p: any) => {
          // respect global exclusion: skip Scouted / FFF
          const status = (p.representation_status || "").toLowerCase();
          if (status.includes("scout") || status.includes("fuel")) return;
          out.push({
            type: "player",
            id: p.id,
            title: p.name,
            subtitle: [p.position, p.club].filter(Boolean).join(" · "),
            navigateTo: `/stars/${slugify(p.name)}`,
          });
        });
        (fixtures.data || []).forEach((f: any) => {
          out.push({
            type: "fixture",
            id: f.id,
            title: `${f.home_team} v ${f.away_team}`,
            subtitle: [f.match_date, f.competition].filter(Boolean).join(" · "),
            sectionId: "analysis",
          });
        });
        (contacts.data || []).forEach((c: any) => {
          out.push({
            type: "contact",
            id: c.id,
            title: c.name,
            subtitle: [c.position, c.club_name].filter(Boolean).join(" · "),
            sectionId: "clubnetwork",
          });
        });
        (tasks.data || []).forEach((t: any) => {
          out.push({
            type: "task",
            id: t.id,
            title: t.title,
            subtitle: `${t.completed ? "Completed" : "Open"} · ${t.priority}`,
            sectionId: "overview",
          });
        });
        (contracts.data || []).forEach((c: any) => {
          out.push({
            type: "contract",
            id: c.id,
            title: c.title,
            subtitle: c.status,
            sectionId: "legal",
          });
        });
        setResults(out);
      } catch (err) {
        console.error("Command palette search failed", err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections.slice(0, 10);
    return sections.filter((s) => s.title.toLowerCase().includes(q)).slice(0, 12);
  }, [query, sections]);

  const grouped = useMemo(() => {
    const map = new Map<EntityResult["type"], EntityResult[]>();
    results.forEach((r) => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    });
    return Array.from(map.entries());
  }, [results]);

  const handleEntity = (r: EntityResult) => {
    onOpenChange(false);
    if (r.navigateTo) {
      navigate(r.navigateTo);
    } else if (r.sectionId) {
      onNavigateSection(r.sectionId);
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      commandProps={{ shouldFilter: false }}
    >
      <CommandInput
        placeholder="Search players, fixtures, contacts, tasks, contracts, sections…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          {loading ? "Searching…" : query.length < 2 ? "Type at least 2 characters." : "No results."}
        </CommandEmpty>

        {filteredSections.length > 0 && (
          <CommandGroup heading="Sections">
            {filteredSections.map((s) => {
              const Icon = s.icon || LayoutGrid;
              return (
                <CommandItem
                  key={`section-${s.id}`}
                  value={`section ${s.title} ${s.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    onNavigateSection(s.id);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4 opacity-70" />
                  <span className="flex-1">{s.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {grouped.map(([type, items], idx) => {
          const Icon = TYPE_ICON[type];
          return (
            <div key={type}>
              {(idx > 0 || filteredSections.length > 0) && <CommandSeparator />}
              <CommandGroup heading={TYPE_LABEL[type]}>
                {items.map((r) => (
                  <CommandItem
                    key={`${r.type}-${r.id}`}
                    value={`${r.type} ${r.title} ${r.subtitle || ""}`}
                    onSelect={() => handleEntity(r)}
                  >
                    <Icon className="mr-2 h-4 w-4 opacity-70" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate">{r.title}</span>
                      {r.subtitle && (
                        <span className="text-[11px] text-muted-foreground truncate">{r.subtitle}</span>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-40 ml-2 shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}

        {!query && (
          <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/40 flex items-center gap-2">
            <Search className="h-3 w-3" />
            <span>Tip: press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">⌘K</kbd> or <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">/</kbd> anywhere to open.</span>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
};
