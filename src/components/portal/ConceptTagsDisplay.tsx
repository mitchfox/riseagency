import { useState, useEffect } from "react";
import { BookOpen, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Concept {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  category: string | null;
  attachments?: any;
}

// Singleton cache for concepts
let conceptsCache: Concept[] | null = null;
let conceptsPromise: Promise<Concept[]> | null = null;

const fetchConceptsCached = async (): Promise<Concept[]> => {
  if (conceptsCache) return conceptsCache;
  if (conceptsPromise) return conceptsPromise;
  conceptsPromise = (async () => {
    const { data } = await supabase
      .from("coaching_analysis")
      .select("id, title, content, description, category, attachments")
      .eq("analysis_type", "concept")
      .order("title");
    conceptsCache = (data || []) as Concept[];
    return conceptsCache;
  })();
  return conceptsPromise;
};

interface ConceptTagsDisplayProps {
  conceptTagIds: string[];
}

export const ConceptTagsDisplay = ({ conceptTagIds }: ConceptTagsDisplayProps) => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [viewingConcept, setViewingConcept] = useState<Concept | null>(null);

  useEffect(() => {
    if (!conceptTagIds || conceptTagIds.length === 0) return;
    fetchConceptsCached().then(setConcepts);
  }, [conceptTagIds]);

  if (!conceptTagIds || conceptTagIds.length === 0) return null;

  const taggedConcepts = conceptTagIds
    .map(id => concepts.find(c => c.id === id))
    .filter(Boolean) as Concept[];

  if (taggedConcepts.length === 0) return null;

  const attachments = viewingConcept?.attachments
    ? (Array.isArray(viewingConcept.attachments) ? viewingConcept.attachments : [])
    : [];
  const imageAttachments = attachments.filter((a: any) => a.type === 'image' || a.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
  const videoAttachments = attachments.filter((a: any) => a.type === 'video' || a.url?.match(/\.(mp4|webm|mov)$/i));

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {taggedConcepts.map(concept => (
          <button
            key={concept.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
            onClick={() => setViewingConcept(concept)}
          >
            <BookOpen className="w-3 h-3" />
            {concept.title}
          </button>
        ))}
      </div>

      <Dialog open={!!viewingConcept} onOpenChange={(open) => { if (!open) setViewingConcept(null); }}>
        <DialogContent className="max-w-[90vw] w-full max-h-[85vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {viewingConcept?.title}
          </DialogTitle>
          {viewingConcept?.category && (
            <Badge variant="secondary" className="w-fit">{viewingConcept.category}</Badge>
          )}
          {viewingConcept?.description && (
            <p className="text-sm text-muted-foreground">{viewingConcept.description}</p>
          )}
          {viewingConcept?.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
              {viewingConcept.content}
            </div>
          )}
          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {imageAttachments.map((att: any, i: number) => (
                <img key={i} src={att.url} alt={att.name || ''} className="max-w-xs rounded shadow" />
              ))}
            </div>
          )}
          {videoAttachments.length > 0 && (
            <div className="space-y-2 mt-2">
              {videoAttachments.map((att: any, i: number) => (
                <video key={i} src={att.url} controls className="w-full max-w-md rounded" />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
