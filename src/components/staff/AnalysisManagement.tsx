import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Upload } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AnalysisType = "pre-match" | "post-match" | "concept";

interface Analysis {
  id: string;
  analysis_type: AnalysisType;
  title: string | null;
  home_team?: string | null;
  away_team?: string | null;
  key_details?: string | null;
  opposition_strengths?: string | null;
  opposition_weaknesses?: string | null;
  matchups?: any[];
  scheme_title?: string | null;
  scheme_paragraph_1?: string | null;
  scheme_paragraph_2?: string | null;
  scheme_image_url?: string | null;
  player_image_url?: string | null;
  strengths_improvements?: string | null;
  concept?: string | null;
  explanation?: string | null;
  points?: any[];
  created_at: string;
}

interface Point {
  title: string;
  paragraph_1: string;
  paragraph_2: string;
  images: string[];
}

interface Matchup {
  name: string;
  shirt_number: string;
  image_url: string;
}

export const AnalysisManagement = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("pre-match");

  // Form states
  const [formData, setFormData] = useState<Partial<Analysis>>({
    points: [],
    matchups: [],
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnalyses((data as Analysis[]) || []);
    } catch (error: any) {
      toast.error("Failed to fetch analyses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type: AnalysisType, analysis?: Analysis) => {
    setAnalysisType(type);
    if (analysis) {
      setEditingAnalysis(analysis);
      setFormData(analysis);
    } else {
      setEditingAnalysis(null);
      setFormData({ analysis_type: type, points: [], matchups: [] });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAnalysis(null);
    setFormData({ points: [], matchups: [] });
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: string,
    pointIndex?: number,
    isMultiple?: boolean,
    matchupIndex?: number
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `analysis-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("analysis-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("analysis-files").getPublicUrl(filePath);

      if (matchupIndex !== undefined) {
        // Adding image to a matchup
        const updatedMatchups = [...(formData.matchups || [])];
        updatedMatchups[matchupIndex].image_url = publicUrl;
        setFormData({ ...formData, matchups: updatedMatchups });
      } else if (pointIndex !== undefined && isMultiple) {
        // Adding image to a point's images array
        const updatedPoints = [...(formData.points || [])];
        updatedPoints[pointIndex].images.push(publicUrl);
        setFormData({ ...formData, points: updatedPoints });
      } else {
        // Single image field
        setFormData({ ...formData, [field]: publicUrl });
      }

      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image");
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        analysis_type: analysisType,
      };

      if (editingAnalysis) {
        const { error } = await supabase
          .from("analyses")
          .update(dataToSave)
          .eq("id", editingAnalysis.id);

        if (error) throw error;
        toast.success("Analysis updated successfully");
      } else {
        const { error } = await supabase.from("analyses").insert([dataToSave]);

        if (error) throw error;
        toast.success("Analysis created successfully");
      }

      handleCloseDialog();
      fetchAnalyses();
    } catch (error: any) {
      toast.error("Failed to save analysis");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this analysis?")) return;

    try {
      const { error } = await supabase.from("analyses").delete().eq("id", id);

      if (error) throw error;
      toast.success("Analysis deleted successfully");
      fetchAnalyses();
    } catch (error: any) {
      toast.error("Failed to delete analysis");
      console.error(error);
    }
  };

  const addPoint = () => {
    setFormData({
      ...formData,
      points: [
        ...(formData.points || []),
        { title: "", paragraph_1: "", paragraph_2: "", images: [] },
      ],
    });
  };

  const removePoint = (index: number) => {
    const updatedPoints = [...(formData.points || [])];
    updatedPoints.splice(index, 1);
    setFormData({ ...formData, points: updatedPoints });
  };

  const updatePoint = (index: number, field: keyof Point, value: any) => {
    const updatedPoints = [...(formData.points || [])];
    updatedPoints[index][field] = value;
    setFormData({ ...formData, points: updatedPoints });
  };

  const addMatchup = () => {
    setFormData({
      ...formData,
      matchups: [
        ...(formData.matchups || []),
        { name: "", shirt_number: "", image_url: "" },
      ],
    });
  };

  const removeMatchup = (index: number) => {
    const updatedMatchups = [...(formData.matchups || [])];
    updatedMatchups.splice(index, 1);
    setFormData({ ...formData, matchups: updatedMatchups });
  };

  const updateMatchup = (index: number, field: keyof Matchup, value: string) => {
    const updatedMatchups = [...(formData.matchups || [])];
    updatedMatchups[index][field] = value;
    setFormData({ ...formData, matchups: updatedMatchups });
  };

  const removeImageFromPoint = (pointIndex: number, imageIndex: number) => {
    const updatedPoints = [...(formData.points || [])];
    updatedPoints[pointIndex].images.splice(imageIndex, 1);
    setFormData({ ...formData, points: updatedPoints });
  };

  if (loading) {
    return <div>Loading analyses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog("pre-match")}>
              <Plus className="w-4 h-4 mr-2" />
              New Pre-Match Analysis
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog("post-match")}>
              <Plus className="w-4 h-4 mr-2" />
              New Post-Match Analysis
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog("concept")}>
              <Plus className="w-4 h-4 mr-2" />
              New Concept
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnalysis ? "Edit" : "New"}{" "}
                {analysisType === "pre-match"
                  ? "Pre-Match"
                  : analysisType === "post-match"
                  ? "Post-Match"
                  : "Concept"}{" "}
                Analysis
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {analysisType === "pre-match" && (
                <>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Home Team</Label>
                        <Input
                          value={formData.home_team || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, home_team: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Away Team</Label>
                        <Input
                          value={formData.away_team || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, away_team: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Key Details</Label>
                      <Textarea
                        value={formData.key_details || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, key_details: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Opposition Strengths</Label>
                      <Textarea
                        value={formData.opposition_strengths || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opposition_strengths: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Opposition Weaknesses</Label>
                      <Textarea
                        value={formData.opposition_weaknesses || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opposition_weaknesses: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Matchups</Label>
                        <Button size="sm" onClick={addMatchup}>
                          <Plus className="w-4 h-4 mr-1" /> Add Matchup
                        </Button>
                      </div>
                      {formData.matchups?.map((matchup, index) => (
                        <Card key={index} className="p-4 mb-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <Input
                                placeholder="Player Name"
                                value={matchup.name}
                                onChange={(e) =>
                                  updateMatchup(index, "name", e.target.value)
                                }
                              />
                              <Input
                                placeholder="Shirt Number"
                                value={matchup.shirt_number}
                                onChange={(e) =>
                                  updateMatchup(index, "shirt_number", e.target.value)
                                }
                              />
                              <div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, "matchup_image", undefined, false, index)}
                                  disabled={uploadingImage}
                                />
                                {matchup.image_url && (
                                  <img
                                    src={matchup.image_url}
                                    alt="Matchup"
                                    className="mt-2 w-20 h-20 object-cover rounded"
                                  />
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMatchup(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Scheme</h3>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={formData.scheme_title || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, scheme_title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Paragraph 1</Label>
                      <Textarea
                        value={formData.scheme_paragraph_1 || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            scheme_paragraph_1: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Paragraph 2</Label>
                      <Textarea
                        value={formData.scheme_paragraph_2 || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            scheme_paragraph_2: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Scheme Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "scheme_image_url")}
                        disabled={uploadingImage}
                      />
                      {formData.scheme_image_url && (
                        <img
                          src={formData.scheme_image_url}
                          alt="Scheme"
                          className="mt-2 max-w-xs"
                        />
                      )}
                    </div>
                  </div>
                </>
              )}

              {analysisType === "post-match" && (
                <>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Overview</h3>
                    <div>
                      <Label>Player Image (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "player_image_url")}
                        disabled={uploadingImage}
                      />
                      {formData.player_image_url && (
                        <img
                          src={formData.player_image_url}
                          alt="Player"
                          className="mt-2 max-w-xs"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Home Team</Label>
                        <Input
                          value={formData.home_team || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, home_team: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Away Team</Label>
                        <Input
                          value={formData.away_team || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, away_team: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Key Details</Label>
                      <Textarea
                        value={formData.key_details || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, key_details: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Strengths & Areas For Improvement</Label>
                      <Textarea
                        value={formData.strengths_improvements || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            strengths_improvements: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {analysisType === "concept" && (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={formData.title || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Concept</Label>
                      <Textarea
                        value={formData.concept || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, concept: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Explanation</Label>
                      <Textarea
                        value={formData.explanation || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, explanation: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Points section - common for all types */}
              {(analysisType === "pre-match" || analysisType === "post-match" || analysisType === "concept") && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">
                      {analysisType === "concept" ? "Images" : "Points"}
                    </h3>
                    <Button size="sm" onClick={addPoint}>
                      <Plus className="w-4 h-4 mr-1" /> Add{" "}
                      {analysisType === "concept" ? "Images" : "Point"}
                    </Button>
                  </div>

                  {formData.points?.map((point, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">
                            {analysisType === "concept" ? `Image Set ${index + 1}` : `Point ${index + 1}`}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePoint(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {analysisType !== "concept" && (
                          <>
                            <div>
                              <Label>Title</Label>
                              <Input
                                value={point.title}
                                onChange={(e) =>
                                  updatePoint(index, "title", e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <Label>Paragraph 1</Label>
                              <Textarea
                                value={point.paragraph_1}
                                onChange={(e) =>
                                  updatePoint(index, "paragraph_1", e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <Label>Paragraph 2</Label>
                              <Textarea
                                value={point.paragraph_2}
                                onChange={(e) =>
                                  updatePoint(index, "paragraph_2", e.target.value)
                                }
                              />
                            </div>
                          </>
                        )}

                        <div>
                          <Label>Images</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageUpload(e, "point_image", index, true)
                            }
                            disabled={uploadingImage}
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {point.images?.map((img, imgIndex) => (
                              <div key={imgIndex} className="relative">
                                <img
                                  src={img}
                                  alt={`Point ${index + 1} Image ${imgIndex + 1}`}
                                  className="w-20 h-20 object-cover rounded"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                  onClick={() => removeImageFromPoint(index, imgIndex)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Analysis</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {analyses.map((analysis) => (
          <Card key={analysis.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-muted-foreground mr-2">
                    {analysis.analysis_type === "pre-match"
                      ? "Pre-Match"
                      : analysis.analysis_type === "post-match"
                      ? "Post-Match"
                      : "Concept"}
                  </span>
                  {analysis.title ||
                    (analysis.analysis_type === "pre-match"
                      ? `${analysis.home_team} vs ${analysis.away_team}`
                      : analysis.analysis_type === "post-match"
                      ? `${analysis.home_team} vs ${analysis.away_team}`
                      : "Untitled Concept")}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleOpenDialog(analysis.analysis_type, analysis)
                    }
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(analysis.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(analysis.created_at).toLocaleDateString()}
              </p>
              {analysis.analysis_type === "pre-match" && (
                <p className="text-sm mt-2">{analysis.key_details}</p>
              )}
              {analysis.analysis_type === "post-match" && (
                <p className="text-sm mt-2">{analysis.key_details}</p>
              )}
              {analysis.analysis_type === "concept" && (
                <p className="text-sm mt-2">{analysis.concept}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
