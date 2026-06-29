// Filter out non-genuine visits to proposal/offer pages so things like
// link-preview crawlers, cloud datacenter healthchecks, and Lovable's own
// preview-render infrastructure don't get surfaced as real "views".
//
// We're deliberately conservative: anything that *looks* like a bot, a known
// crawler/preview UA, or a request originating from a major datacenter city
// is excluded. False negatives (a real visitor hidden) are far worse for us
// than false positives (a real bot getting through).

const BOT_UA_PATTERNS = [
  "bot", "crawler", "spider", "spider.", "crawl",
  "preview", "fetcher", "fetch", "scanner", "monitor", "monitoring",
  "headless", "phantomjs", "puppeteer", "playwright", "selenium",
  "lighthouse", "pagespeed", "gtmetrix", "pingdom", "uptimerobot",
  "ahrefs", "semrush", "mj12bot", "dotbot", "petalbot", "yandex", "baidu",
  "duckduckbot", "applebot", "bingbot", "googlebot", "google-inspection",
  "google-site-verification", "google-read-aloud", "google-extended",
  "facebookexternalhit", "facebookcatalog", "facebot",
  "twitterbot", "linkedinbot", "slackbot", "discordbot", "telegrambot",
  "whatsapp", "viber", "skypeuripreview", "redditbot", "embedly",
  "vercelbot", "netlify", "render-render", "fly-prewarm",
  "axios", "node-fetch", "okhttp", "python-requests", "go-http-client",
  "curl/", "wget/", "libwww", "httpclient", "java/", "ruby",
  "lovable", "lovableproject",
];

// Cities that almost exclusively correspond to AWS / Azure / GCP / OCI
// datacenter egress. Any visit reporting from these is treated as bot
// traffic — real users from these towns are rare enough that it's not
// worth the noise of accepting them. Lowercased for comparison.
const DATACENTER_CITIES = new Set([
  "boydton",          // Microsoft Azure (US-East)
  "des moines",       // Microsoft Azure / Google
  "council bluffs",   // Google
  "the dalles",       // Google
  "ashburn",          // AWS us-east-1
  "sterling",         // AWS us-east-1
  "herndon",          // AWS us-east-1
  "dublin",           // AWS eu-west-1 (most generic Ireland egress)
  "columbus",         // AWS us-east-2
  "quincy",           // Microsoft
  "cheyenne",         // Microsoft
  "san jose",         // mixed but mostly cloud
  "kansas city",      // Google
  "moncks corner",    // Google
  "san antonio",      // Microsoft
]);

export function isBotVisit(v: {
  user_agent?: string | null;
  location?: any;
  duration?: number | null;
}): boolean {
  const ua = (v.user_agent ?? "").toLowerCase();
  if (!ua) return true; // no UA at all → almost certainly a backend fetch
  for (const p of BOT_UA_PATTERNS) {
    if (ua.includes(p)) return true;
  }
  const loc = (v.location ?? {}) as any;
  const city = (loc.city ?? "").toString().toLowerCase().trim();
  if (city && DATACENTER_CITIES.has(city)) return true;
  return false;
}

export function isUkVisit(v: { location?: any }): boolean {
  const country = ((v.location ?? {}).country ?? "").toString().toLowerCase();
  return country === "united kingdom" || country === "uk" || country === "gb";
}

// Standard "real, non-UK visitor" predicate used by the outreach + offers
// trackers. Returns true when the visit should be shown to staff.
export function isRealNonUkVisit(v: {
  user_agent?: string | null;
  location?: any;
  duration?: number | null;
}): boolean {
  const country = ((v.location ?? {}).country ?? "").toString().toLowerCase();
  if (!country) return false; // unknown geo → skip (local/private/lovable)
  if (isUkVisit(v)) return false;
  if (isBotVisit(v)) return false;
  return true;
}

// Looser predicate used to surface a visit under the "Viewed" section of
// outreach / offers. Unlike `isRealNonUkVisit` this DOES NOT require a
// resolved country — a confirmed real visit with unknown geo (private IP,
// mobile carrier NAT, VPN, ip-api rate limit, etc.) still counts as a view.
// We still drop confirmed UK traffic (so staff testing doesn't pollute it)
// and obvious bot/preview UAs.
export function isViewableProposalVisit(v: {
  user_agent?: string | null;
  location?: any;
  duration?: number | null;
  referrer?: string | null;
}): boolean {
  if (isUkVisit(v)) return false;
  if (isBotVisit(v)) return false;
  // Drop instant 0s prefetch-style hits that arrive with no referrer and no
  // dwell time — those are almost always link-preview fetchers that slipped
  // past the UA blocklist.
  const dwell = Math.max(0, Number(v.duration ?? 0));
  const hasReferrer = !!(v.referrer && String(v.referrer).trim().length > 0);
  if (dwell < 2 && !hasReferrer) {
    // Allow when we at least have a real-looking UA so genuine direct opens
    // (WhatsApp tap-through with stripped referrer) still count.
    const ua = (v.user_agent ?? "").toLowerCase();
    const looksReal = /mozilla\/|applewebkit|gecko\/|chrome\/|safari\/|firefox\/|edg\//.test(ua);
    if (!looksReal) return false;
  }
  return true;
}