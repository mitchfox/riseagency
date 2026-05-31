import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";

interface BlurTextareaProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

/**
 * Textarea that keeps local state and only commits on blur, so the parent
 * tree (and large sibling lists) don't re-render on every keystroke.
 */
export const BlurTextarea = ({ value, onCommit, placeholder, className, rows }: BlurTextareaProps) => {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  const handleBlur = useCallback(() => {
    if (local !== value) {
      onCommit(local);
    }
  }, [local, value, onCommit]);

  return (
    <Textarea
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  );
};