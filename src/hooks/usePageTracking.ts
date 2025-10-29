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
    let visitId: string | null = null;

    // Track page view immediately when page loads
    const trackPageView = async () => {
      try {
        const response = await supabase.functions.invoke("track-visit", {
          body: {
            visitorId: visitorIdRef.current,
            pagePath: location.pathname,
            duration: 0,
            referrer: document.referrer,
            isInitial: true,
          },
        });
        
        if (response.data?.visitId) {
          visitId = response.data.visitId;
        }
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
    };

    trackPageView();

    return () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      // Update the visit duration when leaving the page
      if (duration >= 1 && visitId) {
        const updateData = {
          visitorId: visitorIdRef.current,
          pagePath: location.pathname,
          duration,
          referrer: document.referrer,
          isInitial: false,
          visitId: visitId,
        };

        // Use fetch with keepalive for reliable tracking on page unload
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(updateData),
          keepalive: true,
        }).catch((error) => {
          console.error("Failed to update visit duration:", error);
        });
      }
    };
  }, [location.pathname]);
};
