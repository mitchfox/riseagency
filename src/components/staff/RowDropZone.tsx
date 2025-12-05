import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface RowDropZoneProps {
  id: string;
  isOver?: boolean;
}

export const RowDropZone = ({ id }: RowDropZoneProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-4 -my-1 relative z-10 transition-all duration-200",
        isOver && "h-16"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full mx-4 transition-all duration-200",
          isOver 
            ? "bg-primary h-2 shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
            : "bg-transparent hover:bg-primary/20"
        )}
      />
      {isOver && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
          <span className="text-xs text-primary font-medium bg-background/90 px-2 py-0.5 rounded">
            Drop to create new row
          </span>
        </div>
      )}
    </div>
  );
};
