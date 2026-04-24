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

const ARTICLES_PER_PAGE = 9;

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
      <div className="min-h-screen bg-background pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            {releaseId ? (
              loading ? (
                <Skeleton className="w-full h-96" />
              ) : current ? (
                <>
                  <Link to="/press-releases">
                    <Button variant="ghost" className="mb-6">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t("press.back", "Back to Press Releases")}
                    </Button>
                  </Link>
                  <article>
                    <div className="w-full mb-8">
                      <img
                        src={getImage(current)}
                        alt={current.title}
                        className={`w-full h-auto rounded-lg ${!current.image_url ? 'max-w-md mx-auto bg-card p-12' : ''}`}
                      />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-primary font-bebas uppercase tracking-wider">
                        {t("press.label", "Press Release")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(current.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-6">
                      {current.title}
                    </h1>
                    {current.excerpt && (
                      <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                        {current.excerpt}
                      </p>
                    )}
                    <div className="prose prose-lg max-w-none text-foreground">
                      {current.content.split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-4 leading-relaxed">{paragraph}</p>
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
                <div className="text-center mb-12 space-y-3 animate-fade-in">
                  <div className="inline-block">
                    <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                      {t("press.label", "Official Announcements")}
                    </span>
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-foreground">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {releases.slice((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE).map(item => (
                      <Link key={item.id} to={`/press-releases/${createSlug(item.title)}`}>
                        <div className="group cursor-pointer overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                          <div className="relative aspect-[4/3] overflow-hidden bg-black flex items-center justify-center">
                            <img
                              src={getImage(item)}
                              alt={item.title}
                              className={`${item.image_url ? 'w-full h-full object-cover group-hover:scale-110 transition-transform duration-500' : 'max-w-[60%] max-h-[60%] object-contain'}`}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />
                            <div className="absolute top-4 left-4">
                              <span className="text-xs font-bebas uppercase tracking-wider text-white bg-primary/90 px-3 py-1 rounded shadow-lg">
                                {new Date(item.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <div className="p-6 bg-card">
                            <span className="text-xs text-primary font-bebas uppercase tracking-wider">
                              {t("press.label", "Press Release")}
                            </span>
                            <h3 className="text-xl md:text-2xl font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors mt-1 mb-2 line-clamp-2">
                              {item.title}
                            </h3>
                            {item.excerpt && (
                              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{item.excerpt}</p>
                            )}
                          </div>
                        </div>
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