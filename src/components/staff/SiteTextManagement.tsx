import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Search, FileText, Save, GripVertical, Download, Copy } from "lucide-react";

interface SiteText {
  id: string;
  page_name: string;
  section_name: string | null;
  text_key: string;
  display_order: number;
  english_text: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE_OPTIONS = [
  { value: "landing", label: "Landing Page", order: 1 },
  { value: "home", label: "Home Page", order: 2 },
  { value: "header", label: "Header", order: 3 },
  { value: "footer", label: "Footer", order: 4 },
  { value: "stars", label: "Stars Page", order: 5 },
  { value: "clubs", label: "Clubs Page", order: 6 },
  { value: "scouts", label: "Scouts Page", order: 7 },
  { value: "agents", label: "Agents Page", order: 8 },
  { value: "coaches", label: "Coaches Page", order: 9 },
  { value: "about", label: "About Page", order: 10 },
  { value: "news", label: "News Page", order: 11 },
  { value: "btl", label: "Between The Lines", order: 12 },
  { value: "realise", label: "Realise Page", order: 13 },
  { value: "intro", label: "Intro/Splash", order: 14 },
  { value: "map", label: "Map Page", order: 15 },
  { value: "common", label: "Common Elements", order: 16 },
  { value: "countries", label: "Countries", order: 17 },
  { value: "dialogs", label: "Dialogs & Modals", order: 18 },
  { value: "forms", label: "Forms", order: 19 },
  { value: "errors", label: "Error Messages", order: 20 },
];

// Track original values to detect changes
interface OriginalText {
  id: string;
  text_key: string;
  english_text: string;
}

export const SiteTextManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [siteTexts, setSiteTexts] = useState<SiteText[]>([]);
  const [originalTexts, setOriginalTexts] = useState<OriginalText[]>([]);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [editingText, setEditingText] = useState<SiteText | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInline, setEditingInline] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState("");

  const [formData, setFormData] = useState({
    page_name: "",
    section_name: "",
    text_key: "",
    display_order: 0,
    english_text: "",
    description: "",
  });

  useEffect(() => {
    fetchSiteTexts(true);
  }, []);

  const fetchSiteTexts = async (isInitialLoad = false) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_text")
      .select("*")
      .order("page_name")
      .order("display_order");

    if (error) {
      toast.error("Failed to fetch site text");
      console.error(error);
    } else {
      setSiteTexts(data || []);
      // Store original values only on initial load
      if (isInitialLoad) {
        setOriginalTexts((data || []).map(t => ({
          id: t.id,
          text_key: t.text_key,
          english_text: t.english_text
        })));
        setChangedIds(new Set());
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error("Only admins can modify site text");
      return;
    }

    const textData = {
      page_name: formData.page_name,
      section_name: formData.section_name || null,
      text_key: formData.text_key,
      display_order: formData.display_order,
      english_text: formData.english_text,
      description: formData.description || null,
    };

    if (editingText) {
      const { error } = await supabase
        .from("site_text")
        .update(textData)
        .eq("id", editingText.id);

      if (error) {
        toast.error("Failed to update text");
        console.error(error);
        return;
      }
      toast.success("Text updated successfully");
    } else {
      const { error } = await supabase.from("site_text").insert([textData]);

      if (error) {
        toast.error("Failed to create text entry");
        console.error(error);
        return;
      }
      toast.success("Text entry created");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchSiteTexts();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only admins can delete site text");
      return;
    }

    if (!confirm("Are you sure you want to delete this text entry?")) return;

    const { error } = await supabase.from("site_text").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete text");
      console.error(error);
      return;
    }

    toast.success("Text deleted");
    fetchSiteTexts();
  };

  const handleInlineSave = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only admins can modify site text");
      return;
    }

    const { error } = await supabase
      .from("site_text")
      .update({ english_text: inlineValue })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save text");
      console.error(error);
      return;
    }

    // Track this change - compare against original
    const original = originalTexts.find(t => t.id === id);
    console.log('Tracking change:', { id, inlineValue, original, originalTextsLength: originalTexts.length });
    
    if (original) {
      if (original.english_text !== inlineValue) {
        setChangedIds(prev => {
          const next = new Set(prev);
          next.add(id);
          console.log('Added to changedIds:', id, 'Total:', next.size);
          return next;
        });
      } else {
        // If reverted to original, remove from changed
        setChangedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }

    // Update local state immediately
    setSiteTexts(prev => prev.map(t => 
      t.id === id ? { ...t, english_text: inlineValue } : t
    ));

    toast.success("Text saved");
    setEditingInline(null);
  };

  const resetForm = () => {
    setFormData({
      page_name: "",
      section_name: "",
      text_key: "",
      display_order: 0,
      english_text: "",
      description: "",
    });
    setEditingText(null);
  };

  // Get only the changed texts for export
  const getChangedTexts = () => {
    return siteTexts.filter(t => changedIds.has(t.id));
  };

  const exportChangesCode = () => {
    const changed = getChangedTexts();
    if (changed.length === 0) {
      toast.info("No changes to export");
      return;
    }
    
    const header = `/* SITE TEXT CHANGES - Paste this to Lovable AI
   
   IMPORTANT: After updating the code, also add translations:
   1. Go to Staff > Languages Management
   2. Add translations for each text_key below in all supported languages
   3. Ensure the text_key matches exactly for translations to work
   
*/\n\n`;
    
    const code = changed.map(t => 
      `// Page: ${t.page_name} | Section: ${t.section_name || 'general'} | Key: ${t.text_key}\n// New text: "${t.english_text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    ).join('\n\n');
    
    navigator.clipboard.writeText(header + code);
    toast.success(`${changed.length} change(s) copied to clipboard!`);
    
    // Clear changes after export
    setChangedIds(new Set());
    setOriginalTexts(siteTexts.map(t => ({
      id: t.id,
      text_key: t.text_key,
      english_text: t.english_text
    })));
  };

  const clearChanges = () => {
    setChangedIds(new Set());
    // Reset original texts to current state
    setOriginalTexts(siteTexts.map(t => ({
      id: t.id,
      text_key: t.text_key,
      english_text: t.english_text
    })));
    toast.success("Changes cleared");
  };

  const openEditDialog = (text: SiteText) => {
    setEditingText(text);
    setFormData({
      page_name: text.page_name,
      section_name: text.section_name || "",
      text_key: text.text_key,
      display_order: text.display_order,
      english_text: text.english_text,
      description: text.description || "",
    });
    setIsDialogOpen(true);
  };

  const startInlineEdit = (text: SiteText) => {
    setEditingInline(text.id);
    setInlineValue(text.english_text);
  };

  // Filter texts
  const filteredTexts = siteTexts.filter((text) => {
    const matchesSearch =
      searchQuery === "" ||
      text.english_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      text.text_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (text.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesPage = selectedPage === "all" || text.page_name === selectedPage;

    return matchesSearch && matchesPage;
  });

  // Group by page
  const groupedByPage = filteredTexts.reduce((acc, text) => {
    if (!acc[text.page_name]) {
      acc[text.page_name] = [];
    }
    acc[text.page_name].push(text);
    return acc;
  }, {} as Record<string, SiteText[]>);

  // Sort pages by their defined order
  const sortedPages = Object.keys(groupedByPage).sort((a, b) => {
    const orderA = PAGE_OPTIONS.find((p) => p.value === a)?.order ?? 999;
    const orderB = PAGE_OPTIONS.find((p) => p.value === b)?.order ?? 999;
    return orderA - orderB;
  });

  const getPageLabel = (pageName: string) => {
    return PAGE_OPTIONS.find((p) => p.value === pageName)?.label || pageName;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle>Site Text Management</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              {changedIds.size > 0 && (
                <Button
                  onClick={exportChangesCode}
                  size="sm"
                  variant="default"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {changedIds.size} Change{changedIds.size !== 1 ? 's' : ''}
                </Button>
              )}
              {isAdmin && (
                <Button
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Text
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Manage all English text on the site. Edit text here to update it across the site.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search text content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                {PAGE_OPTIONS.map((page) => (
                  <SelectItem key={page.value} value={page.value}>
                    {page.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{siteTexts.length} total entries</span>
            <span>{sortedPages.length} pages</span>
            {searchQuery && <span>{filteredTexts.length} matching</span>}
          </div>

          {/* Content grouped by page */}
          {sortedPages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No text entries match your search" : "No text entries yet. Add your first one!"}
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {sortedPages.map((pageName) => {
                const pageTexts = groupedByPage[pageName].sort(
                  (a, b) => a.display_order - b.display_order
                );

                return (
                  <AccordionItem
                    key={pageName}
                    value={pageName}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{getPageLabel(pageName)}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {pageTexts.length} items
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2 pb-4">
                        {pageTexts.map((text) => (
                          <div
                            key={text.id}
                            className={`flex items-start gap-3 p-3 rounded-lg group ${
                              changedIds.has(text.id) 
                                ? 'bg-primary/10 border border-primary/30' 
                                : 'bg-muted/30'
                            }`}
                          >
                            <div className="text-muted-foreground pt-1">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {text.text_key}
                                </code>
                                {changedIds.has(text.id) && (
                                  <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                    Modified
                                  </span>
                                )}
                                {text.section_name && (
                                  <span className="text-xs text-muted-foreground">
                                    ({text.section_name})
                                  </span>
                                )}
                              </div>
                              {editingInline === text.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={inlineValue}
                                    onChange={(e) => setInlineValue(e.target.value)}
                                    className="min-h-[80px]"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleInlineSave(text.id)}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingInline(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p
                                  className="text-sm cursor-pointer hover:bg-muted/50 p-1 -m-1 rounded transition-colors"
                                  onClick={() => isAdmin && startInlineEdit(text)}
                                  title={isAdmin ? "Click to edit" : undefined}
                                >
                                  {text.english_text}
                                </p>
                              )}
                              {text.description && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {text.description}
                                </p>
                              )}
                            </div>
                            {isAdmin && editingInline !== text.id && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(text)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDelete(text.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingText ? "Edit Text Entry" : "Add New Text Entry"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page_name">Page *</Label>
                <Select
                  value={formData.page_name}
                  onValueChange={(value) =>
                    setFormData({ ...formData, page_name: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select page" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_OPTIONS.map((page) => (
                      <SelectItem key={page.value} value={page.value}>
                        {page.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="section_name">Section</Label>
                <Input
                  id="section_name"
                  value={formData.section_name}
                  onChange={(e) =>
                    setFormData({ ...formData, section_name: e.target.value })
                  }
                  placeholder="e.g. Hero, Footer, CTA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="text_key">Text Key *</Label>
                <Input
                  id="text_key"
                  value={formData.text_key}
                  onChange={(e) =>
                    setFormData({ ...formData, text_key: e.target.value })
                  }
                  placeholder="e.g. hero_title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="display_order">Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="english_text">English Text *</Label>
              <Textarea
                id="english_text"
                value={formData.english_text}
                onChange={(e) =>
                  setFormData({ ...formData, english_text: e.target.value })
                }
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (internal note)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Where this text appears on the page"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editingText ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SiteTextManagement;
