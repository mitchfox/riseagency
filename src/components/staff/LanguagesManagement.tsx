import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Search, Languages, RefreshCw, Globe } from "lucide-react";

interface Translation {
  id: string;
  page_name: string;
  text_key: string;
  english: string;
  spanish: string | null;
  portuguese: string | null;
  french: string | null;
  german: string | null;
  italian: string | null;
  polish: string | null;
  czech: string | null;
  russian: string | null;
  turkish: string | null;
  created_at: string;
  updated_at: string;
}

const languages = [
  { code: "english", name: "English", flag: "🇬🇧" },
  { code: "spanish", name: "Spanish", flag: "🇪🇸" },
  { code: "portuguese", name: "Portuguese", flag: "🇵🇹" },
  { code: "french", name: "French", flag: "🇫🇷" },
  { code: "german", name: "German", flag: "🇩🇪" },
  { code: "italian", name: "Italian", flag: "🇮🇹" },
  { code: "polish", name: "Polish", flag: "🇵🇱" },
  { code: "czech", name: "Czech", flag: "🇨🇿" },
  { code: "russian", name: "Russian", flag: "🇷🇺" },
  { code: "turkish", name: "Turkish", flag: "🇹🇷" },
];

const pageOptions = [
  "landing",
  "home",
  "header",
  "footer",
  "stars",
  "clubs",
  "scouts",
  "agents",
  "about",
  "coaches",
  "common",
  "btl",
  "realise",
  "news",
  "countries",
  "intro",
  "map",
];

export const LanguagesManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    page_name: "",
    text_key: "",
    english: "",
    spanish: "",
    portuguese: "",
    french: "",
    german: "",
    italian: "",
    polish: "",
    czech: "",
    russian: "",
    turkish: "",
  });

  useEffect(() => {
    fetchTranslations();
  }, []);

  const fetchTranslations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("translations")
        .select("*")
        .order("page_name")
        .order("text_key");

      if (error) throw error;
      setTranslations(data || []);
    } catch (error) {
      console.error("Error fetching translations:", error);
      toast.error("Failed to load translations");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.page_name || !formData.text_key || !formData.english) {
      toast.error("Page, key, and English text are required");
      return;
    }

    try {
      if (editingTranslation) {
        const { error } = await supabase
          .from("translations")
          .update({
            page_name: formData.page_name,
            text_key: formData.text_key,
            english: formData.english,
            spanish: formData.spanish || null,
            portuguese: formData.portuguese || null,
            french: formData.french || null,
            german: formData.german || null,
            italian: formData.italian || null,
            polish: formData.polish || null,
            czech: formData.czech || null,
            russian: formData.russian || null,
            turkish: formData.turkish || null,
          })
          .eq("id", editingTranslation.id);

        if (error) throw error;
        toast.success("Translation updated");
      } else {
        const { error } = await supabase.from("translations").insert({
          page_name: formData.page_name,
          text_key: formData.text_key,
          english: formData.english,
          spanish: formData.spanish || null,
          portuguese: formData.portuguese || null,
          french: formData.french || null,
          german: formData.german || null,
          italian: formData.italian || null,
          polish: formData.polish || null,
          czech: formData.czech || null,
          russian: formData.russian || null,
          turkish: formData.turkish || null,
        });

        if (error) throw error;
        toast.success("Translation added");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTranslations();
    } catch (error: any) {
      console.error("Error saving translation:", error);
      toast.error(error.message || "Failed to save translation");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this translation?")) return;

    try {
      const { error } = await supabase.from("translations").delete().eq("id", id);
      if (error) throw error;
      toast.success("Translation deleted");
      fetchTranslations();
    } catch (error) {
      console.error("Error deleting translation:", error);
      toast.error("Failed to delete translation");
    }
  };

  const handleEdit = (translation: Translation) => {
    setEditingTranslation(translation);
    setFormData({
      page_name: translation.page_name,
      text_key: translation.text_key,
      english: translation.english,
      spanish: translation.spanish || "",
      portuguese: translation.portuguese || "",
      french: translation.french || "",
      german: translation.german || "",
      italian: translation.italian || "",
      polish: translation.polish || "",
      czech: translation.czech || "",
      russian: translation.russian || "",
      turkish: translation.turkish || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTranslation(null);
    setFormData({
      page_name: "",
      text_key: "",
      english: "",
      spanish: "",
      portuguese: "",
      french: "",
      german: "",
      italian: "",
      polish: "",
      czech: "",
      russian: "",
      turkish: "",
    });
  };

  const generateAutoTranslations = async () => {
    if (!formData.english) {
      toast.error("Please enter English text first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke("ai-translate", {
        body: { text: formData.english },
      });

      if (response.error) throw response.error;

      const translations = response.data;
      setFormData((prev) => ({
        ...prev,
        spanish: translations.spanish || prev.spanish,
        portuguese: translations.portuguese || prev.portuguese,
        french: translations.french || prev.french,
        german: translations.german || prev.german,
        italian: translations.italian || prev.italian,
        polish: translations.polish || prev.polish,
        czech: translations.czech || prev.czech,
        russian: translations.russian || prev.russian,
        turkish: translations.turkish || prev.turkish,
      }));
      toast.success("Auto-translations generated");
    } catch (error) {
      console.error("Error generating translations:", error);
      toast.error("Failed to generate translations. Please enter manually.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredTranslations = translations.filter((t) => {
    const matchesSearch =
      t.text_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.page_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPage = selectedPage === "all" || t.page_name === selectedPage;
    return matchesSearch && matchesPage;
  });

  const groupedTranslations = filteredTranslations.reduce((acc, t) => {
    if (!acc[t.page_name]) {
      acc[t.page_name] = [];
    }
    acc[t.page_name].push(t);
    return acc;
  }, {} as Record<string, Translation[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Languages className="h-6 w-6 text-primary" />
              <CardTitle>Languages & Translations</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Translation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTranslation ? "Edit Translation" : "Add New Translation"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Page</Label>
                      <Select
                        value={formData.page_name}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, page_name: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select page" />
                        </SelectTrigger>
                        <SelectContent>
                          {pageOptions.map((page) => (
                            <SelectItem key={page} value={page}>
                              {page.charAt(0).toUpperCase() + page.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Text Key</Label>
                      <Input
                        value={formData.text_key}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, text_key: e.target.value }))
                        }
                        placeholder="e.g., hero_title, nav_home"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        🇬🇧 English (Required)
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateAutoTranslations}
                        disabled={isGenerating || !formData.english}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                        Auto-Translate
                      </Button>
                    </div>
                    <Textarea
                      value={formData.english}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, english: e.target.value }))
                      }
                      placeholder="Enter English text"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇪🇸 Spanish</Label>
                      <Textarea
                        value={formData.spanish}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, spanish: e.target.value }))
                        }
                        placeholder="Spanish translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇵🇹 Portuguese</Label>
                      <Textarea
                        value={formData.portuguese}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, portuguese: e.target.value }))
                        }
                        placeholder="Portuguese translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇫🇷 French</Label>
                      <Textarea
                        value={formData.french}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, french: e.target.value }))
                        }
                        placeholder="French translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇩🇪 German</Label>
                      <Textarea
                        value={formData.german}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, german: e.target.value }))
                        }
                        placeholder="German translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇮🇹 Italian</Label>
                      <Textarea
                        value={formData.italian}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, italian: e.target.value }))
                        }
                        placeholder="Italian translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇵🇱 Polish</Label>
                      <Textarea
                        value={formData.polish}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, polish: e.target.value }))
                        }
                        placeholder="Polish translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇨🇿 Czech</Label>
                      <Textarea
                        value={formData.czech}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, czech: e.target.value }))
                        }
                        placeholder="Czech translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇷🇺 Russian</Label>
                      <Textarea
                        value={formData.russian}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, russian: e.target.value }))
                        }
                        placeholder="Russian translation"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">🇹🇷 Turkish</Label>
                      <Textarea
                        value={formData.turkish}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, turkish: e.target.value }))
                        }
                        placeholder="Turkish translation"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      {editingTranslation ? "Update" : "Add"} Translation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search translations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                {pageOptions.map((page) => (
                  <SelectItem key={page} value={page}>
                    {page.charAt(0).toUpperCase() + page.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2 mb-6">
            {languages.map((lang) => (
              <Card key={lang.code} className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className="text-xl mb-1">{lang.flag}</div>
                  <div className="text-xs font-medium">{lang.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {translations.filter((t) => t[lang.code as keyof Translation]).length} / {translations.length}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Translations Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading translations...</div>
          ) : Object.keys(groupedTranslations).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No translations found. Add your first translation above.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTranslations).map(([pageName, pageTranslations]) => (
                <div key={pageName} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-semibold capitalize">{pageName}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pageTranslations.length} items)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Key</TableHead>
                          <TableHead>🇬🇧</TableHead>
                          <TableHead>🇪🇸</TableHead>
                          <TableHead>🇵🇹</TableHead>
                          <TableHead>🇫🇷</TableHead>
                          <TableHead>🇩🇪</TableHead>
                          <TableHead>🇮🇹</TableHead>
                          <TableHead>🇵🇱</TableHead>
                          <TableHead>🇨🇿</TableHead>
                          <TableHead>🇷🇺</TableHead>
                          <TableHead>🇹🇷</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageTranslations.map((translation) => (
                          <TableRow key={translation.id}>
                            <TableCell className="font-mono text-xs">
                              {translation.text_key}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.english}>
                              {translation.english}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.spanish || ""}>
                              {translation.spanish || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.portuguese || ""}>
                              {translation.portuguese || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.french || ""}>
                              {translation.french || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.german || ""}>
                              {translation.german || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.italian || ""}>
                              {translation.italian || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.polish || ""}>
                              {translation.polish || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.czech || ""}>
                              {translation.czech || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.russian || ""}>
                              {translation.russian || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="max-w-24 truncate" title={translation.turkish || ""}>
                              {translation.turkish || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(translation)}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(translation.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LanguagesManagement;
