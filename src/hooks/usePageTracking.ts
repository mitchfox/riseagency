import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Routes to skip tracking for
const EXCLUDED_ROUTES = ['/staff', '/dashboard', '/login', '/portal'];

const shouldTrackRoute = (pathname: string): boolean => {
  return !EXCLUDED_ROUTES.some(route => pathname.startsWith(route));
};

export const usePageTracking = () => {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const visitorIdRef = useRef<string>("");
  const visitIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get or create visitor ID
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("visitor_id", visitorId);
    }
    visitorIdRef.current = visitorId;
  }, []);

  useEffect(() => {
    // Skip tracking for excluded routes
    if (!shouldTrackRoute(location.pathname)) {
      return;
    }

    const startTime = Date.now();
    startTimeRef.current = startTime;
    visitIdRef.current = null;

    // Track page view with direct DB insert
    const trackPageView = async () => {
      try {
        const { data, error } = await supabase
          .from("site_visits")
          .insert({
            visitor_id: visitorIdRef.current,
            page_path: location.pathname,
            duration: 0,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            location: {},
          })
          .select('id')
          .single();

        if (!error && data) {
          visitIdRef.current = data.id;
        } else if (error) {
          console.error("Failed to track page view:", error);
        }
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
    };

    trackPageView();

    return () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      const visitId = visitIdRef.current;

      // Update the visit duration when leaving the page
      if (duration >= 1 && visitId) {
        // Use direct DB update - fire and forget
        supabase
          .from("site_visits")
          .update({ duration })
          .eq("id", visitId)
          .then(({ error }) => {
            if (error) {
              console.error("Failed to update visit duration:", error);
            }
          });
      }
    };
  }, [location.pathname]);
};
