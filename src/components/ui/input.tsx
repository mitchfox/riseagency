import * as React from "react";

import { cn } from "@/lib/utils";

const NON_TEXT_INPUT_TYPES = new Set([
  "password", "email", "url", "tel", "number", "date", "time", "datetime-local",
  "month", "week", "color", "file", "checkbox", "radio", "range", "hidden",
  "submit", "reset", "button",
]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, spellCheck, lang, ...props }, ref) => {
    const enableSpellCheck = type ? !NON_TEXT_INPUT_TYPES.has(type) : true;
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        spellCheck={spellCheck ?? enableSpellCheck}
        lang={lang ?? "en-GB"}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
