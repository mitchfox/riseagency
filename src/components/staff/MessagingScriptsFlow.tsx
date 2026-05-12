import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Edit, GitBranch, ListTree, MessageSquare, Plus, Trash2 } from "lucide-react";

/**
 * Figma-style visual flow map for messaging script nodes.
 *
 * The script tree is laid out top-down: root steps stack vertically; choice
 * groups expand sideways into their option branches. Connectors are drawn as
 * SVG bezier curves between every parent and child.
 */

export type FlowNode = {
  id: string;
  parent_node_id: string | null;
  kind: "step" | "choice_group" | "option";
  branch_label: string | null;
  content: string | null;
  optional: boolean;
  sort_order: number;
  script_id: string;
};

type Positioned = FlowNode & { x: number; y: number; w: number; h: number };

const NODE_W = 260;
const NODE_H = 130;
const GAP_X = 36;
const GAP_Y = 60;

/** Recursively measure how wide each subtree needs to be (in node columns). */
const subtreeWidth = (id: string | null, byParent: Map<string | null, FlowNode[]>): number => {
  const kids = byParent.get(id) || [];
  if (kids.length === 0) return 1;
  // For step nodes, kids stack vertically (still 1 col). For choice_groups, kids spread horizontally.
  const node = kids[0];
  if (node.kind === "option") {
    // siblings are options of a choice group, lay out side by side
    return kids.reduce((sum, k) => sum + subtreeWidth(k.id, byParent), 0);
  }
  // sequential steps: width is max child width
  return Math.max(1, ...kids.map((k) => subtreeWidth(k.id, byParent)));
};

const layout = (nodes: FlowNode[]): Positioned[] => {
  const byParent = new Map<string | null, FlowNode[]>();
  nodes.forEach((n) => {
    const k = n.parent_node_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(n);
  });
  byParent.forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));

  const positioned: Positioned[] = [];

  const placeChildren = (parentId: string | null, originX: number, startY: number): number => {
    const kids = byParent.get(parentId) || [];
    if (kids.length === 0) return startY;
    const allOptions = kids.every((k) => k.kind === "option");
    if (allOptions) {
      // spread horizontally
      let cursorX = originX;
      let maxBottom = startY;
      kids.forEach((k) => {
        const colW = subtreeWidth(k.id, byParent);
        const colCenter = cursorX + (colW * (NODE_W + GAP_X)) / 2 - (NODE_W + GAP_X) / 2;
        const x = colCenter;
        positioned.push({ ...k, x, y: startY, w: NODE_W, h: NODE_H });
        const bottom = placeChildren(k.id, x, startY + NODE_H + GAP_Y);
        maxBottom = Math.max(maxBottom, bottom);
        cursorX += colW * (NODE_W + GAP_X);
      });
      return maxBottom;
    }
    // stack vertically below parent at same x
    let y = startY;
    kids.forEach((k) => {
      positioned.push({ ...k, x: originX, y, w: NODE_W, h: NODE_H });
      y = placeChildren(k.id, originX, y + NODE_H + GAP_Y);
    });
    return y;
  };

  // Root nodes: stack vertically, each with its own subtree fanning out
  const roots = byParent.get(null) || [];
  let y = 0;
  roots.forEach((root) => {
    const w = subtreeWidth(root.id, byParent);
    const rootX = ((w - 1) * (NODE_W + GAP_X)) / 2;
    positioned.push({ ...root, x: rootX, y, w: NODE_W, h: NODE_H });
    y = placeChildren(root.id, rootX, y + NODE_H + GAP_Y) + GAP_Y;
  });

  return positioned;
};

interface Props {
  nodes: FlowNode[];
  onEdit: (n: FlowNode) => void;
  onDelete: (id: string) => void;
  onAddChild: (parent: FlowNode, kind: "step" | "choice_group" | "option") => void;
  onAddRoot: () => void;
  onCopy: (text: string) => void;
}

export const MessagingScriptsFlow = ({ nodes, onEdit, onDelete, onAddChild, onAddRoot, onCopy }: Props) => {
  const positioned = useMemo(() => layout(nodes), [nodes]);
  const byId = useMemo(() => new Map(positioned.map((p) => [p.id, p])), [positioned]);

  const minX = positioned.length ? Math.min(...positioned.map((p) => p.x)) : 0;
  const maxX = positioned.length ? Math.max(...positioned.map((p) => p.x + NODE_W)) : NODE_W;
  const maxY = positioned.length ? Math.max(...positioned.map((p) => p.y + NODE_H)) : NODE_H;
  const offsetX = -minX + 24;
  const totalW = maxX - minX + 48;
  const totalH = maxY + 60;

  const edges: { from: Positioned; to: Positioned }[] = [];
  positioned.forEach((p) => {
    if (p.parent_node_id) {
      const parent = byId.get(p.parent_node_id);
      if (parent) edges.push({ from: parent, to: p });
    }
  });

  if (positioned.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">No steps yet — add the first step to start building the flow.</p>
        <Button size="sm" variant="outline" onClick={onAddRoot}><Plus className="h-4 w-4 mr-1" />Add first step</Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/10 overflow-auto">
      <div className="relative" style={{ width: totalW, height: totalH }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalW}
          height={totalH}
        >
          {edges.map(({ from, to }, i) => {
            const x1 = from.x + offsetX + NODE_W / 2;
            const y1 = from.y + NODE_H;
            const x2 = to.x + offsetX + NODE_W / 2;
            const y2 = to.y;
            const midY = (y1 + y2) / 2;
            const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeOpacity={0.45}
                strokeWidth={1.5}
              />
            );
          })}
        </svg>
        {positioned.map((p) => {
          const isChoiceGroup = p.kind === "choice_group";
          const isOption = p.kind === "option";
          const Icon = isChoiceGroup ? ListTree : isOption ? GitBranch : MessageSquare;
          return (
            <div
              key={p.id}
              className={`absolute rounded-lg border bg-card shadow-sm flex flex-col ${p.optional ? "opacity-60" : ""} ${
                isChoiceGroup ? "border-primary/60" : isOption ? "border-primary/40" : "border-border"
              }`}
              style={{ left: p.x + offsetX, top: p.y, width: NODE_W, height: NODE_H }}
            >
              <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 border-b bg-muted/30 rounded-t-lg">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  {p.branch_label ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 truncate max-w-[140px]">{p.branch_label}</Badge>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.kind.replace("_", " ")}</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  {p.content && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onCopy(p.content!)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onEdit(p)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onDelete(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-2 text-xs leading-snug whitespace-pre-wrap text-foreground/90">
                {p.content || <span className="text-muted-foreground italic">No content</span>}
              </div>
              <div className="flex items-center gap-1 px-2 pb-1.5">
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => onAddChild(p, "step")}>
                  <Plus className="h-3 w-3 mr-0.5" />Step
                </Button>
                {!isOption && (
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => onAddChild(p, "choice_group")}>
                    <Plus className="h-3 w-3 mr-0.5" />Branch
                  </Button>
                )}
                {isChoiceGroup && (
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => onAddChild(p, "option")}>
                    <Plus className="h-3 w-3 mr-0.5" />Option
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MessagingScriptsFlow;