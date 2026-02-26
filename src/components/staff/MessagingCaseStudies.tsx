import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Plus, Trash2, MessageSquare, ArrowDown, ArrowUp, Upload, Loader2, StickyNote, Eye } from "lucide-react";

interface CaseStudy {
  id: string;
  title: string;
  description: string | null;
  context_notes: string | null;
  created_at: string;
}

interface CaseStudyMessage {
  id: string;
  case_study_id: string;
  message_order: number;
  sender_type: string;
  sender_name: string | null;
  message_text: string | null;
  image_url: string | null;
  note: string | null;
}

export const MessagingCaseStudies = () => {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudy, setSelectedStudy] = useState<CaseStudy | null>(null);
  const [messages, setMessages] = useState<CaseStudyMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [parsingImages, setParsingImages] = useState(false);

  useEffect(() => {
    fetchCaseStudies();
  }, []);

  const fetchCaseStudies = async () => {
    const { data, error } = await supabase
      .from("messaging_case_studies")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setCaseStudies(data);
    setLoading(false);
  };

  const fetchMessages = async (studyId: string) => {
    setMessagesLoading(true);
    const { data, error } = await supabase
      .from("case_study_messages")
      .select("*")
      .eq("case_study_id", studyId)
      .order("message_order", { ascending: true });
    if (!error && data) setMessages(data);
    setMessagesLoading(false);
  };

  const handleSelectStudy = (study: CaseStudy) => {
    setSelectedStudy(study);
    fetchMessages(study.id);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const { data, error } = await supabase
      .from("messaging_case_studies")
      .insert({ title: newTitle, description: newDesc || null })
      .select()
      .single();
    if (error) {
      toast.error("Failed to create case study");
      return;
    }
    setCaseStudies(prev => [data, ...prev]);
    setNewTitle("");
    setNewDesc("");
    setCreateOpen(false);
    toast.success("Case study created");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("messaging_case_studies").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setCaseStudies(prev => prev.filter(cs => cs.id !== id));
    if (selectedStudy?.id === id) {
      setSelectedStudy(null);
      setMessages([]);
    }
    toast.success("Case study deleted");
  };

  const addMessage = async (senderType: "us" | "them") => {
    if (!selectedStudy) return;
    const maxOrder = messages.length > 0 ? Math.max(...messages.map(m => m.message_order)) : -1;
    const { data, error } = await supabase
      .from("case_study_messages")
      .insert({
        case_study_id: selectedStudy.id,
        message_order: maxOrder + 1,
        sender_type: senderType,
        message_text: "",
      })
      .select()
      .single();
    if (!error && data) setMessages(prev => [...prev, data]);
  };

  const updateMessage = async (msgId: string, updates: Partial<CaseStudyMessage>) => {
    await supabase.from("case_study_messages").update(updates).eq("id", msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, ...updates } : m));
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("case_study_messages").delete().eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const moveMessage = async (msgId: string, direction: "up" | "down") => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= messages.length) return;

    const currentOrder = messages[idx].message_order;
    const swapOrder = messages[swapIdx].message_order;

    await Promise.all([
      supabase.from("case_study_messages").update({ message_order: swapOrder }).eq("id", messages[idx].id),
      supabase.from("case_study_messages").update({ message_order: currentOrder }).eq("id", messages[swapIdx].id),
    ]);

    const updated = [...messages];
    updated[idx] = { ...updated[idx], message_order: swapOrder };
    updated[swapIdx] = { ...updated[swapIdx], message_order: currentOrder };
    updated.sort((a, b) => a.message_order - b.message_order);
    setMessages(updated);
  };

  const handleImageUpload = async (msgId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `case-studies/${selectedStudy?.id}/${msgId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("marketing-gallery").upload(path, file);
    if (error) {
      toast.error("Failed to upload image");
      return;
    }
    const { data: urlData } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
    await updateMessage(msgId, { image_url: urlData.publicUrl });
  };

  const handleBulkImageUpload = async (files: FileList) => {
    if (!selectedStudy || files.length === 0) return;
    setUploadingImages(true);

    const maxOrder = messages.length > 0 ? Math.max(...messages.map(m => m.message_order)) : -1;
    const newMessages: CaseStudyMessage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const tempId = crypto.randomUUID();
      const path = `case-studies/${selectedStudy.id}/${tempId}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("marketing-gallery").upload(path, file);
      if (uploadError) continue;

      const { data: urlData } = supabase.storage.from("marketing-gallery").getPublicUrl(path);

      const { data, error } = await supabase
        .from("case_study_messages")
        .insert({
          case_study_id: selectedStudy.id,
          message_order: maxOrder + 1 + i,
          sender_type: "us",
          image_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (!error && data) newMessages.push(data);
    }

    setMessages(prev => [...prev, ...newMessages]);
    setUploadingImages(false);
    toast.success(`${newMessages.length} image(s) uploaded`);
  };

  const handleAIParse = async (files: FileList) => {
    if (!selectedStudy || files.length === 0) return;
    setParsingImages(true);

    // Upload all images first
    const imageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const tempId = crypto.randomUUID();
      const path = `case-studies/${selectedStudy.id}/parse-${tempId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("marketing-gallery").upload(path, file);
      if (uploadError) continue;
      const { data: urlData } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }

    if (imageUrls.length === 0) {
      setParsingImages(false);
      toast.error("No images uploaded successfully");
      return;
    }

    try {
      const { data: parseResult, error } = await invokeEdgeFunction("parse-case-study-images", {
        body: { imageUrls, caseStudyId: selectedStudy.id },
      });

      if (error) throw error;

      // Refresh messages after AI parsing
      await fetchMessages(selectedStudy.id);
      toast.success("AI parsed the conversation screenshots into a message flow");
    } catch (err) {
      console.error("AI parse error:", err);
      toast.error("Failed to parse images with AI. Messages added as images instead.");
      // Fallback: just add images as messages
      const maxOrder = messages.length > 0 ? Math.max(...messages.map(m => m.message_order)) : -1;
      for (let i = 0; i < imageUrls.length; i++) {
        const { data } = await supabase
          .from("case_study_messages")
          .insert({
            case_study_id: selectedStudy.id,
            message_order: maxOrder + 1 + i,
            sender_type: "us",
            image_url: imageUrls[i],
          })
          .select()
          .single();
        if (data) setMessages(prev => [...prev, data]);
      }
    }

    setParsingImages(false);
  };

  if (loading) return <LoadingSpinner size="md" className="py-8" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas tracking-wider">MESSAGING CASE STUDIES</h2>
          <p className="text-sm text-muted-foreground">Analyse real messaging conversations with visual flows and strategic notes.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Case Study
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case study list */}
        <div className="space-y-3">
          {caseStudies.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No case studies yet. Create one to get started.
              </CardContent>
            </Card>
          )}
          {caseStudies.map(cs => (
            <Card
              key={cs.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${selectedStudy?.id === cs.id ? "border-primary ring-1 ring-primary/20" : ""}`}
              onClick={() => handleSelectStudy(cs)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{cs.title}</h3>
                    {cs.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{cs.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(cs.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleDelete(cs.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Message flow */}
        <div className="lg:col-span-2">
          {!selectedStudy ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
                Select a case study to view the message flow.
              </CardContent>
            </Card>
          ) : messagesLoading ? (
            <LoadingSpinner size="md" className="py-8" />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bebas tracking-wider">{selectedStudy.title}</CardTitle>
                  {selectedStudy.description && (
                    <p className="text-sm text-muted-foreground">{selectedStudy.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => addMessage("us")}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Our Message
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addMessage("them")}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Their Message
                    </Button>
                    <label>
                      <Button size="sm" variant="outline" asChild disabled={uploadingImages}>
                        <span className="cursor-pointer">
                          {uploadingImages ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                          Upload Images
                        </span>
                      </Button>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleBulkImageUpload(e.target.files)}
                      />
                    </label>
                    <label>
                      <Button size="sm" variant="secondary" asChild disabled={parsingImages}>
                        <span className="cursor-pointer">
                          {parsingImages ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                          AI Parse Screenshots
                        </span>
                      </Button>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleAIParse(e.target.files)}
                      />
                    </label>
                  </div>

                  {/* Message flow visual */}
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        No messages yet. Add messages manually or upload screenshots for AI parsing.
                      </p>
                    )}
                    {messages.map((msg, idx) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isFirst={idx === 0}
                        isLast={idx === messages.length - 1}
                        onUpdate={updateMessage}
                        onDelete={deleteMessage}
                        onMove={moveMessage}
                        onImageUpload={handleImageUpload}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bebas text-2xl tracking-wider">NEW CASE STUDY</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Academy Director Approach" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Context about this conversation..." rows={3} />
            </div>
            <Button onClick={handleCreate} disabled={!newTitle.trim()} className="w-full">Create Case Study</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Individual message bubble component
const MessageBubble = ({
  message,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMove,
  onImageUpload,
}: {
  message: CaseStudyMessage;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, updates: Partial<CaseStudyMessage>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onImageUpload: (id: string, file: File) => void;
}) => {
  const isUs = message.sender_type === "us";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.message_text || "");
  const [note, setNote] = useState(message.note || "");
  const [showNote, setShowNote] = useState(false);

  const handleSave = () => {
    onUpdate(message.id, { message_text: text, note: note || null });
    setEditing(false);
  };

  return (
    <div className={`flex ${isUs ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] space-y-1 ${isUs ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium">{isUs ? "Us" : "Them"}</span>
          {message.sender_name && <span>({message.sender_name})</span>}
        </div>

        <div
          className={`rounded-xl px-4 py-2.5 text-sm relative group ${
            isUs
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          {message.image_url && (
            <img
              src={message.image_url}
              alt="Message screenshot"
              className="rounded-lg mb-2 max-h-64 object-contain cursor-pointer"
              onClick={() => window.open(message.image_url!, "_blank")}
            />
          )}

          {editing ? (
            <div className="space-y-2 min-w-[250px]">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                className="text-foreground bg-background/90 text-sm"
                placeholder="Message text..."
              />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-foreground bg-background/90 text-sm"
                placeholder="Notes: why we said this / what we read into their response..."
              />
              <Input
                value={message.sender_name || ""}
                onChange={(e) => onUpdate(message.id, { sender_name: e.target.value || null })}
                className="text-foreground bg-background/90 text-sm"
                placeholder="Sender name (optional)"
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSave} className="text-xs h-7">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs h-7">Cancel</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUpdate(message.id, { sender_type: isUs ? "them" : "us" })}
                  className="text-xs h-7"
                >
                  Switch to {isUs ? "Them" : "Us"}
                </Button>
                <label>
                  <Button size="sm" variant="ghost" asChild className="text-xs h-7">
                    <span className="cursor-pointer"><Upload className="h-3 w-3" /></span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onImageUpload(message.id, e.target.files[0])} />
                </label>
              </div>
            </div>
          ) : (
            <>
              {message.message_text ? (
                <p className="whitespace-pre-wrap">{message.message_text}</p>
              ) : !message.image_url ? (
                <p className="opacity-50 italic">Click to add message text...</p>
              ) : null}
            </>
          )}

          {/* Hover actions */}
          {!editing && (
            <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-background border rounded-md shadow-sm">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}>
                <MessageSquare className="h-3 w-3" />
              </Button>
              {!isFirst && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(message.id, "up")}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
              )}
              {!isLast && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(message.id, "down")}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNote(!showNote)}>
                <StickyNote className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(message.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        {/* Note display */}
        {(showNote || message.note) && !editing && message.note && (
          <div className={`text-xs px-3 py-1.5 rounded-md bg-accent/50 border border-accent max-w-full ${isUs ? "text-right" : "text-left"}`}>
            <span className="font-medium">Note:</span> {message.note}
          </div>
        )}
      </div>
    </div>
  );
};
