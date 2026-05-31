import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface BlurInputProps {
  value: string | null | undefined;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}

/**
 * Input that keeps local state and only commits the value on blur,
 * preventing letter-by-letter updates that cause lag.
 */
export const BlurInput = ({ value, onCommit, placeholder, className, type }: BlurInputProps) => {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  const handleBlur = useCallback(() => {
    if (local !== (value ?? "")) {
      onCommit(local);
    }
  }, [local, value, onCommit]);

  return (
    <Input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
};
