import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Upload, Sparkles, Database, Copy } from "lucide-react";
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
  match_date?: string | null;
  home_team_logo?: string | null;
  away_team_logo?: string | null;
  match_image_url?: string | null;
  home_team_bg_color?: string | null;
  away_team_bg_color?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  key_details?: string | null;
  opposition_strengths?: string | null;
  opposition_weaknesses?: string | null;
  matchups?: any[];
  selected_scheme?: string | null;
  starting_xi?: any[];
  kit_primary_color?: string | null;
  kit_secondary_color?: string | null;
  scheme_title?: string | null;
  scheme_paragraph_1?: string | null;
  scheme_paragraph_2?: string | null;
  scheme_image_url?: string | null;
  player_image_url?: string | null;
  strengths_improvements?: string | null;
  concept?: string | null;
  explanation?: string | null;
  points?: any[];
  video_url?: string | null;
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

interface AIWriterState {
  open: boolean;
  category: 'pre-match' | 'post-match' | 'concept' | 'other';
  paragraph1Info: string;
  paragraph2Info: string;
  targetPointIndex?: number;
}

interface AnalysisManagementProps {
  isAdmin: boolean;
}

export const AnalysisManagement = ({ isAdmin }: AnalysisManagementProps) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("pre-match");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiWriter, setAiWriter] = useState<AIWriterState>({
    open: false,
    category: 'pre-match',
    paragraph1Info: '',
    paragraph2Info: ''
  });
  const [overviewWriter, setOverviewWriter] = useState({
    open: false,
    category: 'pre-match' as 'pre-match' | 'post-match',
    overviewInfo: ''
  });
  const [schemeWriter, setSchemeWriter] = useState({
    open: false,
    schemeInfo: ''
  });
  const [generatedContent, setGeneratedContent] = useState<{
    open: boolean;
    type: 'point' | 'overview' | 'scheme';
    content: string;
    paragraph1?: string;
    paragraph2?: string;
    category: string;
  }>({
    open: false,
    type: 'point',
    content: '',
    category: 'pre-match'
  });
  const [tweakDialog, setTweakDialog] = useState({
    open: false,
    tweakInstructions: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [examplesDialogOpen, setExamplesDialogOpen] = useState(false);
  const [examplesCategory, setExamplesCategory] = useState<'pre-match' | 'post-match' | 'concept' | 'other' | 'scheme'>('pre-match');
  const [examplesType, setExamplesType] = useState<'point' | 'overview'>('point');
  const [examples, setExamples] = useState<any[]>([]);
  const [editingExample, setEditingExample] = useState<any | null>(null);
  const [exampleFormData, setExampleFormData] = useState({
    title: '',
    paragraph_1: '',
    paragraph_2: '',
    content: '',
    notes: ''
  });

  // Form states
  const [formData, setFormData] = useState<Partial<Analysis>>({
    points: [],
    matchups: [],
    starting_xi: [],
  });

  // Formation templates with position coordinates (x, y as percentages)
  const formationTemplates: Record<string, Array<{x: number, y: number, position: string}>> = {
    "4-4-2": [
      {x: 50, y: 90, position: "GK"}, // GK
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"}, // Defense
      {x: 15, y: 45, position: "LM"}, {x: 35, y: 45, position: "CM"}, {x: 65, y: 45, position: "CM"}, {x: 85, y: 45, position: "RM"}, // Midfield
      {x: 35, y: 20, position: "ST"}, {x: 65, y: 20, position: "ST"} // Attack
    ],
    "4-3-3": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 30, y: 50, position: "CM"}, {x: 50, y: 50, position: "CM"}, {x: 70, y: 50, position: "CM"},
      {x: 15, y: 20, position: "LW"}, {x: 50, y: 20, position: "ST"}, {x: 85, y: 20, position: "RW"}
    ],
    "4-2-3-1": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 35, y: 55, position: "CDM"}, {x: 65, y: 55, position: "CDM"},
      {x: 20, y: 35, position: "LM"}, {x: 50, y: 35, position: "CAM"}, {x: 80, y: 35, position: "RM"},
      {x: 50, y: 15, position: "ST"}
    ],
    "3-5-2": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 10, y: 50, position: "LM"}, {x: 30, y: 50, position: "CM"}, {x: 50, y: 50, position: "CM"}, {x: 70, y: 50, position: "CM"}, {x: 90, y: 50, position: "RM"},
      {x: 35, y: 20, position: "ST"}, {x: 65, y: 20, position: "ST"}
    ],
    "5-3-2": [
      {x: 50, y: 90, position: "GK"},
      {x: 10, y: 70, position: "LWB"}, {x: 30, y: 75, position: "CB"}, {x: 50, y: 75, position: "CB"}, {x: 70, y: 75, position: "CB"}, {x: 90, y: 70, position: "RWB"},
      {x: 30, y: 45, position: "CM"}, {x: 50, y: 45, position: "CM"}, {x: 70, y: 45, position: "CM"},
      {x: 35, y: 20, position: "ST"}, {x: 65, y: 20, position: "ST"}
    ],
    "4-1-4-1": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 50, y: 55, position: "CDM"},
      {x: 15, y: 40, position: "LM"}, {x: 35, y: 40, position: "CM"}, {x: 65, y: 40, position: "CM"}, {x: 85, y: 40, position: "RM"},
      {x: 50, y: 15, position: "ST"}
    ],
    "3-4-3": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 15, y: 50, position: "LM"}, {x: 40, y: 50, position: "CM"}, {x: 60, y: 50, position: "CM"}, {x: 85, y: 50, position: "RM"},
      {x: 20, y: 20, position: "LW"}, {x: 50, y: 20, position: "ST"}, {x: 80, y: 20, position: "RW"}
    ],
    "4-5-1": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 15, y: 45, position: "LM"}, {x: 35, y: 50, position: "CM"}, {x: 50, y: 50, position: "CM"}, {x: 65, y: 50, position: "CM"}, {x: 85, y: 45, position: "RM"},
      {x: 50, y: 15, position: "ST"}
    ],
    "4-1-2-1-2": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 50, y: 58, position: "CDM"},
      {x: 35, y: 45, position: "CM"}, {x: 65, y: 45, position: "CM"},
      {x: 50, y: 30, position: "CAM"},
      {x: 35, y: 15, position: "ST"}, {x: 65, y: 15, position: "ST"}
    ],
    "3-4-2-1": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 15, y: 50, position: "LM"}, {x: 40, y: 50, position: "CM"}, {x: 60, y: 50, position: "CM"}, {x: 85, y: 50, position: "RM"},
      {x: 35, y: 30, position: "CAM"}, {x: 65, y: 30, position: "CAM"},
      {x: 50, y: 12, position: "ST"}
    ]
  };
  const [uploadingImage, setUploadingImage] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("none");
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [selectedPerformanceReportId, setSelectedPerformanceReportId] = useState<string>("none");

  useEffect(() => {
    fetchAnalyses();
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayerId && selectedPlayerId !== "none") {
      fetchPerformanceReports(selectedPlayerId);
    } else {
      setPerformanceReports([]);
      setSelectedPerformanceReportId("none");
    }
  }, [selectedPlayerId]);

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

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      console.error("Failed to fetch players:", error);
    }
  };

  const fetchPerformanceReports = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select("*")
        .eq("player_id", playerId)
        .order("analysis_date", { ascending: false });

      if (error) throw error;
      setPerformanceReports(data || []);
    } catch (error: any) {
      console.error("Failed to fetch performance reports:", error);
    }
  };

  const handleOpenDialog = async (type: AnalysisType, analysis?: Analysis) => {
    setAnalysisType(type);
    if (analysis) {
      setEditingAnalysis(analysis);
      setFormData(analysis);
      
      // Fetch which player_analysis record this is linked to
      const { data } = await supabase
        .from("player_analysis")
        .select("player_id, id")
        .eq("analysis_writer_id", analysis.id)
        .maybeSingle();
      
      if (data) {
        setSelectedPlayerId(data.player_id);
        setSelectedPerformanceReportId(data.id);
      }
    } else {
      setEditingAnalysis(null);
      setFormData({ analysis_type: type, points: [], matchups: [], starting_xi: [] });
      setSelectedPlayerId("none");
      setSelectedPerformanceReportId("none");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAnalysis(null);
    setFormData({ points: [], matchups: [], starting_xi: [] });
    setSelectedPlayerId("none");
    setSelectedPerformanceReportId("none");
  };

  const handleSchemeChange = (scheme: string) => {
    const template = formationTemplates[scheme];
    const startingXI = template.map((pos, idx) => ({
      ...pos,
      surname: "",
      number: "",
      id: idx
    }));
    setFormData({ ...formData, selected_scheme: scheme, starting_xi: startingXI });
  };

  const updateStartingXIPlayer = (index: number, field: 'surname' | 'number', value: string) => {
    const updatedXI = [...(formData.starting_xi || [])];
    updatedXI[index] = { ...updatedXI[index], [field]: value };
    setFormData({ ...formData, starting_xi: updatedXI });
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
      const errorMessage = error?.message || "Unknown error";
      const isFileTooLarge = errorMessage.includes("size") || errorMessage.includes("too large");
      const isInvalidType = errorMessage.includes("type") || errorMessage.includes("mime");
      
      if (isFileTooLarge) {
        toast.error("Image upload failed: File is too large. Maximum size is 50MB.");
      } else if (isInvalidType) {
        toast.error("Image upload failed: Invalid file type. Please upload a valid image file.");
      } else {
        toast.error(`Image upload failed: ${errorMessage}`);
      }
      console.error("Image upload error:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("analysis-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("analysis-videos").getPublicUrl(filePath);

      setFormData({ ...formData, video_url: publicUrl });
      toast.success("Video uploaded successfully");
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      const isFileTooLarge = errorMessage.includes("size") || errorMessage.includes("too large") || errorMessage.includes("Payload");
      const isInvalidType = errorMessage.includes("type") || errorMessage.includes("mime");
      
      if (isFileTooLarge) {
        toast.error("Video upload failed: File is too large. Maximum size is 50MB.");
      } else if (isInvalidType) {
        toast.error("Video upload failed: Invalid file type. Please upload a valid video file.");
      } else {
        toast.error(`Video upload failed: ${errorMessage}`);
      }
      console.error("Video upload error:", error);
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

      let analysisId = editingAnalysis?.id;

      if (editingAnalysis) {
        const { error } = await supabase
          .from("analyses")
          .update(dataToSave)
          .eq("id", editingAnalysis.id);

        if (error) throw error;
        toast.success("Analysis updated successfully");
      } else {
        const { data, error } = await supabase
          .from("analyses")
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        analysisId = data.id;
        toast.success("Analysis created successfully");
      }

      // Link to performance report if selected
      if (selectedPerformanceReportId && selectedPerformanceReportId !== "none" && analysisId) {
        const { error: linkError } = await supabase
          .from("player_analysis")
          .update({ analysis_writer_id: analysisId })
          .eq("id", selectedPerformanceReportId);

        if (linkError) {
          console.error("Failed to link analysis:", linkError);
          toast.error("Analysis saved but failed to link to performance report");
        }
      }

      handleCloseDialog();
      fetchAnalyses();
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      toast.error(`Failed to save analysis: ${errorMessage}`);
      console.error("Save analysis error:", error);
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

  const fetchExamples = async (category: string, type: 'point' | 'overview' = 'point') => {
    try {
      const { data, error } = await supabase
        .from('analysis_point_examples')
        .select('*')
        .eq('category', category)
        .eq('example_type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExamples(data || []);
    } catch (error: any) {
      console.error('Error fetching examples:', error);
      toast.error('Failed to load examples');
    }
  };

  const handleSaveExample = async () => {
    try {
      if (editingExample) {
        const { error } = await supabase
          .from('analysis_point_examples')
          .update({
            ...exampleFormData,
            category: examplesCategory,
            example_type: examplesType
          })
          .eq('id', editingExample.id);

        if (error) throw error;
        toast.success('Example updated');
      } else {
        const { error } = await supabase
          .from('analysis_point_examples')
          .insert({
            ...exampleFormData,
            category: examplesCategory,
            example_type: examplesType
          });

        if (error) throw error;
        toast.success('Example added');
      }

      setExampleFormData({ title: '', paragraph_1: '', paragraph_2: '', content: '', notes: '' });
      setEditingExample(null);
      fetchExamples(examplesCategory, examplesType);
    } catch (error: any) {
      console.error('Error saving example:', error);
      toast.error('Failed to save example');
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!confirm('Delete this example?')) return;

    try {
      const { error } = await supabase
        .from('analysis_point_examples')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Example deleted');
      fetchExamples(examplesCategory, examplesType);
    } catch (error: any) {
      console.error('Error deleting example:', error);
      toast.error('Failed to delete example');
    }
  };

  const generateOverview = async () => {
    if (!overviewWriter.overviewInfo.trim()) {
      toast.error("Please provide information for the overview");
      return;
    }

    setAiGenerating(true);
    try {
      // Fetch overview examples for this category
      const { data: styleExamples } = await supabase
        .from('analysis_point_examples')
        .select('content')
        .eq('category', overviewWriter.category)
        .eq('example_type', 'overview')
        .limit(3);

      const exampleContext = styleExamples && styleExamples.length > 0
        ? `\n\nExample overview writing style references:\n${styleExamples.map((ex, i) => 
            `Example ${i + 1}:\n${ex.content || ''}`
          ).join('\n\n')}`
        : '';

      const { data, error } = await supabase.functions.invoke('ai-write', {
        body: {
          prompt: `Write a comprehensive overview paragraph for a ${overviewWriter.category} analysis based on this information: ${overviewWriter.overviewInfo}. Match the writing style, vocabulary level, and level of detail shown in the examples. This should be one cohesive paragraph.`,
          context: `Analysis Type: ${overviewWriter.category}${exampleContext}`,
          type: 'analysis-overview'
        }
      });

      if (error) throw error;

      const overview = data.text;

      // Show preview dialog instead of directly applying
      setGeneratedContent({
        open: true,
        type: 'overview',
        content: overview,
        category: overviewWriter.category
      });
      setOverviewWriter({ open: false, category: 'pre-match', overviewInfo: '' });
    } catch (error: any) {
      console.error('Error generating overview:', error);
      toast.error(error.message || "Failed to generate overview");
    } finally {
      setAiGenerating(false);
    }
  };

  const generateScheme = async () => {
    if (!schemeWriter.schemeInfo.trim()) {
      toast.error("Please provide information for the scheme");
      return;
    }

    setAiGenerating(true);
    try {
      // Fetch scheme examples
      const { data: styleExamples } = await supabase
        .from('analysis_point_examples')
        .select('paragraph_1, paragraph_2')
        .eq('category', 'scheme')
        .eq('example_type', 'point')
        .limit(3);

      const exampleContext = styleExamples && styleExamples.length > 0
        ? `\n\nExample scheme writing style references:\n${styleExamples.map((ex, i) => 
            `Example ${i + 1}:\nParagraph 1: ${ex.paragraph_1 || ''}\nParagraph 2: ${ex.paragraph_2 || ''}`
          ).join('\n\n')}`
        : '';

      const { data, error } = await supabase.functions.invoke('ai-write', {
        body: {
          prompt: `Write two tactical scheme analysis paragraphs based on this information: ${schemeWriter.schemeInfo}. Match the writing style, vocabulary level, and level of detail shown in the examples. Separate the two paragraphs with a double line break.`,
          context: `Analysis Type: scheme${exampleContext}`,
          type: 'analysis-paragraph'
        }
      });

      if (error) throw error;

      const text = data.text;
      const [p1, p2] = text.split('\n\n').filter((p: string) => p.trim());

      // Show preview dialog
      setGeneratedContent({
        open: true,
        type: 'scheme',
        content: text,
        paragraph1: p1 || '',
        paragraph2: p2 || '',
        category: 'scheme'
      });
      setSchemeWriter({ open: false, schemeInfo: '' });
    } catch (error: any) {
      console.error('Error generating scheme:', error);
      toast.error(error.message || "Failed to generate scheme");
    } finally {
      setAiGenerating(false);
    }
  };

  const generateWithAIWriter = async () => {
    if (!aiWriter.paragraph1Info.trim() && !aiWriter.paragraph2Info.trim()) {
      toast.error("Please provide information for at least one paragraph");
      return;
    }

    setAiGenerating(true);
    try {
      // Fetch examples for this category to use as style reference
      const { data: styleExamples } = await supabase
        .from('analysis_point_examples')
        .select('paragraph_1, paragraph_2')
        .eq('category', aiWriter.category)
        .limit(3);

      const exampleContext = styleExamples && styleExamples.length > 0
        ? `\n\nExample writing style references:\n${styleExamples.map((ex, i) => 
            `Example ${i + 1}:\n${ex.paragraph_1 || ''}\n${ex.paragraph_2 || ''}`
          ).join('\n\n')}`
        : '';

      let paragraph1 = '';
      let paragraph2 = '';

      // Generate paragraph 1 if info provided
      if (aiWriter.paragraph1Info.trim()) {
        const { data: data1, error: error1 } = await supabase.functions.invoke('ai-write', {
          body: {
            prompt: `Write a professional analysis paragraph based on this information: ${aiWriter.paragraph1Info}. Match the writing style, vocabulary level, and level of detail shown in the examples.`,
            context: `Analysis Type: ${aiWriter.category}${exampleContext}`,
            type: 'analysis-paragraph'
          }
        });

        if (error1) throw error1;
        paragraph1 = data1.text;
      }

      // Generate paragraph 2 if info provided
      if (aiWriter.paragraph2Info.trim()) {
        const { data: data2, error: error2 } = await supabase.functions.invoke('ai-write', {
          body: {
            prompt: `Write a professional analysis paragraph based on this information: ${aiWriter.paragraph2Info}. Match the writing style, vocabulary level, and level of detail shown in the examples.`,
            context: `Analysis Type: ${aiWriter.category}${exampleContext}`,
            type: 'analysis-paragraph'
          }
        });

        if (error2) throw error2;
        paragraph2 = data2.text;
      }

      // Show preview dialog
      setGeneratedContent({
        open: true,
        type: 'point',
        content: `${paragraph1}\n\n${paragraph2}`,
        paragraph1,
        paragraph2,
        category: aiWriter.category
      });
      setAiWriter({ open: false, category: 'pre-match', paragraph1Info: '', paragraph2Info: '' });
    } catch (error: any) {
      console.error('Error generating with AI:', error);
      toast.error(error.message || "Failed to generate content");
    } finally {
      setAiGenerating(false);
    }
  };


  const generateWithAI = async (field: string, pointIndex?: number) => {
    setAiGenerating(true);
    try {
      let prompt = '';
      let context = '';
      let type = '';

      if (field === 'scheme_paragraph_1' || field === 'scheme_paragraph_2') {
        context = `Analysis Type: ${analysisType}
Teams: ${formData.home_team} vs ${formData.away_team}
Title: ${formData.scheme_title || 'Not specified'}`;
        prompt = `Write a detailed tactical analysis paragraph for this match.`;
        type = 'analysis-paragraph';
      } else if (field === 'point_title') {
        prompt = `Create a concise, professional title for a match analysis section.`;
        type = 'analysis-point-title';
      } else if (field === 'point_paragraph') {
        const point = formData.points?.[pointIndex!];
        context = `Section Title: ${point?.title || 'Not specified'}`;
        prompt = `Write a detailed analysis paragraph for this section.`;
        type = 'analysis-paragraph';
      }

      const { data, error } = await supabase.functions.invoke('ai-write', {
        body: { prompt, context, type }
      });

      if (error) throw error;
      
      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please wait a moment and try again.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits in Settings > Workspace > Usage.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      // Update the appropriate field
      if (field === 'scheme_paragraph_1') {
        setFormData({ ...formData, scheme_paragraph_1: data.text });
      } else if (field === 'scheme_paragraph_2') {
        setFormData({ ...formData, scheme_paragraph_2: data.text });
      } else if (field === 'point_title' && pointIndex !== undefined) {
        updatePoint(pointIndex, 'title', data.text);
      } else if (field === 'point_paragraph_1' && pointIndex !== undefined) {
        updatePoint(pointIndex, 'paragraph_1', data.text);
      } else if (field === 'point_paragraph_2' && pointIndex !== undefined) {
        updatePoint(pointIndex, 'paragraph_2', data.text);
      }

      toast.success('AI content generated!');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate content with AI');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyGenerated = () => {
    if (generatedContent.type === 'overview') {
      setFormData({ ...formData, key_details: generatedContent.content });
    } else if (generatedContent.type === 'scheme') {
      setFormData({ 
        ...formData, 
        scheme_paragraph_1: generatedContent.paragraph1 || '',
        scheme_paragraph_2: generatedContent.paragraph2 || ''
      });
    } else if (generatedContent.type === 'point') {
      const newPoint = {
        title: "",
        paragraph_1: generatedContent.paragraph1 || '',
        paragraph_2: generatedContent.paragraph2 || '',
        images: []
      };
      setFormData({
        ...formData,
        points: [...(formData.points || []), newPoint]
      });
    }
    toast.success("Content applied!");
    setGeneratedContent({ open: false, type: 'point', content: '', category: 'pre-match' });
    setEditMode(false);
  };

  const handleCopyGenerated = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent.content);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      const dataToSave: any = {
        category: generatedContent.category,
        example_type: generatedContent.type === 'overview' ? 'overview' : 'point'
      };

      if (generatedContent.type === 'overview') {
        dataToSave.content = generatedContent.content;
        dataToSave.title = `Generated ${new Date().toLocaleDateString()}`;
      } else {
        dataToSave.paragraph_1 = generatedContent.paragraph1 || '';
        dataToSave.paragraph_2 = generatedContent.paragraph2 || '';
        dataToSave.title = `Generated ${new Date().toLocaleDateString()}`;
      }

      const { error } = await supabase
        .from('analysis_point_examples')
        .insert(dataToSave);

      if (error) throw error;
      toast.success("Saved to examples database!");
    } catch (error) {
      console.error('Error saving to database:', error);
      toast.error("Failed to save to database");
    }
  };

  const handleTweak = async () => {
    if (!tweakDialog.tweakInstructions.trim()) {
      toast.error("Please provide tweak instructions");
      return;
    }

    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-write', {
        body: {
          prompt: `Modify this text according to these instructions: ${tweakDialog.tweakInstructions}\n\nOriginal text:\n${generatedContent.content}`,
          context: `Keep the same style and structure, just apply the requested modifications.`,
          type: 'analysis-paragraph'
        }
      });

      if (error) throw error;

      const tweaked = data.text;

      if (generatedContent.type === 'overview') {
        setGeneratedContent({ ...generatedContent, content: tweaked });
      } else {
        const [p1, p2] = tweaked.split('\n\n').filter((p: string) => p.trim());
        setGeneratedContent({
          ...generatedContent,
          content: tweaked,
          paragraph1: p1 || generatedContent.paragraph1,
          paragraph2: p2 || generatedContent.paragraph2
        });
      }

      toast.success("Content tweaked!");
      setTweakDialog({ open: false, tweakInstructions: '' });
    } catch (error) {
      console.error('Error tweaking content:', error);
      toast.error("Failed to tweak content");
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return <div>Loading analyses...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pre-match" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-full md:grid md:grid-cols-3 gap-1 h-auto p-1">
            <TabsTrigger value="pre-match" className="text-xs md:text-sm px-3 md:px-4 py-2 whitespace-nowrap">Pre-Match</TabsTrigger>
            <TabsTrigger value="post-match" className="text-xs md:text-sm px-3 md:px-4 py-2 whitespace-nowrap">Post-Match</TabsTrigger>
            <TabsTrigger value="concepts" className="text-xs md:text-sm px-3 md:px-4 py-2 whitespace-nowrap">Positional</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pre-match" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleOpenDialog("pre-match")}
              className="bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 hover:from-slate-400 hover:to-slate-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Pre-Match Analysis
            </Button>
            <Button 
              onClick={() => setOverviewWriter({ open: true, category: 'pre-match', overviewInfo: '' })}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Pre-Match Overview Writer
            </Button>
            <Button 
              onClick={() => setAiWriter({ ...aiWriter, open: true, category: 'pre-match', paragraph1Info: '', paragraph2Info: '' })}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Pre-Match Point Writer
            </Button>
            <Button 
              onClick={() => setSchemeWriter({ open: true, schemeInfo: '' })}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Scheme Writer
            </Button>
            <Button 
              onClick={() => {
                setExamplesCategory('pre-match');
                setExamplesType('point');
                setExamplesDialogOpen(true);
                fetchExamples('pre-match', 'point');
              }}
              variant="outline"
            >
              Point Examples
            </Button>
            <Button 
              onClick={() => {
                setExamplesCategory('pre-match');
                setExamplesType('overview');
                setExamplesDialogOpen(true);
                fetchExamples('pre-match', 'overview');
              }}
              variant="outline"
            >
              Overview Examples
            </Button>
            <Button 
              onClick={() => {
                setExamplesCategory('scheme');
                setExamplesType('point');
                setExamplesDialogOpen(true);
                fetchExamples('scheme', 'point');
              }}
              variant="outline"
            >
              Scheme Examples
            </Button>
          </div>

          <div className="grid gap-4">
            {analyses.filter(a => a.analysis_type === "pre-match").map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground mr-2">Pre-Match</span>
                      <span className="text-sm sm:text-base">
                        {analysis.title || `${analysis.home_team} vs ${analysis.away_team}`}
                      </span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/analysis/${analysis.id}`, '_blank')}
                        className="flex-1 sm:flex-initial"
                      >
                        View Analysis
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog("pre-match", analysis)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(analysis.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(analysis.created_at).toLocaleDateString()}
                  </p>
                  {analysis.key_details && (
                    <p className="text-sm mt-2">{analysis.key_details}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="post-match" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleOpenDialog("post-match")}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 hover:from-amber-500 hover:to-yellow-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post-Match Analysis
            </Button>
            <Button 
              onClick={() => setOverviewWriter({ open: true, category: 'post-match', overviewInfo: '' })}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Post-Match Overview Writer
            </Button>
            <Button 
              onClick={() => setAiWriter({ ...aiWriter, open: true, category: 'post-match', paragraph1Info: '', paragraph2Info: '' })}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Post-Match Point Writer
            </Button>
            <Button 
              onClick={() => {
                setExamplesCategory('post-match');
                setExamplesType('point');
                setExamplesDialogOpen(true);
                fetchExamples('post-match', 'point');
              }}
              variant="outline"
            >
              Point Examples
            </Button>
            <Button 
              onClick={() => {
                setExamplesCategory('post-match');
                setExamplesType('overview');
                setExamplesDialogOpen(true);
                fetchExamples('post-match', 'overview');
              }}
              variant="outline"
            >
              Overview Examples
            </Button>
          </div>

          <div className="grid gap-4">
            {analyses.filter(a => a.analysis_type === "post-match").map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground mr-2">Post-Match</span>
                      <span className="text-sm sm:text-base">
                        {analysis.title || `${analysis.home_team} vs ${analysis.away_team}`}
                      </span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/analysis/${analysis.id}`, '_blank')}
                        className="flex-1 sm:flex-initial"
                      >
                        View Analysis
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog("post-match", analysis)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(analysis.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(analysis.created_at).toLocaleDateString()}
                  </p>
                  {analysis.key_details && (
                    <p className="text-sm mt-2">{analysis.key_details}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="concepts" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleOpenDialog("concept")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Concept
            </Button>
            <Button 
              onClick={() => setAiWriter({ ...aiWriter, open: true, category: 'concept', paragraph1Info: '', paragraph2Info: '' })}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Concept Writer
            </Button>
            <Button 
              onClick={() => {
                setExamplesCategory('concept');
                setExamplesType('point');
                setExamplesDialogOpen(true);
                fetchExamples('concept', 'point');
              }}
              variant="outline"
            >
              Concept Examples Database
            </Button>
          </div>

          <div className="grid gap-4">
            {analyses.filter(a => a.analysis_type === "concept").map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground mr-2">Concept</span>
                      <span className="text-sm sm:text-base">
                        {analysis.title || "Untitled Concept"}
                      </span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/analysis/${analysis.id}`, '_blank')}
                        className="flex-1 sm:flex-initial"
                      >
                        View Analysis
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog("concept", analysis)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(analysis.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(analysis.created_at).toLocaleDateString()}
                  </p>
                  {analysis.concept && (
                    <p className="text-sm mt-2">{analysis.concept}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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

            <Tabs defaultValue="pre-match" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pre-match">Pre-Match</TabsTrigger>
                <TabsTrigger value="post-match">Post-Match</TabsTrigger>
                <TabsTrigger value="concepts">Positional</TabsTrigger>
              </TabsList>

              <TabsContent value="pre-match" className="space-y-4">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Overview</h3>
                    <div>
                      <Label>Match Date</Label>
                      <Input
                        type="date"
                        value={formData.match_date || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, match_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Home Team</Label>
                        <Input
                          value={formData.home_team || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, home_team: e.target.value })
                          }
                        />
                        <Label className="mt-2">Home Team Logo</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "home_team_logo")}
                          disabled={uploadingImage}
                        />
                        {formData.home_team_logo && (
                          <img
                            src={formData.home_team_logo}
                            alt="Home team logo"
                            className="mt-2 w-16 h-16 object-contain"
                          />
                        )}
                      </div>
                      <div>
                        <Label>Away Team</Label>
                        <Input
                          value={formData.away_team || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, away_team: e.target.value })
                          }
                        />
                        <Label className="mt-2">Away Team Logo</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "away_team_logo")}
                          disabled={uploadingImage}
                        />
                        {formData.away_team_logo && (
                          <img
                            src={formData.away_team_logo}
                            alt="Away team logo"
                            className="mt-2 w-16 h-16 object-contain"
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Home Team Background Color</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Background color for home team sections (Overview, Matchups, Scheme, Points)
                        </p>
                        <Input
                          type="color"
                          value={formData.home_team_bg_color || '#1a1a1a'}
                          onChange={(e) =>
                            setFormData({ ...formData, home_team_bg_color: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Away Team Background Color</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Background color for opposition sections (Strengths, Weaknesses)
                        </p>
                        <Input
                          type="color"
                          value={formData.away_team_bg_color || '#8B0000'}
                          onChange={(e) =>
                            setFormData({ ...formData, away_team_bg_color: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Match Image (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Image displayed between team names and overview section
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "match_image_url")}
                        disabled={uploadingImage}
                      />
                      {formData.match_image_url && (
                        <div className="relative mt-2">
                          <img
                            src={formData.match_image_url}
                            alt="Match"
                            className="w-full max-w-md rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => setFormData({ ...formData, match_image_url: null })}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Analysis Video (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload a video for this analysis that players can watch
                      </p>
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        disabled={uploadingImage}
                      />
                      {formData.video_url && (
                        <div className="mt-2">
                          <video
                            src={formData.video_url}
                            controls
                            className="w-full max-w-md rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="mt-2"
                            onClick={() => setFormData({ ...formData, video_url: null })}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove Video
                          </Button>
                        </div>
                      )}
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
                      <p className="text-xs text-muted-foreground mb-2">
                        Use bullet points (one per line)
                      </p>
                      <Textarea
                        value={formData.opposition_strengths || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opposition_strengths: e.target.value,
                          })
                        }
                        placeholder="• Strong aerial presence&#10;• Quick counter-attacks&#10;• Solid defensive organization"
                      />
                    </div>
                    <div>
                      <Label>Opposition Weaknesses</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Use bullet points (one per line)
                      </p>
                      <Textarea
                        value={formData.opposition_weaknesses || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opposition_weaknesses: e.target.value,
                          })
                        }
                        placeholder="• Weak on the left flank&#10;• Slow to transition&#10;• Vulnerable to through balls"
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
                      <Label>Select Formation</Label>
                      <Select 
                        value={formData.selected_scheme || ""} 
                        onValueChange={handleSchemeChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a formation" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(formationTemplates).map((formation) => (
                            <SelectItem key={formation} value={formation}>
                              {formation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.selected_scheme && formData.starting_xi && formData.starting_xi.length > 0 && (
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label>Kit Primary Color</Label>
                            <Input
                              type="color"
                              value={formData.kit_primary_color || '#FFD700'}
                              onChange={(e) =>
                                setFormData({ ...formData, kit_primary_color: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Kit Secondary Color</Label>
                            <Input
                              type="color"
                              value={formData.kit_secondary_color || '#000000'}
                              onChange={(e) =>
                                setFormData({ ...formData, kit_secondary_color: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <Label className="mb-2 block">Starting XI Preview</Label>
                        <div className="relative bg-green-700 rounded-lg p-4 sm:p-8 min-h-[300px] sm:min-h-[400px]">
                          <div className="text-white text-center mb-2 text-lg font-bold">
                            {formData.selected_scheme}
                          </div>
                          {formData.starting_xi.map((player: any, index: number) => (
                            <div
                              key={index}
                              className="absolute"
                              style={{
                                left: `${player.x}%`,
                                top: `${player.y}%`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <svg width="48" height="48" viewBox="0 0 100 100" className="drop-shadow-lg mb-1">
                                <path d="M30 25 L25 35 L25 65 L30 75 L70 75 L75 65 L75 35 L70 25 Z" fill={formData.kit_primary_color || '#FFD700'} stroke={formData.kit_secondary_color || '#000000'} strokeWidth="3"/>
                                <rect x="42" y="25" width="16" height="50" fill={formData.kit_secondary_color || '#000000'} opacity="0.8"/>
                                <circle cx="50" cy="25" r="8" fill={formData.kit_primary_color || '#FFD700'} stroke={formData.kit_secondary_color || '#000000'} strokeWidth="2"/>
                                <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white" stroke="black" strokeWidth="1.5">
                                  {player.number || '0'}
                                </text>
                              </svg>
                              <div className="bg-black/80 text-white px-1 py-0.5 rounded text-[8px] font-bold text-center whitespace-nowrap">
                                {player.surname || player.position}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                          <Label>Enter Player Details</Label>
                          {formData.starting_xi.map((player: any, index: number) => (
                            <div key={index} className="flex flex-col sm:grid sm:grid-cols-3 gap-2 items-start sm:items-center bg-muted p-2 rounded">
                              <span className="text-xs font-medium">{player.position}</span>
                              <Input
                                placeholder="Surname"
                                value={player.surname}
                                onChange={(e) => updateStartingXIPlayer(index, 'surname', e.target.value)}
                                className="h-8 text-xs w-full"
                              />
                              <Input
                                placeholder="No."
                                value={player.number}
                                onChange={(e) => updateStartingXIPlayer(index, 'number', e.target.value)}
                                className="h-8 text-xs w-full"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                      <div className="flex items-center justify-between">
                        <Label>Paragraph 1</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => generateWithAI('scheme_paragraph_1')}
                          disabled={aiGenerating}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {aiGenerating ? 'Generating...' : 'Use AI'}
                        </Button>
                      </div>
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
                      <div className="flex items-center justify-between">
                        <Label>Paragraph 2</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => generateWithAI('scheme_paragraph_2')}
                          disabled={aiGenerating}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {aiGenerating ? 'Generating...' : 'Use AI'}
                        </Button>
                      </div>
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
                      
                      <Card className="bg-secondary/20">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            AI Pre-Match Point Writer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Paragraph 1 Info</Label>
                            <Textarea
                              placeholder="Enter key information for paragraph 1..."
                              value={aiWriter.paragraph1Info}
                              onChange={(e) => setAiWriter({ ...aiWriter, paragraph1Info: e.target.value, category: 'pre-match' })}
                            />
                          </div>
                          <div>
                            <Label>Paragraph 2 Info</Label>
                            <Textarea
                              placeholder="Enter key information for paragraph 2..."
                              value={aiWriter.paragraph2Info}
                              onChange={(e) => setAiWriter({ ...aiWriter, paragraph2Info: e.target.value, category: 'pre-match' })}
                            />
                          </div>
                          <Button 
                            onClick={generateWithAIWriter} 
                            disabled={aiGenerating}
                            className="w-full"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {aiGenerating ? "Generating..." : "Generate Point"}
                          </Button>
                        </CardContent>
                      </Card>
                  </div>
              </TabsContent>

              <TabsContent value="post-match" className="space-y-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Label>Home Score</Label>
                        <Input
                          type="number"
                          value={formData.home_score || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, home_score: parseInt(e.target.value) || undefined })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Away Team</Label>
                        <Input
                          value={formData.away_team || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, away_team: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Away Score</Label>
                        <Input
                          type="number"
                          value={formData.away_score || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, away_score: parseInt(e.target.value) || undefined })
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
                      <p className="text-xs text-muted-foreground mb-2">
                        Format: Green: text | Yellow: text | Red: text (use bullet points with |)
                      </p>
                      <Textarea
                        value={formData.strengths_improvements || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            strengths_improvements: e.target.value,
                          })
                        }
                        placeholder="Green: Great positioning | Yellow: Work on first touch | Red: Needs better decision making"
                      />
                    </div>
                      
                      <Card className="bg-secondary/20">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            AI Post-Match Point Writer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Paragraph 1 Info</Label>
                            <Textarea
                              placeholder="Enter key information for paragraph 1..."
                              value={aiWriter.paragraph1Info}
                              onChange={(e) => setAiWriter({ ...aiWriter, paragraph1Info: e.target.value, category: 'post-match' })}
                            />
                          </div>
                          <div>
                            <Label>Paragraph 2 Info</Label>
                            <Textarea
                              placeholder="Enter key information for paragraph 2..."
                              value={aiWriter.paragraph2Info}
                              onChange={(e) => setAiWriter({ ...aiWriter, paragraph2Info: e.target.value, category: 'post-match' })}
                            />
                          </div>
                          <Button 
                            onClick={generateWithAIWriter} 
                            disabled={aiGenerating}
                            className="w-full"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {aiGenerating ? "Generating..." : "Generate Point"}
                          </Button>
                        </CardContent>
                      </Card>
                  </div>
              </TabsContent>

              <TabsContent value="concepts" className="space-y-4">
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
                      
                      <Card className="bg-secondary/20">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            AI Concept Writer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Paragraph 1 Info</Label>
                            <Textarea
                              placeholder="Enter key information for paragraph 1..."
                              value={aiWriter.paragraph1Info}
                              onChange={(e) => setAiWriter({ ...aiWriter, paragraph1Info: e.target.value, category: 'concept' })}
                            />
                          </div>
                          <div>
                            <Label>Paragraph 2 Info</Label>
                            <Textarea
                              placeholder="Enter key information for paragraph 2..."
                              value={aiWriter.paragraph2Info}
                              onChange={(e) => setAiWriter({ ...aiWriter, paragraph2Info: e.target.value, category: 'concept' })}
                            />
                          </div>
                          <Button 
                            onClick={generateWithAIWriter} 
                            disabled={aiGenerating}
                            className="w-full"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {aiGenerating ? "Generating..." : "Generate Point"}
                          </Button>
                        </CardContent>
                      </Card>
                  </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Analysis</Button>
            </div>
          </DialogContent>
      </Dialog>

      {/* AI Writer Dialog */}
      <Dialog open={aiWriter.open} onOpenChange={(open) => setAiWriter({ ...aiWriter, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI {aiWriter.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Point Writer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paragraph 1 Information</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter key details for the first paragraph
              </p>
              <Textarea
                value={aiWriter.paragraph1Info}
                onChange={(e) => setAiWriter({ ...aiWriter, paragraph1Info: e.target.value })}
                placeholder="Provide specific observations, statistics, tactical details, and technical points. Include concrete examples like player names, numbers, specific actions, positioning details, and measurable outcomes that match the depth and specificity shown in the database examples."
                rows={3}
              />
            </div>
            <div>
              <Label>Paragraph 2 Information</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter key details for the second paragraph
              </p>
              <Textarea
                value={aiWriter.paragraph2Info}
                onChange={(e) => setAiWriter({ ...aiWriter, paragraph2Info: e.target.value })}
                placeholder="Add follow-up details, recommendations, specific clip references, technical adjustments, or actionable coaching points. Use the same professional terminology and level of tactical detail as the examples."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAiWriter({ open: false, category: 'pre-match', paragraph1Info: '', paragraph2Info: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={generateWithAIWriter}
                disabled={aiGenerating || (!aiWriter.paragraph1Info.trim() && !aiWriter.paragraph2Info.trim())}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {aiGenerating ? 'Generating...' : 'Generate Point'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overview Writer Dialog */}
      <Dialog open={overviewWriter.open} onOpenChange={(open) => setOverviewWriter({ ...overviewWriter, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI {overviewWriter.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Overview Writer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Overview Information</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter key details for the overview paragraph
              </p>
              <Textarea
                value={overviewWriter.overviewInfo}
                onChange={(e) => setOverviewWriter({ ...overviewWriter, overviewInfo: e.target.value })}
                placeholder={overviewWriter.category === 'pre-match' 
                  ? "Provide comprehensive match/tactical information including: opponent formation and style, key players with shirt numbers, specific tactical weaknesses to exploit, defensive approach, offensive strategies, player matchups, and any injuries/suspensions. Include concrete details that match the depth and technical language of the database examples."
                  : "Provide comprehensive post-match analysis including: player performance highlights, key moments and turning points, tactical execution (what worked/didn't work), strengths demonstrated, areas for improvement, decision-making quality, physical and mental performance, and specific examples from the match. Include concrete details that match the depth and technical language of the database examples."}
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOverviewWriter({ open: false, category: 'pre-match', overviewInfo: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={generateOverview}
                disabled={aiGenerating || !overviewWriter.overviewInfo.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {aiGenerating ? 'Generating...' : 'Generate Overview'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheme Writer Dialog */}
      <Dialog open={schemeWriter.open} onOpenChange={(open) => setSchemeWriter({ ...schemeWriter, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI Scheme Writer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Scheme Information</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter tactical scheme details and strategy
              </p>
              <Textarea
                value={schemeWriter.schemeInfo}
                onChange={(e) => setSchemeWriter({ ...schemeWriter, schemeInfo: e.target.value })}
                placeholder="Detail the opponent's formation (e.g., 3-4-2-1, 4-3-3), key personnel with names and numbers, their tactical approach in different phases, specific positional weaknesses, spaces to exploit, defensive and offensive patterns, transitions, pressing triggers, and how to counter their system. Match the tactical depth and professional terminology of the database examples."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSchemeWriter({ open: false, schemeInfo: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={generateScheme}
                disabled={aiGenerating || !schemeWriter.schemeInfo.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {aiGenerating ? 'Generating...' : 'Generate Scheme'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Content Preview Dialog */}
      <Dialog open={generatedContent.open} onOpenChange={(open) => {
        if (!open) {
          setGeneratedContent({ open: false, type: 'point', content: '', category: 'pre-match' });
          setEditMode(false);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Content Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editMode ? (
              generatedContent.type === 'overview' ? (
                <div>
                  <Label>Edit Overview</Label>
                  <Textarea
                    value={generatedContent.content}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, content: e.target.value })}
                    rows={10}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label>Edit Paragraph 1</Label>
                    <Textarea
                      value={generatedContent.paragraph1 || ''}
                      onChange={(e) => setGeneratedContent({ 
                        ...generatedContent, 
                        paragraph1: e.target.value,
                        content: `${e.target.value}\n\n${generatedContent.paragraph2 || ''}`
                      })}
                      rows={6}
                    />
                  </div>
                  <div>
                    <Label>Edit Paragraph 2</Label>
                    <Textarea
                      value={generatedContent.paragraph2 || ''}
                      onChange={(e) => setGeneratedContent({ 
                        ...generatedContent, 
                        paragraph2: e.target.value,
                        content: `${generatedContent.paragraph1 || ''}\n\n${e.target.value}`
                      })}
                      rows={6}
                    />
                  </div>
                </>
              )
            ) : (
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {generatedContent.content}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setTweakDialog({ open: true, tweakInstructions: '' })}>
                <Sparkles className="w-4 h-4 mr-2" />
                Tweak
              </Button>
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                <Pencil className="w-4 h-4 mr-2" />
                {editMode ? 'Preview' : 'Edit'}
              </Button>
              <Button variant="outline" onClick={handleCopyGenerated}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" onClick={handleSaveToDatabase}>
                <Database className="w-4 h-4 mr-2" />
                Save to Database
              </Button>
              <Button onClick={handleApplyGenerated}>
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tweak Dialog */}
      <Dialog open={tweakDialog.open} onOpenChange={(open) => setTweakDialog({ open, tweakInstructions: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tweak Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>What would you like to change?</Label>
              <Textarea
                value={tweakDialog.tweakInstructions}
                onChange={(e) => setTweakDialog({ ...tweakDialog, tweakInstructions: e.target.value })}
                placeholder="e.g., Make it more concise, add more technical details, change the tone..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTweakDialog({ open: false, tweakInstructions: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTweak}
                disabled={aiGenerating || !tweakDialog.tweakInstructions.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {aiGenerating ? 'Tweaking...' : 'Apply Tweak'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Examples Database Dialog */}
      <Dialog open={examplesDialogOpen} onOpenChange={setExamplesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {examplesCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} {examplesType === 'overview' ? 'Overview' : 'Point'} Examples
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{editingExample ? 'Edit' : 'Add'} Example</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title (Optional)</Label>
                  <Input
                    value={exampleFormData.title}
                    onChange={(e) => setExampleFormData({ ...exampleFormData, title: e.target.value })}
                    placeholder="e.g., Defensive Positioning Analysis"
                  />
                </div>
                {examplesType === 'overview' ? (
                  <div>
                    <Label>Overview Paragraph</Label>
                    <Textarea
                      value={exampleFormData.content}
                      onChange={(e) => setExampleFormData({ ...exampleFormData, content: e.target.value })}
                      placeholder="Example overview paragraph showing desired writing style..."
                      rows={6}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Paragraph 1</Label>
                      <Textarea
                        value={exampleFormData.paragraph_1}
                        onChange={(e) => setExampleFormData({ ...exampleFormData, paragraph_1: e.target.value })}
                        placeholder="Example paragraph showing desired writing style..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>Paragraph 2</Label>
                      <Textarea
                        value={exampleFormData.paragraph_2}
                        onChange={(e) => setExampleFormData({ ...exampleFormData, paragraph_2: e.target.value })}
                        placeholder="Example paragraph showing desired writing style..."
                        rows={4}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={exampleFormData.notes}
                    onChange={(e) => setExampleFormData({ ...exampleFormData, notes: e.target.value })}
                    placeholder="Notes about this example..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveExample}>
                    {editingExample ? 'Update' : 'Add'} Example
                  </Button>
                  {editingExample && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingExample(null);
                        setExampleFormData({ title: '', paragraph_1: '', paragraph_2: '', content: '', notes: '' });
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="font-semibold">Existing Examples</h3>
              {examples.length === 0 ? (
                <p className="text-sm text-muted-foreground">No examples yet. Add some to help the AI match your writing style.</p>
              ) : (
                examples.map((example) => (
                  <Card key={example.id}>
                    <CardHeader>
                      <CardTitle className="text-sm flex justify-between items-start">
                        <span>{example.title || 'Untitled Example'}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingExample(example);
                              setExampleFormData({
                                title: example.title || '',
                                paragraph_1: example.paragraph_1 || '',
                                paragraph_2: example.paragraph_2 || '',
                                content: example.content || '',
                                notes: example.notes || ''
                              });
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExample(example.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {example.content && (
                        <p className="text-sm">{example.content}</p>
                      )}
                      {example.paragraph_1 && (
                        <p className="text-sm">{example.paragraph_1}</p>
                      )}
                      {example.paragraph_2 && (
                        <p className="text-sm">{example.paragraph_2}</p>
                      )}
                      {example.notes && (
                        <p className="text-xs text-muted-foreground italic">{example.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
