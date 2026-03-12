import { toast as sonnerToast, type ExternalToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Drop-in replacement for sonner's `toast` that adds a "Report" button
 * to every `.error()` call. Clicking it logs the error to
 * staff_notification_events so admins can review.
 */
const reportError = async (message: string, context?: string) => {
  try {
    // Grab current route for extra context
    const route = window.location.pathname + window.location.search;

    await supabase.from("staff_notification_events").insert({
      event_type: "error_report",
      title: "User-Reported Error",
      body: typeof message === "string" ? message : String(message),
      event_data: {
        route,
        context: context || null,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    });

    sonnerToast.success("Error reported — thank you!");
  } catch {
    sonnerToast("Could not send report. Please try again.");
  }
};

// Build a proxy that intercepts `.error()` to inject the Report action
const toast = Object.assign(
  // default call-through
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  {
    // Wrap `.error()` to add the Report action button
    error: (message: string | React.ReactNode, data?: ExternalToast) => {
      const messageStr = typeof message === "string" ? message : String(message);
      return sonnerToast.error(message, {
        ...data,
        duration: data?.duration ?? 8000,
        action: {
          label: "Report",
          onClick: () => reportError(messageStr, data?.description as string),
        },
      });
    },

    // Pass-through for all other sonner methods
    success: sonnerToast.success,
    info: sonnerToast.info,
    warning: sonnerToast.warning,
    loading: sonnerToast.loading,
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    message: sonnerToast.message,
    custom: sonnerToast.custom,
  }
);

export { toast };
