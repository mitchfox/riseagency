import { ChevronRight } from "lucide-react";

interface StaffBreadcrumbProps {
  categoryTitle: string;
  categoryIcon: React.ElementType;
  sectionTitle: string;
  onCategoryClick: () => void;
}

export const StaffBreadcrumb = ({ categoryTitle, categoryIcon: CategoryIcon, sectionTitle, onCategoryClick }: StaffBreadcrumbProps) => {
  return (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={onCategoryClick}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
      >
        <CategoryIcon className="h-4 w-4" />
        <span className="font-medium">{categoryTitle}</span>
      </button>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="text-foreground font-medium">{sectionTitle}</span>
    </div>
  );
};
