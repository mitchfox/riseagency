import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import riseWhiteLogo from "@/assets/RISEWhite.png";

interface PressRelease {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string;
}

const createSlug = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

const getImage = (r: PressRelease) => r.image_url || riseWhiteLogo;

const ARTICLES_PER_PAGE = 12;

const PressReleases = () => {
  const { releaseId } = useParams();
  const { t } = useLanguage();
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [current, setCurrent] = useState<PressRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("press_releases")
        .select("id, title, content, excerpt, image_url, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      const list = (data || []) as PressRelease[];
      setReleases(list);
      if (releaseId) {
        setCurrent(list.find(r => createSlug(r.title) === releaseId) || null);
      } else {
        setCurrent(null);
      }
      setLoading(false);
    };
    fetchAll();
  }, [releaseId]);

  return (
    <>
      <SEO
        title={current ? `${current.title} | RISE Football Agency` : "Press Releases | RISE Football Agency"}
        description={current ? (current.excerpt || current.title) : "Official press releases and announcements from RISE Football Agency."}
        image={current ? getImage(current) : "/og-preview-media.png"}
        url={releaseId ? `/press-releases/${releaseId}` : "/press-releases"}
      />
      <Header />
      <div className="min-h-screen bg-background pt-28 md:pt-20 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="max-w-7xl mx-auto">
            {releaseId ? (
              loading ? (
                <Skeleton className="w-full h-96" />
              ) : current ? (
                <>
                  <Link to="/press-releases">
                    <Button variant="ghost" size="sm" className="mb-4 font-bebas uppercase tracking-wider text-xs">
                      <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                      {t("press.back", "Back to Press Releases")}
                    </Button>
                  </Link>
                  <article className="max-w-4xl mx-auto">
                    {current.image_url ? (
                      <div className="w-full mb-6 overflow-hidden rounded-md border border-primary/20">
                        <img
                          src={current.image_url}
                          alt={current.title}
                          className="w-full h-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-full mb-6 aspect-[16/7] rounded-md border border-primary/20 bg-gradient-to-br from-black via-card to-black flex items-center justify-center overflow-hidden">
                        <img
                          src={riseWhiteLogo}
                          alt="RISE"
                          className="h-12 md:h-14 w-auto object-contain opacity-90"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-primary/20">
                      <span className="text-[11px] text-primary font-bebas uppercase tracking-[0.25em]">
                        {t("press.label", "Press Release")}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-bebas uppercase tracking-[0.2em]">
                        {new Date(current.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bebas uppercase tracking-wider text-foreground mb-5 leading-tight">
                      {current.title}
                    </h1>
                    {current.excerpt && (
                      <p className="text-lg text-muted-foreground mb-6 leading-relaxed border-l-2 border-primary/60 pl-4">
                        {current.excerpt}
                      </p>
                    )}
                    <div className="prose prose-lg max-w-none text-foreground">
                      {current.content.split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-3 leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  </article>
                </>
              ) : (
                <div className="text-center py-20">
                  <p className="text-xl text-muted-foreground">
                    {t("press.not_found", "Press release not found")}
                  </p>
                </div>
              )
            ) : (
              <>
                <div className="text-center mb-8 md:mb-10 space-y-2 animate-fade-in">
                  <div className="inline-block">
                    <span className="text-[11px] font-bebas uppercase tracking-[0.3em] text-primary border-y border-primary/40 px-4 py-1">
                      {t("press.label", "Official Announcements")}
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                    {t("press.title", "Press")} <span className="text-primary">{t("press.releases", "Releases")}</span>
                  </h1>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-4">
                        <Skeleton className="h-80 w-full rounded-lg" />
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ))}
                  </div>
                ) : releases.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xl text-muted-foreground">
                      {t("press.no_releases", "No press releases yet")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {releases.slice((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE).map(item => (
                      <Link key={item.id} to={`/press-releases/${createSlug(item.title)}`}>
                        <article className="group h-full cursor-pointer overflow-hidden rounded-md border border-border bg-card hover:border-primary/60 transition-all duration-300 hover:shadow-[0_8px_30px_-12px_hsl(var(--gold)/0.4)]">
                          <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-black via-card to-black flex items-center justify-center">
                            {item.image_url ? (
                              <>
                                <img
                                  src={item.image_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-70 group-hover:opacity-85 transition-opacity pointer-events-none" />
                              </>
                            ) : (
                              <>
                                <img
                                  src={riseWhiteLogo}
                                  alt="RISE"
                                  className="h-10 md:h-12 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                  loading="lazy"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                              </>
                            )}
                            <div className="absolute top-2.5 left-2.5">
                              <span className="text-[10px] font-bebas uppercase tracking-[0.2em] text-white bg-primary/90 px-2 py-0.5 rounded-sm shadow-lg">
                                {new Date(item.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 border-t border-primary/10">
                            <span className="text-[10px] text-primary font-bebas uppercase tracking-[0.25em]">
                              {t("press.label", "Press Release")}
                            </span>
                            <h3 className="text-base md:text-lg font-bebas uppercase tracking-wide text-foreground group-hover:text-primary transition-colors mt-1 mb-1.5 line-clamp-2 leading-tight">
                              {item.title}
                            </h3>
                            {item.excerpt && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.excerpt}</p>
                            )}
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                )}

                {!loading && releases.length > ARTICLES_PER_PAGE && (
                  <div className="flex justify-center items-center gap-4 mt-12">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="font-bebas uppercase">
                      <ChevronLeft className="w-4 h-4 mr-1" /> {t("news.previous", "Previous")}
                    </Button>
                    <span className="text-sm text-muted-foreground font-bebas">
                      {t("news.page", "Page")} {page} {t("news.of", "of")} {Math.ceil(releases.length / ARTICLES_PER_PAGE)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(releases.length / ARTICLES_PER_PAGE), p + 1))} disabled={page === Math.ceil(releases.length / ARTICLES_PER_PAGE)} className="font-bebas uppercase">
                      {t("news.next", "Next")} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PressReleases;