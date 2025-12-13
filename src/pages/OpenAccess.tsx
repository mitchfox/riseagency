import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, parseISO } from "date-fns";

interface OpenAccessIssue {
  id: string;
  month: string;
  published: boolean;
  created_at: string;
}

interface OpenAccessPage {
  id: string;
  issue_id: string;
  page_number: number;
  image_url: string;
  display_order: number;
}

const OpenAccess = () => {
  const { t } = useLanguage();
  const [issues, setIssues] = useState<OpenAccessIssue[]>([]);
  const [pages, setPages] = useState<OpenAccessPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<OpenAccessIssue | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [issuesRes, pagesRes] = await Promise.all([
        supabase
          .from("open_access_issues")
          .select("*")
          .eq("published", true)
          .order("month", { ascending: false }),
        supabase
          .from("open_access_pages")
          .select("*")
          .order("display_order", { ascending: true })
      ]);

      if (issuesRes.error) throw issuesRes.error;
      if (pagesRes.error) throw pagesRes.error;

      setIssues(issuesRes.data || []);
      setPages(pagesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIssuePages = (issueId: string) => {
    return pages.filter(p => p.issue_id === issueId).sort((a, b) => a.display_order - b.display_order);
  };

  const formatMonth = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const openViewer = (issue: OpenAccessIssue) => {
    setSelectedIssue(issue);
    setCurrentPageIndex(0);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setSelectedIssue(null);
    setCurrentPageIndex(0);
  };

  const issuePages = selectedIssue ? getIssuePages(selectedIssue.id) : [];

  return (
    <>
      <SEO 
        title="Open Access - RISE Football Agency"
        description="Read our monthly Open Access magazine featuring exclusive insights, player stories, and behind-the-scenes content from RISE Football Agency."
        url="/open-access"
      />
      <Header />
      <div className="min-h-screen bg-background pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 space-y-3 animate-fade-in">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Monthly Magazine
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-foreground">
                Open <span className="text-primary">Access</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our monthly magazine featuring exclusive player stories, behind-the-scenes content, and the latest from RISE Football Agency.
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">
                  No issues available yet. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {issues.map((issue) => {
                  const issuePages = getIssuePages(issue.id);
                  const coverImage = issuePages[0]?.image_url;

                  return (
                    <button
                      key={issue.id}
                      onClick={() => openViewer(issue)}
                      className="group text-left overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                        {coverImage ? (
                          <img 
                            src={coverImage} 
                            alt={formatMonth(issue.month)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-muted-foreground">No cover</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-2xl font-bebas uppercase tracking-wider text-white">
                            {formatMonth(issue.month)}
                          </h3>
                          <p className="text-sm text-white/70">
                            {issuePages.length} page{issuePages.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen page viewer */}
      {viewerOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeViewer}
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>

          {issuePages.length > 0 ? (
            <>
              <img
                src={issuePages[currentPageIndex]?.image_url}
                alt={`Page ${currentPageIndex + 1}`}
                className="max-h-full max-w-full object-contain"
              />

              {/* Navigation */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/70 px-4 py-2 rounded-full">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPageIndex(i => Math.max(0, i - 1))}
                  disabled={currentPageIndex === 0}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <span className="text-white text-sm font-bebas">
                  {currentPageIndex + 1} / {issuePages.length}
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPageIndex(i => Math.min(issuePages.length - 1, i + 1))}
                  disabled={currentPageIndex === issuePages.length - 1}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Title */}
              <div className="absolute top-4 left-4 bg-black/70 px-4 py-2 rounded">
                <h2 className="text-white font-bebas uppercase tracking-wider">
                  {formatMonth(selectedIssue.month)}
                </h2>
              </div>
            </>
          ) : (
            <p className="text-white">No pages in this issue</p>
          )}
        </div>
      )}
    </>
  );
};

export default OpenAccess;
