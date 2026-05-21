import { renderMarkdown } from "@/utils/markdownRenderer";

/**
 * Renders a job content block (description/requirements/responsibilities)
 * Supports a mix of paragraphs and bullet points (lines starting with - or *).
 * Bullets get a gold marker; paragraphs are spaced cleanly.
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

  return (
    <div className={`space-y-4 text-muted-foreground leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "ul") {
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        const text = b.items[0];
        if (!text) return <div key={i} className="h-1" />;
        return <p key={i}>{renderMarkdown(text)}</p>;
      })}
    </div>
  );
}