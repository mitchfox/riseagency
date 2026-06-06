import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StaffSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const StaffSearchInput = ({ value, onChange, placeholder = "Search...", className }: StaffSearchInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last value we committed up to the parent so we can ignore
  // echoes of stale parent state during typing. Without this, any
  // unrelated parent re-render before the debounce fires would feed the
  // pre-debounce `value` back through useEffect and wipe what the user
  // just typed.
  const lastCommittedRef = useRef<string>(value);

  // Only sync from parent when the parent's value differs from what we
  // last committed — i.e. it's a genuine EXTERNAL change (e.g. clear
  // button elsewhere) rather than the parent echoing our own debounced
  // commit or a stale render during typing.
  useEffect(() => {
    if (value !== lastCommittedRef.current) {
      lastCommittedRef.current = value;
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleChange = (v: string) => {
    setLocalValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastCommittedRef.current = v;
      onChange(v);
    }, 300);
  };

  const handleClear = () => {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    lastCommittedRef.current = "";
    onChange("");
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-10 pr-9 h-10 bg-muted/40 border-muted-foreground/20 focus-visible:bg-background transition-colors"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
