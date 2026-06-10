import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchSuggestionSource {
  /** Free-form text to match against (lowercased internally) */
  label: string;
  /** Secondary line in the dropdown (e.g. club, position) */
  sublabel?: string | null;
}

interface Props {
  /** Committed value: the parent should filter by this. */
  value: string;
  /** Called when the user commits a value (Enter, suggestion click, clear). */
  onCommit: (value: string) => void;
  /** Source rows used to build the live dropdown. */
  sources: SearchSuggestionSource[];
  placeholder?: string;
  className?: string;
  /** Max number of suggestions to show. Defaults to 8. */
  maxSuggestions?: number;
}

/**
 * Search input with a live dropdown of matching suggestions.
 *
 * - Typing updates the dropdown only — the parent's filter is NOT touched
 *   until the user commits (Enter, suggestion click, clear button, or blur
 *   if the value changed). This keeps heavy tables responsive while typing.
 * - Arrow keys + Enter navigate suggestions. Esc closes the dropdown.
 */
export const SearchWithSuggestions = ({
  value,
  onCommit,
  sources,
  placeholder = "Search...",
  className,
  maxSuggestions = 8,
}: Props) => {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep local draft in sync if the parent clears/changes the committed value
  // (e.g. "Clear filters" button).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [] as SearchSuggestionSource[];
    const out: SearchSuggestionSource[] = [];
    const seen = new Set<string>();
    for (const s of sources) {
      const label = (s.label || "").trim();
      if (!label) continue;
      if (!label.toLowerCase().includes(q)) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= maxSuggestions) break;
    }
    return out;
  }, [draft, sources, maxSuggestions]);

  const commit = (v: string) => {
    setDraft(v);
    setOpen(false);
    setActiveIndex(-1);
    if (v !== value) onCommit(v);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        commit(suggestions[activeIndex].label);
      } else {
        commit(draft);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const renderHighlighted = (text: string) => {
    const q = draft.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-primary font-semibold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => { if (draft.trim()) setOpen(true); }}
        onBlur={() => {
          // Commit on blur if the value changed and no suggestion click is pending
          // (suggestion mousedown calls commit before blur fires).
          if (draft !== value) {
            setTimeout(() => {
              // Skip if focus moved into a suggestion that already committed
              if (draft !== value) onCommit(draft);
            }, 120);
          }
        }}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-9 h-10 bg-muted/40 border-muted-foreground/20 focus-visible:bg-background transition-colors"
      />
      {draft && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); commit(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(s.label); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex flex-col",
                activeIndex === i && "bg-accent",
              )}
            >
              <span className="truncate">{renderHighlighted(s.label)}</span>
              {s.sublabel && (
                <span className="truncate text-xs text-muted-foreground">{s.sublabel}</span>
              )}
            </button>
          ))}
          <div className="px-3 py-1.5 border-t border-border bg-muted/40 text-[10px] text-muted-foreground">
            Press Enter to filter
          </div>
        </div>
      )}
    </div>
  );
};