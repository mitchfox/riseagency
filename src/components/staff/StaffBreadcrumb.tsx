import { ChevronRight } from "lucide-react";

interface StaffBreadcrumbProps {
  categoryTitle: string;
  categoryIcon: React.ElementType;
  sectionTitle: string;
  onCategoryClick: () => void;
  action?: React.ReactNode;
}

export const StaffBreadcrumb = ({ categoryTitle, categoryIcon: CategoryIcon, sectionTitle, onCategoryClick, action }: StaffBreadcrumbProps) => {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onCategoryClick}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <CategoryIcon className="h-4 w-4" />
          <span className="font-medium">{categoryTitle}</span>
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="truncate text-foreground font-medium">{sectionTitle}</span>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
