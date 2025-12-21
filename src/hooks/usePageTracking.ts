import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("visitor_id", visitorId);
    }
    visitorIdRef.current = visitorId;
  }, []);

  useEffect(() => {
    if (!shouldTrackRoute(location.pathname)) {
      return;
    }

    const startTime = Date.now();
    startTimeRef.current = startTime;
    visitIdRef.current = null;

    const trackPageView = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("track-visit", {
          body: {
            visitorId: visitorIdRef.current,
            pagePath: location.pathname,
            referrer: document.referrer || null,
            isInitial: true,
          },
        });

        if (!error && data?.visitId) {
          visitIdRef.current = data.visitId;
        }
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
    };

    trackPageView();

    return () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      const visitId = visitIdRef.current;

      if (duration >= 1 && visitId) {
        supabase.functions.invoke("track-visit", {
          body: {
            visitId,
            duration,
            isInitial: false,
          },
        });
      }
    };
  }, [location.pathname]);
};
