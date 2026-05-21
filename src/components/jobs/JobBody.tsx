import { renderMarkdown } from "@/utils/markdownRenderer";

/**
 * Renders a job content block (description / requirements / responsibilities).
 * Supports a mix of paragraphs and bullet points (lines starting with - or *).
 * Paragraphs that appear BEFORE the first bullet render in italics as an intro;
 * paragraphs after bullets render as plain body copy. Bullets get a gold marker.
 */
export function JobBody({ content, className = "" }: { content: string; className?: string }) {
  if (!content?.trim()) return null;

  const lines = content.split("\n");
  const blocks: { type: "p" | "ul"; items: string[] }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "p", items: [""] });
      continue;
    }
    const isBullet = line.startsWith("- ") || line.startsWith("* ");
    if (isBullet) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") {
        last.items.push(line.slice(2));
      } else {
        blocks.push({ type: "ul", items: [line.slice(2)] });
      }
    } else {
      blocks.push({ type: "p", items: [line] });
    }
  }

  const firstBulletIdx = blocks.findIndex(b => b.type === "ul");

  return (
    <div className={`space-y-4 text-white/90 leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "ul") {
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-white/90">{renderMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        const text = b.items[0];
        if (!text) return <div key={i} className="h-1" />;
        const isIntro = firstBulletIdx !== -1 && i < firstBulletIdx;
        return (
          <p
            key={i}
            className={isIntro ? "italic text-white/80" : "text-white/90"}
          >
            {renderMarkdown(text)}
          </p>
        );
      })}
    </div>
  );
}