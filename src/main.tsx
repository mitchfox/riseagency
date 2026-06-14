// PWA route persistence + scope guard: keep standalone app inside /portal or /staff
(function() {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;

  // Skip scope guard in Lovable preview environment (mobile editor/preview can otherwise loop-reload)
  const hostname = window.location.hostname;
  const isLovablePreview = hostname.startsWith('id-preview--') ||
                           window.location.search.includes('__lovable_token') ||
                           window.self !== window.top;

  if (!isPWA || isLovablePreview) return;

  const currentPathname = window.location.pathname;
  const currentFullPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const LAST_ROUTE_KEY = 'pwa_last_route';
  const LAST_SCOPE_KEY = 'pwa_last_scope';
  const HOME_ROUTES = new Set(['/', '/index.html']);
  const pathOnly = (route: string) => route.split('?')[0].split('#')[0] || '/';
  const isStaffRoute = (path: string) => path === '/staff' || path.startsWith('/staff/');
  const isPortalRoute = (path: string) => path === '/portal' || path.startsWith('/portal/');
  const isRestorableRoute = (path: string) => isStaffRoute(path) || isPortalRoute(path);
  const isPublicOutreachRoute = (path: string) => path === '/clubs' || path.startsWith('/clubs/') || path.startsWith('/club-proposal/');

  // Club proposal links are public pages. They must never become the saved
  // Staff PWA route, otherwise iOS can keep relaunching the PWA into a proposal.
  if (isPublicOutreachRoute(currentPathname)) {
    try {
      const savedRoute = localStorage.getItem(LAST_ROUTE_KEY);
      if (savedRoute && isPublicOutreachRoute(pathOnly(savedRoute))) {
        localStorage.removeItem(LAST_ROUTE_KEY);
        localStorage.removeItem(LAST_SCOPE_KEY);
      }
    } catch {}
    return;
  }

  // Persist only the actual installed app shells, not public website/proposal pages.
  if (isRestorableRoute(currentPathname)) {
    try {
      localStorage.setItem(LAST_ROUTE_KEY, currentFullPath);
      localStorage.setItem(LAST_SCOPE_KEY, isStaffRoute(currentPathname) ? 'staff' : 'portal');
    } catch {}
    return;
  }

  if (!HOME_ROUTES.has(currentPathname)) return;

  // Cold-start landed on root — restore last visited staff/player portal route if valid.
  let savedRoute: string | null = null;
  try {
    savedRoute = localStorage.getItem(LAST_ROUTE_KEY);
  } catch {}

  const savedPath = savedRoute ? pathOnly(savedRoute) : null;
  if (savedRoute && savedPath && !isRestorableRoute(savedPath)) {
    try {
      localStorage.removeItem(LAST_ROUTE_KEY);
      localStorage.removeItem(LAST_SCOPE_KEY);
    } catch {}
    return;
  }

  if (savedRoute && savedRoute !== currentFullPath && savedPath && !HOME_ROUTES.has(savedPath)) {
    window.location.replace(savedRoute);
  }
})();

// Redirect www.{subdomain}.domain.com → {subdomain}.domain.com
// Also translates English paths to localized paths for language subdomains
// Must run before React renders to avoid flash of content
(function() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Language subdomains and their route translations
  const LANGUAGE_SUBDOMAINS = ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr'];
  const routeTranslations: Record<string, Record<string, string>> = {
    '/players': { en: '/players', es: '/jugadoras', pt: '/jogadoras', fr: '/joueurs', de: '/spielerinnen', it: '/giocatrici', pl: '/zawodniczki', cs: '/hracky', ru: '/igroki', tr: '/oyuncular' },
    '/learnmore': { en: '/learnmore', es: '/aprender-mas', pt: '/saiba-mais', fr: '/en-savoir-plus', de: '/erfahren-mehr', it: '/scopri-di-piu', pl: '/dowiedz-sie-wiecej', cs: '/zjistit-vice', ru: '/uznat-bolshe', tr: '/daha-fazla-bilgi' },
    '/stars': { en: '/stars', es: '/estrellas', pt: '/estrelas', fr: '/etoiles', de: '/sterne', it: '/stelle', pl: '/gwiazdy', cs: '/hvezdy', ru: '/zvezdy', tr: '/yildizlar' },
    '/clubs': { en: '/clubs', es: '/clubes', pt: '/clubes', fr: '/clubs', de: '/vereine', it: '/club', pl: '/kluby', cs: '/kluby', ru: '/kluby', tr: '/kulupler' },
    '/scouts': { en: '/scouts', es: '/ojeadores', pt: '/olheiros', fr: '/recruteurs', de: '/scouts', it: '/osservatori', pl: '/skauci', cs: '/skauti', ru: '/skauty', tr: '/skautlar' },
    '/coaches': { en: '/coaches', es: '/entrenadores', pt: '/treinadores', fr: '/entraineurs', de: '/trainer', it: '/allenatori', pl: '/trenerzy', cs: '/treneri', ru: '/trenery', tr: '/antrenorler' },
    '/agents': { en: '/agents', es: '/agentes', pt: '/agentes', fr: '/agents', de: '/agenten', it: '/agenti', pl: '/agenci', cs: '/agenti', ru: '/agenty', tr: '/menajerler' },
    '/about': { en: '/about', es: '/nosotros', pt: '/sobre', fr: '/a-propos', de: '/ueber-uns', it: '/chi-siamo', pl: '/o-nas', cs: '/o-nas', ru: '/o-nas', tr: '/hakkimizda' },
    '/news': { en: '/news', es: '/noticias', pt: '/noticias', fr: '/actualites', de: '/nachrichten', it: '/notizie', pl: '/aktualnosci', cs: '/novinky', ru: '/novosti', tr: '/haberler' },
    '/contact': { en: '/contact', es: '/contacto', pt: '/contato', fr: '/contact', de: '/kontakt', it: '/contatti', pl: '/kontakt', cs: '/kontakt', ru: '/kontakty', tr: '/iletisim' },
    '/performance': { en: '/performance', es: '/rendimiento', pt: '/desempenho', fr: '/performance', de: '/leistung', it: '/prestazioni', pl: '/wydajnosc', cs: '/vykon', ru: '/rezultaty', tr: '/performans' },
    '/between-the-lines': { en: '/between-the-lines', es: '/entre-lineas', pt: '/entre-linhas', fr: '/entre-les-lignes', de: '/zwischen-den-zeilen', it: '/tra-le-righe', pl: '/miedzy-wierszami', cs: '/mezi-radky', ru: '/mezhdu-strok', tr: '/satirlar-arasi' },
    '/login': { en: '/login', es: '/acceso', pt: '/entrar', fr: '/connexion', de: '/anmelden', it: '/accedi', pl: '/logowanie', cs: '/prihlaseni', ru: '/vhod', tr: '/giris' },
    '/portal': { en: '/portal', es: '/portal', pt: '/portal', fr: '/portail', de: '/portal', it: '/portale', pl: '/portal', cs: '/portal', ru: '/portal', tr: '/portal' },
    '/representation': { en: '/representation', es: '/representacion', pt: '/representacao', fr: '/representation', de: '/vertretung', it: '/rappresentanza', pl: '/reprezentacja', cs: '/zastoupeni', ru: '/predstavitelstvo', tr: '/temsil' },
  };
  
  // Check for www.{subdomain}.domain.com format (4+ parts with www prefix)
  if (parts.length >= 4 && parts[0].toLowerCase() === 'www') {
    const subdomain = parts[1].toLowerCase();
    const newHostname = parts.slice(1).join('.');
    let pathname = window.location.pathname;
    
    // If it's a language subdomain, translate the path
    const langCode = subdomain === 'cz' ? 'cs' : subdomain;
    if (LANGUAGE_SUBDOMAINS.includes(subdomain) && langCode !== 'en') {
      const pathParts = pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const basePath = '/' + pathParts[0];
        const translations = routeTranslations[basePath];
        if (translations && translations[langCode] && translations[langCode] !== basePath) {
          const rest = pathParts.slice(1).join('/');
          pathname = rest ? `${translations[langCode]}/${rest}` : translations[langCode];
        }
      }
    }
    
    const newUrl = `${window.location.protocol}//${newHostname}${pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(newUrl);
  }
})();

// Edge geo-redirect for /representation: instantly send visitors on the apex
// (or non-language host) to their language subdomain + localised slug.
// Runs before React renders so there is no flash of English.
// (Now lives as an inline blocking <script> in index.html so it executes
//  BEFORE the bundled module loads — see the geo-redirect block in <head>.)

import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import App from "./App.tsx";
import "./index.css";

// Monkey-patch sonner's toast.error so every error toast gets a "Report" button
const _originalError = toast.error.bind(toast);
(toast as any).error = (message: string | React.ReactNode, data?: any) => {
  const messageStr = typeof message === "string" ? message : String(message);
  return _originalError(message, {
    ...data,
    duration: data?.duration ?? 8000,
    action: data?.action ?? {
      label: "Report",
      onClick: async () => {
        try {
          const route = window.location.pathname + window.location.search;
          await supabase.from("staff_notification_events").insert({
            event_type: "error_report",
            title: "User-Reported Error",
            body: messageStr,
            event_data: {
              route,
              context: data?.description || null,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
            },
          });
          toast.success("Error reported — thank you!");
        } catch {
          toast("Could not send report.");
        }
      },
    },
  });
};

// Register service worker with update detection - wrapped in try-catch to prevent console errors
const isLovablePreviewEnv = window.location.hostname.startsWith('id-preview--') ||
                             window.location.hostname.includes('lovableproject.com') ||
                             window.location.search.includes('__lovable_token') ||
                             window.self !== window.top;

if (isLovablePreviewEnv) {
  document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]').forEach((link) => link.remove());
}

// If a SW was previously installed, remove it in Lovable preview to prevent reload loops
if (isLovablePreviewEnv && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
  if ('caches' in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
  }
}

if ('serviceWorker' in navigator && !isLovablePreviewEnv) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker registered');
      
      // Check for updates on page load - wrapped in try-catch
      try {
        await registration.update();
      } catch {
        // Silently ignore update errors - not critical
      }
      
      // Check for updates periodically (every 5 minutes)
      setInterval(async () => {
        try {
          await registration.update();
        } catch {
          // Silently ignore periodic update errors
        }
      }, 5 * 60 * 1000);
    } catch {
      // Silently fail - SW is not critical for app functionality
    }
  });
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
