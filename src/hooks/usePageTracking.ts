import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const usePageTracking = () => {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const visitorIdRef = useRef<string>("");

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
    const startTime = Date.now();
    startTimeRef.current = startTime;

    return () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      // Track the visit when leaving the page
      const trackVisit = async () => {
        try {
          await supabase.functions.invoke("track-visit", {
            body: {
              visitorId: visitorIdRef.current,
              pagePath: location.pathname,
              duration,
              referrer: document.referrer,
            },
          });
        } catch (error) {
          console.error("Failed to track visit:", error);
        }
      };

      // Use sendBeacon if available for more reliable tracking
      if (navigator.sendBeacon) {
        const blob = new Blob(
          [
            JSON.stringify({
              visitorId: visitorIdRef.current,
              pagePath: location.pathname,
              duration,
              referrer: document.referrer,
            }),
          ],
          { type: "application/json" }
        );
        
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`;
        navigator.sendBeacon(url, blob);
      } else {
        trackVisit();
      }
    };
  }, [location.pathname]);
};
