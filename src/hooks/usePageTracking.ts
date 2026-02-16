import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const EXCLUDED_ROUTES = ['/staff', '/dashboard', '/login', '/portal'];

const shouldTrackRoute = (pathname: string): boolean => {
  return !EXCLUDED_ROUTES.some(route => pathname.startsWith(route));
};

export const usePageTracking = () => {
  const location = useLocation();
  const visitorIdRef = useRef<string>("");

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
    let localVisitId: string | null = null;

    const trackPageView = async (): Promise<string | null> => {
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
          return data.visitId;
        }
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
      return null;
    };

    const trackingPromise = trackPageView().then(id => {
      localVisitId = id;
    });

    return () => {
      const sendDuration = async () => {
        await trackingPromise;
        const duration = Math.round((Date.now() - startTime) / 1000);

        if (duration >= 1 && localVisitId) {
          supabase.functions.invoke("track-visit", {
            body: {
              visitId: localVisitId,
              duration,
              isInitial: false,
            },
          });
        }
      };

      sendDuration();
    };
  }, [location.pathname]);
};
