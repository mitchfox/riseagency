import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, spellCheck, lang, ...props }, ref) => {
    // Single-line inputs almost never benefit from spellcheck and the per-keystroke
    // grammar/suggestion pass is a major source of mobile typing lag. Default to off;
    // callers can opt in explicitly with spellCheck={true} (e.g. long prose fields).
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        spellCheck={spellCheck ?? false}
        lang={lang ?? "en-GB"}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
