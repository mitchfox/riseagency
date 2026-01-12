import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, Edit2, Save, FolderPlus, Folder, Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StaffDoc {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface DocFolder {
  id: string;
  name: string;
}

export const DocsSection = () => {
  const [docs, setDocs] = useState<StaffDoc[]>([]);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<StaffDoc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [filterFolder, setFilterFolder] = useState<string>("all");
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchDocs();
    fetchFolders();
  }, []);

  const fetchDocs = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("doc_type", "doc")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_documents")
        .select("folder_id")
        .eq("doc_type", "doc")
        .not("folder_id", "is", null);

      if (error) throw error;

      const uniqueFolders = Array.from(new Set((data || []).map(d => d.folder_id).filter(Boolean)));
      setFolders(uniqueFolders.map(id => ({ id: id as string, name: id as string })));
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    try {
      const docData = {
        title,
        content,
        folder_id: selectedFolder,
        doc_type: "doc",
        updated_at: new Date().toISOString()
      };

      if (selectedDoc && !isCreating) {
        const { error } = await supabase
          .from("staff_documents")
          .update(docData)
          .eq("id", selectedDoc.id);
        if (error) throw error;
        toast.success("Document updated");
      } else {
        const { error } = await supabase
          .from("staff_documents")
          .insert(docData);
        if (error) throw error;
        toast.success("Document created");
      }
      resetForm();
      fetchDocs();
      fetchFolders();
    } catch (error) {
      toast.error("Failed to save document");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      const { error } = await supabase.from("staff_documents").delete().eq("id", id);
      if (error) throw error;
      toast.success("Document deleted");
      setSelectedDoc(null);
      setIsEditing(false);
      fetchDocs();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const createFolder = () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }
    setFolders([...folders, { id: newFolderName, name: newFolderName }]);
    setSelectedFolder(newFolderName);
    setNewFolderName("");
    setIsFolderDialogOpen(false);
    toast.success("Folder created");
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedFolder(null);
    setSelectedDoc(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const openDoc = (doc: StaffDoc) => {
    setSelectedDoc(doc);
    setTitle(doc.title);
    setContent(doc.content);
    setSelectedFolder(doc.folder_id);
    setIsEditing(false);
    setIsCreating(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const startCreating = () => {
    setTitle("");
    setContent("");
    setSelectedFolder(null);
    setSelectedDoc(null);
    setIsCreating(true);
    setIsEditing(true);
  };

  const applyFormat = (formatType: string) => {
    const textarea = document.getElementById("doc-content-section") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let prefix = "";
    let suffix = "";

    switch (formatType) {
      case "bold":
        prefix = "**";
        suffix = "**";
        break;
      case "italic":
        prefix = "*";
        suffix = "*";
        break;
      case "underline":
        prefix = "__";
        suffix = "__";
        break;
      case "h1":
        prefix = "# ";
        break;
      case "h2":
        prefix = "## ";
        break;
      case "bullet":
        prefix = "• ";
        break;
      case "number":
        prefix = "1. ";
        break;
      default:
        return;
    }

    const formattedText = prefix + selectedText + suffix;
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
  };

  const filteredDocs = filterFolder === "all"
    ? docs
    : filterFolder === "unfiled"
      ? docs.filter(d => !d.folder_id)
      : docs.filter(d => d.folder_id === filterFolder);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  // Show document editor/viewer
  if (selectedDoc || isCreating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={resetForm} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Documents
          </Button>
          <div className="flex gap-2">
            {!isEditing && selectedDoc && (
              <>
                <Button variant="outline" onClick={startEditing}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedDoc.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Document title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 text-lg font-semibold"
                />
                <Select value={selectedFolder || "none"} onValueChange={(v) => setSelectedFolder(v === "none" ? null : v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="outline">
                      <FolderPlus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>New Folder</DialogTitle>
                    </DialogHeader>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Folder name..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                      <Button onClick={createFolder}>Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Formatting toolbar */}
              <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg">
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => applyFormat("bold")}>
                  <Bold className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => applyFormat("italic")}>
                  <Italic className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => applyFormat("underline")}>
                  <Underline className="w-4 h-4" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => applyFormat("h1")}>
                  <Heading1 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => applyFormat("h2")}>
                  <Heading2 className="w-4 h-4" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => applyFormat("bullet")}>
                  <List className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => applyFormat("number")}>
                  <ListOrdered className="w-4 h-4" />
                </Button>
              </div>

              <textarea
                id="doc-content-section"
                placeholder="Write your content here... (Supports Markdown formatting)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[500px] p-4 rounded-lg border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedDoc?.title}</CardTitle>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span>Last updated: {selectedDoc && format(new Date(selectedDoc.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    {selectedDoc?.folder_id && (
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3" /> {selectedDoc.folder_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {selectedDoc?.content || <span className="text-muted-foreground italic">No content</span>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show document list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filterFolder} onValueChange={setFilterFolder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All docs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All documents ({docs.length})</SelectItem>
              <SelectItem value="unfiled">Unfiled</SelectItem>
              {folders.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3" /> {f.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <Button onClick={startCreating} className="gap-2">
          <Plus className="w-4 h-4" /> New Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <Card
            key={doc.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => openDoc(doc)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <FileText className="w-8 h-8 text-primary shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{doc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(doc.updated_at), "MMM d, yyyy")}
                  </p>
                  {doc.folder_id && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Folder className="w-3 h-3" /> {doc.folder_id}
                    </span>
                  )}
                  {doc.content && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {doc.content.substring(0, 100)}...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No documents yet</p>
          <Button onClick={startCreating} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Create your first document
          </Button>
        </div>
      )}
    </div>
  );
};