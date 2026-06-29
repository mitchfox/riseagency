import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBehaviourTracking } from "@/hooks/useBehaviourTracking";

const EXCLUDED_ROUTES = ['/staff', '/dashboard', '/login', '/portal'];

const shouldTrackRoute = (pathname: string): boolean => {
  return !EXCLUDED_ROUTES.some(route => pathname.startsWith(route));
};

export const usePageTracking = () => {
  const location = useLocation();
  const visitorIdRef = useRef<string>("");
  const [visitId, setVisitId] = useState<string | null>(null);

  useEffect(() => {
    let visitorId = localStorage.getItem("visitor_id");
    // Only accept the canonical visitor_<ts>_<rand> shape — otherwise
    // overwrite with a fresh one. Keeps this hook and the rep tracker
    // sharing the same id so the staff panel join works.
    if (!visitorId || !/^visitor_\d+_[a-z0-9]+$/i.test(visitorId)) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("visitor_id", visitorId);
    }
    visitorIdRef.current = visitorId;
  }, []);

  useEffect(() => {
    if (!shouldTrackRoute(location.pathname)) {
      setVisitId(null);
      return;
    }

    const startTime = Date.now();
    let localVisitId: string | null = null;
    setVisitId(null);

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
      if (id) setVisitId(id);
    });

    return () => {
      const sendDuration = async () => {
        await trackingPromise;
        const duration = Math.round((Date.now() - startTime) / 1000);

        if (duration >= 1 && localVisitId) {
          // Prefer sendBeacon — it's the only transport guaranteed to
          // survive a tab close / navigation, which is exactly when this
          // unmount fires for proposal pages. Falls back to fetch (which
          // most browsers still ship through during pagehide) if beacon
          // isn't available.
          const fnUrl = `${(import.meta as any).env?.VITE_SUPABASE_URL ?? ""}/functions/v1/track-visit`;
          const payload = JSON.stringify({
            visitId: localVisitId,
            duration,
            isInitial: false,
          });
          try {
            if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function" && fnUrl) {
              navigator.sendBeacon(fnUrl, new Blob([payload], { type: "text/plain" }));
            } else {
              supabase.functions.invoke("track-visit", {
                body: { visitId: localVisitId, duration, isInitial: false },
              });
            }
          } catch {
            // Best-effort — ignore if the browser refuses the beacon.
          }
        }
      };

      sendDuration();
    };
  }, [location.pathname]);

  useBehaviourTracking(visitId, location.pathname);
};
