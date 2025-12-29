import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLoading, LoadingSpinner } from "@/components/LoadingSpinner";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationPermission } from "@/components/NotificationPermission";
import { NotificationSettings } from "@/components/NotificationSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { FileText, Play, Download, Upload, ChevronDown, Trash2, Lock, Calendar, Trophy, TrendingUp, Eye, EyeOff, ChevronUp, ChevronDown as ChevronDownIcon, List, RefreshCw, CheckCircle2, WifiOff, Bell } from "lucide-react";
import { ClipNameEditor } from "@/components/ClipNameEditor";
import { addDays, format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { SEO } from "@/components/SEO";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { PlaylistContent } from "@/components/PlaylistContent";
import { CoachAvailability } from "@/components/CoachAvailability";
import { PlayerScoutingReports } from "@/components/PlayerScoutingReports";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineContentManager } from "@/components/OfflineContentManager";
import { CacheManager } from "@/lib/cacheManager";
import { Hub } from "@/components/dashboard/Hub";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { Link } from "react-router-dom";

import { getR90Grade, getXGGrade, getXAGrade, getRegainsGrade, getInterceptionsGrade, getXGChainGrade, getProgressivePassesGrade, getPPTurnoversRatioGrade } from "@/lib/gradeCalculations";
import { downloadVideo } from "@/lib/videoDownload";
import { PlayerPositionalGuides } from "@/components/PlayerPositionalGuides";
import { ProtectedContracts } from "@/components/player/ProtectedContracts";
import { PaymentOptions } from "@/components/player/PaymentOptions";
import { PlayerTransferHub } from "@/components/player/TransferHub";
import { PlayerProgrammingNotes } from "@/components/player/PlayerProgrammingNotes";
import { CognisanceSection } from "@/components/portal/CognisanceSection";
import { NutritionProgramDisplay } from "@/components/portal/NutritionProgramDisplay";

interface Analysis {
  id: string;
  analysis_date: string;
  r90_score: number;
  pdf_url: string | null;
  video_url: string | null;
  notes: string | null;
  opponent: string | null;
  result: string | null;
  minutes_played: number | null;
  analysis_writer_id?: string | null;
  analysis_writer_data?: any;
  striker_stats?: any;
}

interface PlayerProgram {
  id: string;
  program_name: string;
  phase_name: string | null;
  phase_dates: string | null;
  overview_text: string | null;
  is_current: boolean;
  schedule_notes: string | null;
  weekly_schedules: any;
  sessions: any;
  phase_image_url: string | null;
  player_image_url: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  pdf_url: string | null;
  billing_month: string | null;
  amount_paid: number;
  converted_amount: number | null;
  converted_currency: string | null;
}

interface Update {
  id: string;
  title: string;
  content: string;
  date: string;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [playerData, setPlayerData] = useState<any>(null);
  const [programs, setPrograms] = useState<PlayerProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [dailyAphorism, setDailyAphorism] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [activeTab, setActiveTab] = useState("hub");
  const [activeAnalysisTab, setActiveAnalysisTab] = useState("performance");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [visibleClipsCount, setVisibleClipsCount] = useState(10); // Show 10 clips initially
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [highlightsData, setHighlightsData] = useState<any>({ matchHighlights: [], bestClips: [] });
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});
  const [otherAnalyses, setOtherAnalyses] = useState<any[]>([]);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
  const [currentVideoName, setCurrentVideoName] = useState<string>("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [coachAvailabilityOpen, setCoachAvailabilityOpen] = useState(false);
  const [isSubheaderVisible, setIsSubheaderVisible] = useState(true);
  const [selectedFormMetric, setSelectedFormMetric] = useState<string>("r90");
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedSchemePosition, setSelectedSchemePosition] = useState<string>('');
  const [selectedTeamScheme, setSelectedTeamScheme] = useState<string>('');
  const [selectedOppositionScheme, setSelectedOppositionScheme] = useState<string>('');
  
  // Performance Report Dialog state
  const [performanceReportDialogOpen, setPerformanceReportDialogOpen] = useState(false);
  const [selectedReportAnalysisId, setSelectedReportAnalysisId] = useState<string | null>(null);
  
  // Testing states
  const [testingDialogOpen, setTestingDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<{name: string; category: string; description?: string; reps?: string; sets?: number} | null>(null);
  const [testScore, setTestScore] = useState('');
  const [testNotes, setTestNotes] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testHistoryOpen, setTestHistoryOpen] = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [savingTestResult, setSavingTestResult] = useState(false);
  const [nutritionPrograms, setNutritionPrograms] = useState<any[]>([]);


  // Initialize push notifications with player ID
  usePushNotifications(playerData?.id);

  // Session color mapping with hover states
  const getSessionColor = (sessionKey: string) => {
    const key = sessionKey.toUpperCase();
    const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
      'A': { bg: 'hsl(220, 70%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(220, 70%, 45%)' },
      'B': { bg: 'hsl(140, 50%, 30%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 40%)' },
      'C': { bg: 'hsl(0, 50%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(0, 50%, 45%)' },
      'D': { bg: 'hsl(45, 70%, 45%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(45, 70%, 55%)' },
      'E': { bg: 'hsl(70, 20%, 40%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(70, 20%, 50%)' },
      'F': { bg: 'hsl(270, 60%, 40%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(270, 60%, 50%)' },
      'G': { bg: 'hsl(190, 70%, 45%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(190, 70%, 55%)' },
      'PRE-B': { bg: 'hsl(140, 50%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 30%)' },
      'PRE-C': { bg: 'hsl(0, 50%, 25%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(0, 50%, 35%)' },
      'PRE-D': { bg: 'hsl(45, 70%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(45, 70%, 45%)' },
      'PRE-E': { bg: 'hsl(70, 20%, 30%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(70, 20%, 40%)' },
      'PRE-F': { bg: 'hsl(270, 60%, 30%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(270, 60%, 40%)' },
      'PRE-G': { bg: 'hsl(190, 70%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(190, 70%, 45%)' },
      'PREHAB': { bg: 'hsl(220, 80%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(220, 80%, 30%)' },
      'T': { bg: 'hsl(140, 50%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 30%)' },
      'TESTING': { bg: 'hsl(140, 50%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 30%)' },
      'R': { bg: 'hsl(0, 0%, 85%)', text: 'hsl(45, 100%, 45%)', hover: 'hsl(0, 0%, 90%)' },
      'REST': { bg: 'hsl(0, 0%, 85%)', text: 'hsl(45, 100%, 45%)', hover: 'hsl(0, 0%, 90%)' },
    };
    return colorMap[key] || { bg: 'hsl(0, 0%, 15%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 25%)' };
  };

  // Handle clicking on a schedule day to jump to that session
  const handleSessionClick = (sessionKey: string) => {
    setSelectedSession(sessionKey);
    setAccordionValue(['sessions']);
    // Scroll to sessions section after state update
    setTimeout(() => {
      const sessionsSection = document.querySelector('[value="sessions"]');
      sessionsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Calculate actual dates for each day in a week based on week_start_date
  const getWeekDates = (weekStartDate: string | null) => {
    if (!weekStartDate) return null;
    
    try {
      const startDate = parseISO(weekStartDate);
      return {
        monday: startDate,
        tuesday: addDays(startDate, 1),
        wednesday: addDays(startDate, 2),
        thursday: addDays(startDate, 3),
        friday: addDays(startDate, 4),
        saturday: addDays(startDate, 5),
        sunday: addDays(startDate, 6),
      };
    } catch (error) {
      console.error('Error parsing week start date:', error);
      return null;
    }
  };

  // Handle clicking on an exercise to show details
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setExerciseDialogOpen(true);
  };

  // Handle clicking on a test to show details and input score
  const handleTestClick = (test: any, category: string) => {
    setSelectedTest({ ...test, category });
    setTestScore('');
    setTestNotes('');
    setTestingDialogOpen(true);
  };

  // Fetch test results for a player
  const fetchTestResults = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from('player_test_results')
        .select('*')
        .eq('player_id', playerId)
        .order('test_date', { ascending: false });
      
      if (error) throw error;
      setTestResults(data || []);
    } catch (error) {
      console.error('Error fetching test results:', error);
    }
  };

  // Save a test result
  const saveTestResult = async (status: 'draft' | 'submitted' = 'submitted') => {
    if (!playerData?.id || !selectedTest || !testScore.trim()) {
      toast.error('Please enter a score');
      return;
    }
    
    setSavingTestResult(true);
    try {
      const { error } = await supabase
        .from('player_test_results')
        .insert({
          player_id: playerData.id,
          test_name: selectedTest.name,
          test_category: selectedTest.category,
          score: testScore.trim(),
          notes: testNotes.trim() || null,
          test_date: new Date().toISOString().split('T')[0],
          status
        });
      
      if (error) throw error;
      
      toast.success(status === 'draft' ? 'Draft saved!' : 'Test result submitted!');
      setTestingDialogOpen(false);
      setTestScore('');
      setTestNotes('');
      fetchTestResults(playerData.id);
    } catch (error: any) {
      console.error('Error saving test result:', error);
      toast.error('Failed to save test result');
    } finally {
      setSavingTestResult(false);
    }
  };

  // Get test results filtered by month
  const getTestResultsByMonth = (month: string) => {
    return testResults.filter(result => result.test_date?.startsWith(month));
  };

  // Get available months from test results
  const getAvailableMonths = () => {
    const months = new Set<string>();
    testResults.forEach(result => {
      if (result.test_date) {
        months.add(result.test_date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  };

  const handleFileUpload = async (files: FileList) => {
    let playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
    if (!playerEmail) {
      toast.error("Please log in again");
      navigate("/login");
      return;
    }

    // Create uploadIds upfront so they match between UI and upload logic
    const timestamp = Date.now();
    const uploadIds = Array.from(files).map((file, index) => `${timestamp}_${index}_${file.name}`);

    // Add files to UI immediately with uploading status
    const newClips = Array.from(files).map((file, index) => ({
      id: uploadIds[index],
      name: file.name.replace(/\.[^/.]+$/, ''),
      videoUrl: '',
      addedAt: new Date().toISOString(),
      uploading: true,
      uploadId: uploadIds[index],
      file // Store file for retry
    }));

    setHighlightsData((prev: any) => ({
      ...prev,
      bestClips: [...newClips, ...(prev.bestClips || [])]
    }));

    // Upload files concurrently
    let successCount = 0;
    let failCount = 0;

    const uploadPromises = Array.from(files).map(async (file, index) => {
      const clipName = file.name.replace(/\.[^/.]+$/, '');
      const uploadId = uploadIds[index];
      let progressInterval: NodeJS.Timeout | undefined;
      
      try {
        // Initialize progress to 0
        setFileUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

        // Fallback progress simulation if no real progress events
        let lastProgressUpdate = Date.now();
        let hasReceivedProgress = false;
        progressInterval = setInterval(() => {
          if (!hasReceivedProgress && Date.now() - lastProgressUpdate > 1000) {
            setFileUploadProgress(prev => {
              const current = prev[uploadId] || 0;
              if (current < 85) {
                return { ...prev, [uploadId]: Math.min(current + Math.random() * 15, 85) };
              }
              return prev;
            });
          }
        }, 800);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('playerEmail', playerEmail);
        formData.append('clipName', clipName);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            hasReceivedProgress = true;
            lastProgressUpdate = Date.now();
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setFileUploadProgress(prev => ({ ...prev, [uploadId]: progress }));
            } else {
              // Even without lengthComputable, show some progress
              setFileUploadProgress(prev => {
                const current = prev[uploadId] || 0;
                return { ...prev, [uploadId]: Math.min(current + 5, 90) };
              });
            }
          });

          xhr.addEventListener('load', () => {
            clearInterval(progressInterval);
            if (xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);
              if (data.success) {
                setFileUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
                resolve();
              } else {
                reject(new Error(data.error || 'Upload failed'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            clearInterval(progressInterval);
            reject(new Error('Network error'));
          });

          const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZXRoaW1idGFhbWxoYmFqbWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODQzNDMsImV4cCI6MjA3NjM2MDM0M30.FNM354bgxhdtM4F_KGbQQnJwX7-WngaX58kPvPYnUEY';
          xhr.open('POST', 'https://qwethimbtaamlhbajmal.supabase.co/functions/v1/upload-player-highlight');
          xhr.setRequestHeader('apikey', anonKey);
          xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
          xhr.send(formData);
        });

        // Mark as successfully uploaded
        setHighlightsData((prev: any) => ({
          ...prev,
          bestClips: prev.bestClips.map((clip: any) => 
            clip.uploadId === uploadId 
              ? { ...clip, uploading: false, justCompleted: true }
              : clip
          )
        }));

        setFileUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });

        successCount++;
      } catch (error: any) {
        console.error(`Upload error for ${clipName}:`, error);
        
        // Mark as failed with retry option
        setHighlightsData((prev: any) => ({
          ...prev,
          bestClips: prev.bestClips.map((clip: any) => 
            clip.uploadId === uploadId 
              ? { ...clip, uploading: false, uploadFailed: true, error: error.message }
              : clip
          )
        }));

        setFileUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });

        // Clear any lingering interval
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        failCount++;
      }
    });

    await Promise.all(uploadPromises);

    // Refetch to get the new clips from database
    await fetchAnalyses(playerEmail);

    // Show final result
    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} clip(s) uploaded successfully!`);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`${successCount} uploaded, ${failCount} failed`);
    } else if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} clip(s)`);
    }
  };

  const handleRetryUpload = async (uploadId: string, file: File) => {
    let playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
    if (!playerEmail) {
      toast.error("Please log in again");
      navigate("/login");
      return;
    }

    const clipName = file.name.replace(/\.[^/.]+$/, '');
    
    // Mark as uploading again
    setHighlightsData((prev: any) => ({
      ...prev,
      bestClips: prev.bestClips.map((clip: any) => 
        clip.uploadId === uploadId 
          ? { ...clip, uploading: true, uploadFailed: false }
          : clip
      )
    }));

    try {
      setFileUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('playerEmail', playerEmail);
      formData.append('clipName', clipName);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFileUploadProgress(prev => ({ ...prev, [uploadId]: progress }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              resolve();
            } else {
              reject(new Error(data.error || 'Upload failed'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));

        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZXRoaW1idGFhbWxoYmFqbWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODQzNDMsImV4cCI6MjA3NjM2MDM0M30.FNM354bgxhdtM4F_KGbQQnJwX7-WngaX58kPvPYnUEY';
        xhr.open('POST', 'https://qwethimbtaamlhbajmal.supabase.co/functions/v1/upload-player-highlight');
        xhr.setRequestHeader('apikey', anonKey);
        xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
        xhr.send(formData);
      });

      setFileUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });

      await fetchAnalyses(playerEmail);
      toast.success('Clip uploaded successfully!');
    } catch (error: any) {
      console.error(`Retry upload error:`, error);
      
      setHighlightsData((prev: any) => ({
        ...prev,
        bestClips: prev.bestClips.map((clip: any) => 
          clip.uploadId === uploadId 
            ? { ...clip, uploading: false, uploadFailed: true, error: error.message }
            : clip
        )
      }));

      setFileUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });

      toast.error('Upload failed again');
    }
  };

  const handleDeleteClip = async (clipName: string, videoUrl: string) => {
    if (!confirm('Are you sure you want to delete this clip?')) return;

    try {
      let playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      if (!playerEmail) {
        toast.error("Please log in again");
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-player-highlight`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            playerEmail,
            clipName,
            videoUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete failed:', errorData);
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success("Clip deleted successfully!");
      await fetchAnalyses(playerEmail);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete clip");
    }
  };

  const handleRenameClip = async (oldName: string, newName: string, videoUrl: string) => {
    let playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
    if (!playerEmail || !newName.trim()) {
      if (!playerEmail) {
        toast.error("Please log in again");
        navigate("/login");
      }
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rename-player-highlight`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            playerEmail,
            oldName,
            newName: newName.trim(),
            videoUrl,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Rename failed');
      }

      toast.success("Clip renamed successfully!");
      await fetchAnalyses(playerEmail);
    } catch (error: any) {
      console.error('Rename error:', error);
      toast.error("Failed to rename clip");
    }
  };

  const handleReorderClip = async (index: number, direction: 'up' | 'down') => {
    let playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
    if (!playerEmail) {
      toast.error("Please log in again");
      navigate("/login");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in again");
        navigate("/login");
        return;
      }

      const { data: players, error: playerError } = await supabase
        .from("players")
        .select("id, highlights")
        .eq("email", playerEmail);

      if (playerError || !players || players.length === 0) {
        throw new Error("Failed to fetch player data");
      }

      const player = players[0];
      
      // Parse highlights properly - it might be a string or already an object
      const highlights = player.highlights 
        ? (typeof player.highlights === 'string' 
            ? JSON.parse(player.highlights) 
            : player.highlights)
        : { matchHighlights: [], bestClips: [] };

      if (!highlights.bestClips || !Array.isArray(highlights.bestClips) || highlights.bestClips.length === 0) {
        throw new Error("No clips found");
      }

      const bestClips = [...highlights.bestClips];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      // Check bounds
      if (newIndex < 0 || newIndex >= bestClips.length) {
        return;
      }

      // Swap items
      [bestClips[index], bestClips[newIndex]] = [bestClips[newIndex], bestClips[index]];

      const { error: updateError } = await supabase
        .from("players")
        .update({
          highlights: {
            ...highlights,
            bestClips
          }
        })
        .eq("id", player.id);

      if (updateError) throw updateError;

      toast.success("Clip reordered");
      await fetchAnalyses(playerEmail);
    } catch (error: any) {
      console.error('Reorder error:', error);
      toast.error(error.message || "Failed to reorder clip");
    }
  };

  useEffect(() => {
    checkAuth();
    fetchDailyAphorism();

    // Setup online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [navigate]);

  const checkAuth = async () => {
    try {
      // Check both localStorage and sessionStorage for maximum persistence
      let playerEmail = localStorage.getItem("player_email");
      
      // If not in localStorage, check sessionStorage as fallback
      if (!playerEmail) {
        playerEmail = sessionStorage.getItem("player_email");
        
        // If found in sessionStorage, restore to localStorage
        if (playerEmail) {
          try {
            localStorage.setItem("player_email", playerEmail);
          } catch (e) {
            console.error("Could not restore to localStorage:", e);
          }
        }
      }
      
      if (!playerEmail) {
        navigate("/login");
        return;
      }

      // Check if we're offline
      if (!navigator.onLine) {
        console.log('[Dashboard] Offline mode - loading cached data');
        
        // Try to load cached data
        const cachedPlayerData = await CacheManager.getCachedPlayerData(playerEmail);
        const cachedPrograms = await CacheManager.getCachedPrograms(playerEmail);
        const cachedUpdates = await CacheManager.getCachedUpdates();
        const cachedInvoices = await CacheManager.getCachedInvoices(playerEmail);
        const cachedAphorisms = await CacheManager.getCachedAphorisms();
        
        if (cachedPlayerData) {
          setPlayerData(cachedPlayerData);
          if (cachedPlayerData.highlights) {
            setHighlightsData(cachedPlayerData.highlights);
          }
        }
        
        if (cachedPrograms) {
          setPrograms(cachedPrograms);
          if (cachedPrograms.length > 0) {
            const currentProgram = cachedPrograms.find(p => p.is_current);
            setSelectedProgramId(currentProgram?.id || cachedPrograms[0].id);
          }
        }
        
        if (cachedUpdates) {
          setUpdates(cachedUpdates);
        }
        
        if (cachedInvoices) {
          setInvoices(cachedInvoices);
        }
        
        if (cachedAphorisms && cachedAphorisms.length > 0) {
          setDailyAphorism(cachedAphorisms[0]);
        }
        
        // Load cached analyses
        const cachedAnalyses: Analysis[] = [];
        const analysisItems = await CacheManager.getCachedItems('analyses');
        for (const item of analysisItems) {
          const match = item.match(/\/offline\/analysis\/(.+)$/);
          if (match) {
            const analysisId = match[1];
            const analysis = await CacheManager.getCachedAnalysis(analysisId);
            if (analysis) cachedAnalyses.push(analysis);
          }
        }
        if (cachedAnalyses.length > 0) {
          setAnalyses(cachedAnalyses);
        }
        
        setLoading(false);
        return;
      }

      // Online - verify with Supabase
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("email", playerEmail)
        .maybeSingle();

      if (playerError || !player) {
        // Email no longer valid, clear session and redirect
        localStorage.removeItem("player_email");
        navigate("/login");
        return;
      }

      await fetchAnalyses(playerEmail);
      await fetchPrograms(playerEmail);
      await fetchInvoices(playerEmail);
      await fetchUpdates(player.id);
      await fetchTestResults(player.id);
      await fetchNutritionPrograms(player.id);
    } catch (error) {
      console.error("Error loading data:", error);
      
      // If there's an error and we have stored auth, try offline cache
      const playerEmail = localStorage.getItem("player_email");
      if (playerEmail && !navigator.onLine) {
        console.log('[Dashboard] Error loading, trying cached data');
        const cachedPlayerData = await CacheManager.getCachedPlayerData(playerEmail);
        if (cachedPlayerData) {
          setPlayerData(cachedPlayerData);
          setLoading(false);
          return;
        }
      }
      
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyses = async (email: string | undefined) => {
    if (!email) return;
    
    try {
      // First get the player ID and data from email
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) {
        console.log("No player profile found for this email");
        return;
      }

      // Parse bio data with bulletproof fallbacks
      let parsedPlayerData = { ...playerData };
      try {
        if (playerData.bio) {
          let bioData: any = playerData.bio;
          
          // Parse string to object
          if (typeof bioData === 'string' && bioData.trim()) {
            try {
              bioData = JSON.parse(bioData);
            } catch {
              console.warn('Bio is not valid JSON, skipping');
              bioData = null;
            }
          }
          
          // Handle nested bio string
          if (bioData && typeof bioData === 'object' && !Array.isArray(bioData) && typeof bioData.bio === 'string' && bioData.bio.trim()) {
            try {
              const nestedBio = JSON.parse(bioData.bio);
              if (nestedBio && typeof nestedBio === 'object' && !Array.isArray(nestedBio)) {
                bioData = { ...bioData, ...nestedBio };
                delete bioData.bio;
              }
            } catch {
              // Nested bio not valid JSON, keep outer bioData
            }
          }
          
          // Only merge if bioData is a valid object
          if (bioData && typeof bioData === 'object' && !Array.isArray(bioData)) {
            parsedPlayerData = { ...playerData, ...bioData };
          }
        }
      } catch (e) {
        console.error('Error parsing player bio:', e);
      }

      setPlayerData(parsedPlayerData);

      // Set initial scheme position to player's position
      if (parsedPlayerData.position) {
        setSelectedSchemePosition(parsedPlayerData.position);
      }

      // Extract highlights with bulletproof fallbacks
      let highlights: any = { matchHighlights: [], bestClips: [] };
      try {
        if (playerData.highlights) {
          let parsed = playerData.highlights;
          
          // Parse if string
          if (typeof parsed === 'string' && parsed.trim()) {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              console.warn('Highlights is not valid JSON, using defaults');
            }
          }
          
          // Validate structure
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            highlights = {
              matchHighlights: Array.isArray(parsed.matchHighlights) ? parsed.matchHighlights : [],
              bestClips: Array.isArray(parsed.bestClips) ? parsed.bestClips : []
            };
          }
        }
      } catch (e) {
        console.error('Error parsing highlights:', e);
      }
      
      // Preserve uploading/failed clips
      setHighlightsData((prev: any) => {
        const uploadingOrFailedOrCompleted = Array.isArray(prev.bestClips)
          ? prev.bestClips.filter((clip: any) => clip.uploading || clip.uploadFailed || clip.justCompleted)
          : [];
        
        return {
          matchHighlights: highlights.matchHighlights || [],
          bestClips: [...uploadingOrFailedOrCompleted, ...(highlights.bestClips || [])]
        };
      });

      // Then fetch their analyses
      const { data: analysisData, error: analysisError } = await supabase
        .from("player_analysis")
        .select("*")
        .eq("player_id", playerData.id)
        .order("analysis_date", { ascending: false });

      if (analysisError) throw analysisError;
      
      // Calculate xGChain for analyses based on actions (always derived from actions)
      const analysesWithXGChain = await Promise.all(
        (analysisData || []).map(async (analysis) => {
          const strikerStats = (analysis.striker_stats || {}) as any;

          // Fetch performance actions and calculate xGChain
          const { data: actions } = await supabase
            .from('performance_report_actions')
            .select('action_score')
            .eq('analysis_id', analysis.id);
          
          if (actions && actions.length > 0 && analysis.minutes_played) {
            // Sum only positive action scores
            const xgChain = actions.reduce((sum, action) => {
              const score = action.action_score ?? 0;
              return score > 0 ? sum + score : sum;
            }, 0);
            
            const xgChainPer90 = (xgChain / analysis.minutes_played) * 90;
            
            // Add calculated xGChain to striker_stats (override any stored values)
            return {
              ...analysis,
              striker_stats: {
                ...strikerStats,
                xGChain: xgChain,
                xGChain_per90: xgChainPer90,
              },
            };
          }
          
          return analysis;
        })
      );

      setAnalyses(analysesWithXGChain);

      // Fetch all concepts from coaching_analysis (available to all players)
      const { data: conceptsData, error: conceptsError } = await supabase
        .from("coaching_analysis")
        .select("*")
        .eq("analysis_type", "concept");

      if (!conceptsError && conceptsData) {
        const normalizedConcepts = conceptsData.map(concept => ({
          id: concept.id,
          title: concept.title || "Untitled Concept",
          concept: concept.content || concept.description || null,
          explanation: concept.content || concept.description || null,
          points: Array.isArray(concept.attachments) ? concept.attachments : [],
          created_at: concept.created_at
        }));
        setConcepts(normalizedConcepts);
      }

      // Fetch all analyses (pre-match, post-match) linked to this player
      const linkedAnalysisIds = (analysisData || [])
        .filter(a => a.analysis_writer_id)
        .map(a => a.analysis_writer_id);

      if (linkedAnalysisIds.length > 0) {
        const { data: allAnalysesData, error: allAnalysesError } = await supabase
          .from("analyses")
          .select("*")
          .in("id", linkedAnalysisIds);

        if (!allAnalysesError && allAnalysesData) {
          // Add pre-match and post-match analyses to the analyses array
          const matchAnalyses = allAnalysesData.filter(a => 
            a.analysis_type === "pre-match" || a.analysis_type === "post-match"
          );
          
          // Merge with existing player_analysis data
          const mergedAnalyses = [...(analysisData || [])] as Analysis[];
          matchAnalyses.forEach(matchAnalysis => {
            const playerAnalysis = (analysisData || []).find(
              pa => pa.analysis_writer_id === matchAnalysis.id
            );
            if (playerAnalysis) {
              // Update the existing analysis with details from analyses table
              const index = mergedAnalyses.findIndex(a => a.id === playerAnalysis.id);
              if (index !== -1) {
                mergedAnalyses[index] = {
                  ...mergedAnalyses[index],
                  analysis_writer_data: matchAnalysis
                } as Analysis;
              }
            }
          });
          setAnalyses(mergedAnalyses);
        }
      }

      // Fetch other analyses assigned to this player
      const { data: otherAnalysesData, error: otherAnalysesError } = await supabase
        .from("player_other_analysis")
        .select(`
          id,
          assigned_at,
          analysis:coaching_analysis (
            id,
            title,
            description,
            content,
            category
          )
        `)
        .eq("player_id", playerData.id)
        .order("assigned_at", { ascending: false });

      if (!otherAnalysesError && otherAnalysesData) {
        setOtherAnalyses(otherAnalysesData);
      }
    } catch (error: any) {
      console.error("Error fetching analyses:", error);
      toast.error("Failed to load analysis data");
    }
  };

  const fetchSchemes = async (position: string | undefined) => {
    if (!position) return;
    
    try {
      // Normalize position to full name for matching
      const normalizePosition = (pos: string): string => {
        const positionMap: Record<string, string> = {
          'GK': 'Goalkeeper',
          'Goalkeeper': 'Goalkeeper',
          'FB': 'Full-Back',
          'Full-Back': 'Full-Back',
          'Fullback': 'Full-Back',
          'CB': 'Centre-Back',
          'Centre-Back': 'Centre-Back',
          'Center-Back': 'Centre-Back',
          'CDM': 'Central Defensive-Midfielder',
          'Central Defensive-Midfielder': 'Central Defensive-Midfielder',
          'Central Defensive Midfielder': 'Central Defensive-Midfielder',
          'CM': 'Central Midfielder',
          'Central Midfielder': 'Central Midfielder',
          'AM': 'Attacking Midfielder',
          'Attacking Midfielder': 'Attacking Midfielder',
          'CAM': 'Attacking Midfielder',
          'W': 'Winger',
          'Winger': 'Winger',
          'LW': 'Winger',
          'RW': 'Winger',
          'CF': 'Centre-Forward',
          'Centre-Forward': 'Centre-Forward',
          'Center-Forward': 'Centre-Forward',
          'ST': 'Centre-Forward',
          'Striker': 'Centre-Forward',
        };
        
        return positionMap[pos] || pos;
      };
      
      const normalizedPosition = normalizePosition(position);
      
      // Fetch tactical schemes for the selected position that have at least one field filled
      const { data: schemesData, error: schemesError } = await supabase
        .from("tactical_schemes")
        .select("*")
        .eq("position", normalizedPosition);

      if (schemesError) throw schemesError;
      
      // Filter to only include schemes that have at least one tactical field filled
      const filledSchemes = (schemesData || []).filter(scheme => 
        scheme.defensive_transition || 
        scheme.defence || 
        scheme.offensive_transition || 
        scheme.offence
      );
      
      setSchemes(filledSchemes);
      // Reset scheme selections when position changes
      setSelectedTeamScheme('');
      setSelectedOppositionScheme('');
    } catch (error: any) {
      console.error("Error fetching schemes:", error);
    }
  };

  // Fetch schemes when selectedSchemePosition changes
  useEffect(() => {
    if (selectedSchemePosition) {
      fetchSchemes(selectedSchemePosition);
    }
  }, [selectedSchemePosition]);

  // Set up real-time subscription for player_analysis updates
  useEffect(() => {
    let playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
    if (!playerEmail) return;

    const channel = supabase
      .channel('dashboard-analysis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_analysis'
        },
        () => {
          // Refetch analyses when any change occurs
          fetchAnalyses(playerEmail);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPrograms = async (email: string | undefined) => {
    if (!email) return;
    
    try {
      // First get the player ID from email
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) return;

      // Fetch their programs
      const { data: programsData, error: programsError } = await supabase
        .from("player_programs")
        .select("*")
        .eq("player_id", playerData.id)
        .order("created_at", { ascending: false });

      if (programsError) throw programsError;
      
      // Normalize program data to ensure arrays exist
      const normalizedPrograms = (programsData || []).map(program => ({
        ...program,
        weekly_schedules: Array.isArray(program.weekly_schedules) ? program.weekly_schedules : [],
        sessions: program.sessions && typeof program.sessions === 'object' && !Array.isArray(program.sessions) 
          ? program.sessions 
          : {}
      }));
      
      setPrograms(normalizedPrograms);
      
      // Set the current program as default (excluding Testing Protocol)
      const nonTestingPrograms = normalizedPrograms?.filter(p => p.program_name !== 'Testing Protocol');
      const currentProgram = nonTestingPrograms?.find(p => p.is_current);
      if (currentProgram) {
        setSelectedProgramId(currentProgram.id);
      } else if (nonTestingPrograms && nonTestingPrograms.length > 0) {
        setSelectedProgramId(nonTestingPrograms[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching programs:", error);
      toast.error("Failed to load program data");
    }
  };

  const fetchDailyAphorism = async () => {
    try {
      // Fetch all aphorisms
      const { data, error } = await supabase
        .from("coaching_aphorisms")
        .select("*");

      if (error) throw error;
      if (!data || data.length === 0) return;

      // Use current date as seed for consistent daily selection
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      const index = dayOfYear % data.length;
      
      setDailyAphorism(data[index]);
    } catch (error) {
      console.error("Error fetching daily aphorism:", error);
    }
  };

  const fetchInvoices = async (email: string | undefined) => {
    if (!email) return;
    
    try {
      // First get the player ID from email
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) return;

      // Fetch their invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("player_id", playerData.id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      
      setInvoices(invoicesData || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchUpdates = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("updates")
        .select("*")
        .eq("visible", true)
        .or(`visible_to_player_ids.cs.{${playerId}},visible_to_player_ids.is.null`)
        .order("date", { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error: any) {
      console.error("Error fetching updates:", error);
    }
  };

  const fetchNutritionPrograms = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("player_nutrition_programs")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNutritionPrograms(data || []);
    } catch (error) {
      console.error("Error fetching nutrition programs:", error);
    }
  };

  // Track subheader visibility for sticky dropdown menu
  useEffect(() => {
    const handleScroll = () => {
      const subheader = document.getElementById('subheader');
      if (subheader) {
        const rect = subheader.getBoundingClientRect();
        // Subheader is visible if its bottom edge is still below the top of viewport
        setIsSubheaderVisible(rect.bottom > 64); // 64px is header height
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-select first available metric with data when analyses change
  useEffect(() => {
    if (analyses.length === 0) return;
    
    // Helper function to check if any analysis has data for a metric
    const hasMetricData = (metricKey: string, statKey?: string) => {
      if (metricKey === "r90") {
        return analyses.some(a => a.r90_score != null);
      }
      // Special case for ratio metrics
      if (metricKey === "ppturnoversratio") {
        return analyses.some(a => 
          a.striker_stats && 
          a.striker_stats.progressive_passes != null && 
          a.striker_stats.turnovers != null &&
          Number(a.striker_stats.turnovers) !== 0
        );
      }
      return analyses.some(a => 
        a.striker_stats && 
        statKey && 
        a.striker_stats[statKey] != null && 
        a.striker_stats[statKey] !== ''
      );
    };

    const availableMetrics = [
      { value: "r90", statKey: undefined },
      { value: "xg", statKey: "xG_adj_per90" },
      { value: "xa", statKey: "xA_adj_per90" },
      { value: "regains", statKey: "regains_adj_per90" },
      { value: "interceptions", statKey: "interceptions_per90" },
      { value: "xgchain", statKey: "xGChain_per90" },
      { value: "xgbuildup", statKey: "xGBuildup_per90" },
      { value: "progressivepasses", statKey: "progressive_passes_adj_per90" },
      { value: "ppturnoversratio", statKey: "progressive_passes,turnovers" },
      { value: "shots", statKey: "Shots_per90" },
      { value: "shotsontarget", statKey: "ShotsOnTarget_per90" },
    ];

    // Check if current metric has data
    const currentMetric = availableMetrics.find(m => m.value === selectedFormMetric);
    if (currentMetric && !hasMetricData(currentMetric.value, currentMetric.statKey)) {
      // Find first metric with data
      const firstValidMetric = availableMetrics.find(m => hasMetricData(m.value, m.statKey));
      if (firstValidMetric) {
        setSelectedFormMetric(firstValidMetric.value);
      }
    }
  }, [analyses]);

  const getR90Color = (score: number) => {
    if (score < 0) return "bg-red-950"; // Dark red for negative
    if (score >= 0 && score < 0.2) return "bg-red-600"; // Red
    if (score >= 0.2 && score < 0.4) return "bg-red-400"; // Light red
    if (score >= 0.4 && score < 0.6) return "bg-orange-700"; // Orange-brown
    if (score >= 0.6 && score < 0.8) return "bg-orange-500"; // Yellow-orange
    if (score >= 0.8 && score < 1.0) return "bg-yellow-400"; // Yellow
    if (score >= 1.0 && score < 1.4) return "bg-lime-400"; // Light Green
    if (score >= 1.4 && score < 1.8) return "bg-green-500"; // Green
    if (score >= 1.8 && score < 2.5) return "bg-green-700"; // Dark green
    return "bg-gold"; // RISE gold for 2.5+
  };

  const handleLogout = async () => {
    // Clear from BOTH storages to ensure complete logout
    localStorage.removeItem("player_email");
    localStorage.removeItem("player_login_timestamp");
    sessionStorage.removeItem("player_email");
    
    // Also sign out from Supabase auth if there's a session
    await supabase.auth.signOut();
    
    toast.success("Logged out successfully");
    navigate("/login");
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-16">
            <img 
              src="/RISEWhite.png"
              alt="RISE"
              className="h-10 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Subheader with Options */}
      <div id="subheader" className="bg-background lg:bg-background bg-[url('/smudged-marble-header.png')] lg:bg-none bg-cover bg-center bg-no-repeat border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 h-12">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 relative"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                  {/* Notification Badge */}
                  {(() => {
                    const recentCount = [
                      ...analyses.slice(0, 3),
                      ...programs.filter(p => p.is_current).slice(0, 2),
                      ...concepts.slice(0, 2),
                      ...updates.slice(0, 2)
                    ].length;
                    
                    if (recentCount === 0) return null;
                    
                    return (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {Math.min(recentCount, 9)}
                      </span>
                    );
                  })()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-80 max-h-96 overflow-y-auto bg-card border-2 border-gold z-50">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-semibold">Recent Notifications</h3>
                </div>
                <div className="py-2">
                  {(() => {
                    const notifications: Array<{ type: string; title: string; subtitle: string; date: Date; onClick?: () => void }> = [];
                    
                    // Add recent analyses
                    analyses.slice(0, 3).forEach(analysis => {
                      notifications.push({
                        type: 'analysis',
                        title: 'New Performance Report',
                        subtitle: `${analysis.opponent || 'Match'} - ${format(parseISO(analysis.analysis_date), 'MMM d')}`,
                        date: parseISO(analysis.analysis_date),
                        onClick: () => {
                          setActiveTab('analysis');
                          setActiveAnalysisTab('performance');
                        }
                      });
                    });
                    
                    // Add recent programs
                    programs.filter(p => p.is_current).slice(0, 2).forEach(program => {
                      notifications.push({
                        type: 'program',
                        title: 'Training Program',
                        subtitle: program.program_name,
                        date: parseISO(program.created_at),
                        onClick: () => setActiveTab('physical')
                      });
                    });
                    
                    // Add recent concepts
                    concepts.slice(0, 2).forEach(concept => {
                      notifications.push({
                        type: 'concept',
                        title: 'New Concept',
                        subtitle: concept.title || 'Analysis',
                        date: parseISO(concept.created_at),
                        onClick: () => {
                          setActiveTab('analysis');
                          setActiveAnalysisTab('concepts');
                        }
                      });
                    });
                    
                    // Add recent updates
                    updates.slice(0, 2).forEach(update => {
                      notifications.push({
                        type: 'update',
                        title: 'New Update',
                        subtitle: update.title,
                        date: parseISO(update.date),
                        onClick: () => setActiveTab('updates')
                      });
                    });
                    
                    // Sort by date and take most recent 5
                    const sortedNotifications = notifications
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .slice(0, 5);
                    
                    if (sortedNotifications.length === 0) {
                      return (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No recent notifications
                        </div>
                      );
                    }
                    
                    return sortedNotifications.map((notif, idx) => (
                      <div 
                        key={idx}
                        className="px-4 py-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                        onClick={notif.onClick}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notif.subtitle}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(() => {
                                const now = new Date();
                                const diffMs = now.getTime() - notif.date.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                
                                if (diffDays === 0) {
                                  if (diffHours === 0) return 'Just now';
                                  if (diffHours === 1) return '1 hour ago';
                                  return `${diffHours} hours ago`;
                                }
                                if (diffDays === 1) return '1 day ago';
                                return `${diffDays} days ago`;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCoachAvailabilityOpen(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Coach Availability</span>
              <span className="sm:hidden">Availability</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-28 left-0 right-0 z-20 bg-destructive/90 backdrop-blur-sm text-destructive-foreground py-2 px-4">
          <div className="container mx-auto text-center text-sm font-medium">
            <WifiOff className="inline-block h-4 w-4 mr-2" />
            You're offline. Some content may not be available.
          </div>
        </div>
      )}

      <main className="pb-0">
        {/* Notification Permission - with padding */}
        <div className="container mx-auto max-w-6xl px-4 md:px-6 mb-0">
          <NotificationPermission />
        </div>
        {/* Navigation Menu - Full width, conditionally sticky */}
        <div className={`w-full ${!isSubheaderVisible ? 'sticky top-16 z-40' : ''}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" 
                className="w-full justify-center font-bebas uppercase text-xl px-6 py-6 bg-card hover:bg-card/80 border-t-2 border-gold border-x-0 border-b-2 !text-gold hover:!text-gold z-50 rounded-none"
                >
                  <span>
                    {activeTab === "hub" && "Hub"}
                    {activeTab === "analysis" && "Analysis"}
                    {activeTab === "physical" && "Programming"}
                    {activeTab === "invoices" && "Key Documents"}
                    {activeTab === "updates" && "Updates"}
                    {activeTab === "highlights" && "Highlights"}
                    {activeTab === "transfer-hub" && "Transfer Hub"}
                    {activeTab === "nutrition" && "Nutrition"}
                  </span>
                  <ChevronDown className="ml-2 h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[280px] bg-card border-2 border-gold shadow-lg shadow-gold/20 z-50">
                <DropdownMenuItem 
                  onClick={() => setActiveTab("hub")}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  Hub
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("analysis")}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  Analysis
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("physical")}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  Programming
                </DropdownMenuItem>
                {nutritionPrograms.length > 0 && (
                  <DropdownMenuItem 
                    onClick={() => setActiveTab("nutrition")}
                    className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                  >
                    Nutrition
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setActiveTab("invoices")}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  Key Documents
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("updates")}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  Updates
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("highlights")}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  Highlights
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("transfer-hub")}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  Transfer Hub
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowProfileModal(true)}
                  className="font-bebas uppercase text-base py-3 cursor-pointer text-gold hover:text-gold/80 hover:bg-gold/10"
                >
                  View Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Hub Section - Full Width, No Container */}
        {activeTab === "hub" && (
          <Hub 
            programs={programs} 
            analyses={analyses} 
            playerData={playerData}
            dailyAphorism={dailyAphorism}
            onNavigateToAnalysis={() => {
              setActiveTab("analysis");
              setActiveAnalysisTab("performance");
            }}
            onNavigateToForm={() => {
              setActiveTab("analysis");
              setActiveAnalysisTab("form");
            }}
            onNavigateToSession={(sessionKey) => {
              setActiveTab("physical");
              setSelectedSession(sessionKey);
              setAccordionValue((prev) => {
                if (!prev.includes("sessions")) {
                  return [...prev, "sessions"];
                }
                return prev;
              });
              // Scroll to the session after state updates
              setTimeout(() => {
                const element = document.getElementById(`session-${sessionKey}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 300);
            }}
            onNavigateToSchedule={() => {
              setActiveTab("physical");
            }}
          />
        )}

        {/* Content Section with Padding - For Other Tabs */}
        {activeTab !== "hub" && (
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Upload Progress Indicator */}
            {uploadProgress !== null && (
              <Card className="mb-6 border-primary/30">
                <CardContent className="py-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-foreground">Uploading clip...</span>
                      <span className="text-2xl font-bebas text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <TabsContent value="analysis" className="space-y-6">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-0 border-b-0">
                <CardContent className="container mx-auto px-4">
                  <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-6 gap-2 mb-0 bg-muted h-auto p-2">
                  <TabsTrigger value="performance" className="font-bebas uppercase text-sm sm:text-base">
                    Performance Analysis
                  </TabsTrigger>
                  <TabsTrigger value="form" className="font-bebas uppercase text-sm sm:text-base">
                    Form
                  </TabsTrigger>
                  <TabsTrigger value="other" className="font-bebas uppercase text-sm sm:text-base">
                    Other Analysis
                  </TabsTrigger>
                  <TabsTrigger value="scouting" className="font-bebas uppercase text-sm sm:text-base">
                    Scouting Reports
                  </TabsTrigger>
                  <TabsTrigger value="concepts" className="font-bebas uppercase text-sm sm:text-base">
                    Concepts
                  </TabsTrigger>
                  <TabsTrigger value="schemes" className="font-bebas uppercase text-sm sm:text-base">
                    Schemes
                  </TabsTrigger>
                  <TabsTrigger value="positional-guides" className="font-bebas uppercase text-sm sm:text-base">
                    Positional Guides
                  </TabsTrigger>
                  <TabsTrigger value="cognisance" className="font-bebas uppercase text-sm sm:text-base">
                    Cognisance
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="performance">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Performance Analysis
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4 space-y-4">
                      {analyses.length === 0 ? (
                        <div className="py-8"></div>
                      ) : (
                        <div className="space-y-3">
                          {analyses.map((analysis) => (
                            <div 
                              key={analysis.id} 
                              className="border rounded-lg p-3 hover:border-primary transition-colors bg-card"
                            >
                              {/* Line 1: Date, Opponent, Result - all on one line on mobile */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(analysis.analysis_date).toLocaleDateString('en-GB')}
                                  </span>
                                  {analysis.opponent && (
                                    <>
                                      <span className="text-xs font-medium">vs {analysis.opponent}</span>
                                      {analysis.result && (
                                        <span className="text-xs text-muted-foreground">({analysis.result})</span>
                                      )}
                                    </>
                                  )}
                                  {analysis.minutes_played !== null && (
                                    <span className="text-xs text-muted-foreground">
                                      • {analysis.minutes_played}'
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Line 2: Buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {analysis.r90_score !== null && analysis.r90_score !== undefined && (
                                  <button
                                    onClick={() => {
                                      setSelectedReportAnalysisId(analysis.id);
                                      setPerformanceReportDialogOpen(true);
                                    }}
                                    className={`${getR90Color(analysis.r90_score)} text-white px-3 py-1.5 rounded text-sm font-bold hover:opacity-80 transition-opacity cursor-pointer`}
                                  >
                                    R90: {analysis.r90_score.toFixed(2)}
                                  </button>
                                )}
                                
                                {analysis.analysis_writer_data && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      navigate(`/analysis/${analysis.analysis_writer_id}`);
                                    }}
                                    className={`text-xs border-0 ${
                                      analysis.analysis_writer_data.analysis_type === "pre-match" 
                                        ? "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 hover:from-slate-400 hover:to-slate-500" 
                                        : "bg-[hsl(43,49%,61%)] text-black hover:bg-[hsl(43,49%,71%)]"
                                    }`}
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    {analysis.analysis_writer_data.analysis_type === "pre-match" ? "Pre-Match" : "Post-Match"} Analysis
                                  </Button>
                                )}
                                
                                {analysis.pdf_url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(analysis.pdf_url!, '_blank')}
                                    className="text-xs"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    PDF
                                  </Button>
                                )}
                                
                                {analysis.video_url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(analysis.video_url!, '_blank')}
                                    className="text-xs"
                                  >
                                    📹 Video
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="scouting">
                  <PlayerScoutingReports 
                    playerId={playerData?.id || ""}
                    playerName={playerData?.name || ""}
                  />
                </TabsContent>

                <TabsContent value="concepts">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Concepts
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4 space-y-6">
                      {concepts.length === 0 ? (
                        <div className="py-8">
                          <p className="text-center text-muted-foreground">No concepts available yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {concepts.map((concept) => (
                            <div key={concept.id} className="border rounded-lg p-6 space-y-4">
                              <h3 className="text-2xl font-bebas uppercase tracking-wider">
                                {concept.title || "Untitled Concept"}
                              </h3>
                              {concept.concept && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-lg">Concept</h4>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{concept.concept}</p>
                                </div>
                              )}
                              {concept.points && Array.isArray(concept.points) && concept.points.length > 0 && (
                                <div className="grid gap-4">
                                  {concept.points.map((point: any, index: number) => (
                                    <div key={index} className="space-y-2">
                                      {point.images && Array.isArray(point.images) && point.images.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                          {point.images.map((img: string, imgIndex: number) => (
                                            <img
                                              key={imgIndex}
                                              src={img}
                                              alt={`Concept image ${imgIndex + 1}`}
                                              className="w-full h-48 object-cover rounded-lg"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {concept.explanation && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-lg">Explanation</h4>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{concept.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="schemes">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Tactical Schemes
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4 space-y-6">
                      {/* Position Selector */}
                      <div className="space-y-3">
                        <Label>Select Position</Label>
                        <Select value={selectedSchemePosition} onValueChange={setSelectedSchemePosition}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a position to view" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                            <SelectItem value="Full-Back">Full-Back</SelectItem>
                            <SelectItem value="Centre-Back">Centre-Back</SelectItem>
                            <SelectItem value="Central Defensive-Midfielder">Central Defensive-Midfielder</SelectItem>
                            <SelectItem value="Central Midfielder">Central Midfielder</SelectItem>
                            <SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem>
                            <SelectItem value="Winger">Winger</SelectItem>
                            <SelectItem value="Centre-Forward">Centre-Forward</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2">
                          {['Goalkeeper', 'Full-Back', 'Centre-Back', 'Central Defensive-Midfielder', 'Central Midfielder', 'Attacking Midfielder', 'Winger', 'Centre-Forward'].map(pos => (
                            <Button
                              key={pos}
                              variant={selectedSchemePosition === pos ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSchemePosition(pos)}
                              className="font-bold text-xs"
                            >
                              {pos}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {!selectedSchemePosition ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <p>Select a position to view tactical schemes.</p>
                        </div>
                      ) : schemes.length === 0 ? (
                        <div className="py-8">
                          <p className="text-center text-muted-foreground">No tactical schemes available for {selectedSchemePosition} yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Your Team Scheme</Label>
                              <Select value={selectedTeamScheme} onValueChange={setSelectedTeamScheme}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your team scheme" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from(new Set(schemes.map(s => s.team_scheme))).sort().map(scheme => (
                                    <SelectItem key={scheme} value={scheme}>
                                      {scheme}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {selectedTeamScheme && (
                              <div className="space-y-2">
                                <Label>Opposition Scheme</Label>
                                <Select value={selectedOppositionScheme} onValueChange={setSelectedOppositionScheme}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select opposition scheme" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from(new Set(
                                      schemes
                                        .filter(s => s.team_scheme === selectedTeamScheme)
                                        .map(s => s.opposition_scheme)
                                    )).sort().map(scheme => (
                                      <SelectItem key={scheme} value={scheme}>
                                        {scheme}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {selectedTeamScheme && selectedOppositionScheme && (() => {
                            const matchedScheme = schemes.find(
                              s => s.team_scheme === selectedTeamScheme && s.opposition_scheme === selectedOppositionScheme
                            );

                            if (!matchedScheme) {
                              return (
                                <div className="py-8">
                                  <p className="text-center text-muted-foreground">
                                    No scheme data available for this combination yet.
                                  </p>
                                </div>
                              );
                            }

                            // Helper function to parse bullet points
                            const parseBulletPoints = (text: string | null): string[] => {
                              if (!text) return [];
                              return text.split('\n')
                                .map(line => line.trim())
                                .filter(line => line.length > 0)
                                .map(line => line.replace(/^[•\-*]\s*/, '')); // Remove bullet characters
                            };

                            return (
                              <div className="border rounded-lg p-6">
                                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-4">
                                  {matchedScheme.team_scheme} vs {matchedScheme.opposition_scheme}
                                </h3>
                                
                                <Accordion type="multiple" className="w-full">
                                  {matchedScheme.defensive_transition && (
                                    <AccordionItem value="defensive-transition">
                                      <AccordionTrigger className="text-lg font-semibold">
                                        Defensive Transition
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {parseBulletPoints(matchedScheme.defensive_transition).map((point, index) => (
                                            <div key={index} className="bg-muted/50 border border-border rounded-lg p-3 hover:bg-muted/70 transition-colors">
                                              <div className="flex gap-2">
                                                <span className="text-accent font-semibold mt-0.5">•</span>
                                                <p className="text-muted-foreground flex-1">{point}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}
                                  
                                  {matchedScheme.defence && (
                                    <AccordionItem value="defence">
                                      <AccordionTrigger className="text-lg font-semibold">
                                        Defence
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {parseBulletPoints(matchedScheme.defence).map((point, index) => (
                                            <div key={index} className="bg-muted/50 border border-border rounded-lg p-3 hover:bg-muted/70 transition-colors">
                                              <div className="flex gap-2">
                                                <span className="text-accent font-semibold mt-0.5">•</span>
                                                <p className="text-muted-foreground flex-1">{point}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}
                                  
                                  {matchedScheme.offensive_transition && (
                                    <AccordionItem value="offensive-transition">
                                      <AccordionTrigger className="text-lg font-semibold">
                                        Offensive Transition
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {parseBulletPoints(matchedScheme.offensive_transition).map((point, index) => (
                                            <div key={index} className="bg-muted/50 border border-border rounded-lg p-3 hover:bg-muted/70 transition-colors">
                                              <div className="flex gap-2">
                                                <span className="text-accent font-semibold mt-0.5">•</span>
                                                <p className="text-muted-foreground flex-1">{point}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}
                                  
                                  {matchedScheme.offence && (
                                    <AccordionItem value="offence">
                                      <AccordionTrigger className="text-lg font-semibold">
                                        In Possession
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {parseBulletPoints(matchedScheme.offence).map((point, index) => (
                                            <div key={index} className="bg-muted/50 border border-border rounded-lg p-3 hover:bg-muted/70 transition-colors">
                                              <div className="flex gap-2">
                                                <span className="text-accent font-semibold mt-0.5">•</span>
                                                <p className="text-muted-foreground flex-1">{point}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}
                                </Accordion>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="positional-guides">
                  <PlayerPositionalGuides />
                </TabsContent>

                <TabsContent value="cognisance">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Cognisance
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4 py-8">
                      <CognisanceSection 
                        playerId={playerData?.id || ""} 
                        playerPosition={playerData?.position}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="form">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Form
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4 pt-6">
                      {/* Metric Selector */}
                      <div className="mb-6 container mx-auto px-4">
                        <Select value={selectedFormMetric} onValueChange={setSelectedFormMetric}>
                          <SelectTrigger className="w-[200px] bg-background/80 border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border z-50">
                            {(() => {
                              // Helper function to check if any analysis has data for a metric
                              const hasMetricData = (metricKey: string, statKey?: string) => {
                                if (metricKey === "r90") {
                                  return analyses.some(a => a.r90_score != null);
                                }
                                // Special case for ratio metrics
                                if (metricKey === "ppturnoversratio") {
                                  return analyses.some(a => 
                                    a.striker_stats && 
                                    a.striker_stats.progressive_passes_adj_per90 != null && 
                                    a.striker_stats.turnovers_adj_per90 != null &&
                                    Number(a.striker_stats.turnovers_adj_per90) !== 0
                                  );
                                }
                                return analyses.some(a => 
                                  a.striker_stats && 
                                  statKey && 
                                  a.striker_stats[statKey] != null && 
                                  a.striker_stats[statKey] !== ''
                                );
                              };

                              const availableMetrics = [
                                { value: "r90", label: "R90 Score", statKey: undefined },
                                { value: "xg", label: "Expected Goals (xG)", statKey: "xG_adj_per90" },
                                { value: "xa", label: "Expected Assists (xA)", statKey: "xA_adj_per90" },
                                { value: "regains", label: "Regains", statKey: "regains_adj_per90" },
                                { value: "interceptions", label: "Interceptions", statKey: "interceptions_per90" },
                                { value: "xgchain", label: "xG Chain", statKey: "xGChain_per90" },
                                { value: "xgbuildup", label: "xG Buildup", statKey: "xGBuildup_per90" },
                                { value: "progressivepasses", label: "Progressive Passes", statKey: "progressive_passes_adj_per90" },
                                { value: "ppturnoversratio", label: "Progressive Passes/Turnovers Ratio", statKey: "progressive_passes,turnovers" },
                                { value: "shots", label: "Shots", statKey: "Shots_per90" },
                                { value: "shotsontarget", label: "Shots on Target", statKey: "ShotsOnTarget_per90" },
                                { value: "triplethreatxc", label: "Triple Threat xC", statKey: "triple_threat_xC_per90" },
                                { value: "movementtofeetxc", label: "Movement to Feet xC", statKey: "movement_to_feet_xC_per90" },
                                { value: "movementinbehindxc", label: "Movement in Behind xC", statKey: "movement_in_behind_xC_per90" },
                                { value: "movementdownsidexc", label: "Movement Down Side xC", statKey: "movement_down_side_xC_per90" },
                                { value: "crossingmovementxc", label: "Crossing Movement xC", statKey: "crossing_movement_xC_per90" },
                              ];

                              return availableMetrics
                                .filter(metric => hasMetricData(metric.value, metric.statKey))
                                .map(metric => (
                                  <SelectItem key={metric.value} value={metric.value}>
                                    {metric.label}
                                  </SelectItem>
                                ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(() => {
                        // Get metric value based on selected metric
                        const getMetricValue = (analysis: any) => {
                          if (selectedFormMetric === "r90") return analysis.r90_score;
                          if (!analysis.striker_stats) return null;
                          
                          // Special case for progressive passes to turnovers ratio
                          if (selectedFormMetric === "ppturnoversratio") {
                            const pp = analysis.striker_stats.progressive_passes_adj_per90;
                            const to = analysis.striker_stats.turnovers_adj_per90;
                            if (pp != null && to != null && Number(to) !== 0) {
                              return Number(pp) / Number(to);
                            }
                            return null;
                          }
                          
                          const statKey = selectedFormMetric === "xg" ? "xG_adj_per90" :
                                          selectedFormMetric === "xa" ? "xA_adj_per90" :
                                          selectedFormMetric === "regains" ? "regains_adj_per90" :
                                          selectedFormMetric === "interceptions" ? "interceptions_per90" :
                                          selectedFormMetric === "xgchain" ? "xGChain_per90" :
                                          selectedFormMetric === "xgbuildup" ? "xGBuildup_per90" :
                                          selectedFormMetric === "progressivepasses" ? "progressive_passes_adj_per90" :
                                          selectedFormMetric === "shots" ? "Shots_per90" :
                                          selectedFormMetric === "shotsontarget" ? "ShotsOnTarget_per90" :
                                          selectedFormMetric === "triplethreatxc" ? "triple_threat_xC_per90" :
                                          selectedFormMetric === "movementtofeetxc" ? "movement_to_feet_xC_per90" :
                                          selectedFormMetric === "movementinbehindxc" ? "movement_in_behind_xC_per90" :
                                          selectedFormMetric === "movementdownsidexc" ? "movement_down_side_xC_per90" :
                                          selectedFormMetric === "crossingmovementxc" ? "crossing_movement_xC_per90" : null;
                          
                          return statKey ? analysis.striker_stats[statKey] : null;
                        };
                        
                        // Get metric label
                        const getMetricLabel = () => {
                          switch(selectedFormMetric) {
                            case "r90": return "R90";
                            case "xg": return "xG";
                            case "xa": return "xA";
                            case "regains": return "Regains";
                            case "interceptions": return "Interceptions";
                            case "xgchain": return "xGChain";
                            case "xgbuildup": return "xGBuildup";
                            case "progressivepasses": return "Progressive Passes";
                            case "ppturnoversratio": return "PP/TO Ratio";
                            case "shots": return "Shots";
                            case "shotsontarget": return "Shots on Target";
                            case "triplethreatxc": return "Triple Threat xC";
                            case "movementtofeetxc": return "Movement to Feet xC";
                            case "movementinbehindxc": return "Movement in Behind xC";
                            case "movementdownsidexc": return "Movement Down Side xC";
                            case "crossingmovementxc": return "Crossing Movement xC";
                            default: return "R90";
                          }
                        };
                        
                        // Process chart data
                        const chartData = analyses
                          .map(a => ({ ...a, metricValue: getMetricValue(a) }))
                          .filter(a => a.metricValue != null)
                          .sort((a, b) => new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime())
                          .slice(-8)
                          .map(a => ({
                            opponent: a.opponent || "Unknown",
                            score: a.metricValue!,
                            result: a.result || "",
                            displayLabel: `${a.opponent || "Unknown"}${a.result ? ` (${a.result})` : ""}`,
                            analysisId: a.id,
                            minutesPlayed: a.minutes_played,
                            strikerStats: (a as any).striker_stats
                          }));

                        // Calculate max Y-axis value - dynamic based on metric
                        const maxScore = chartData.length > 0 
                          ? Math.ceil(Math.max(...chartData.map(d => d.score)) * 1.1) // 10% padding
                          : 4;

                        // Function to get grade boundaries for reference lines
                        const getGradeBoundaries = () => {
                          switch(selectedFormMetric) {
                            case "r90":
                              return [
                                { value: 0, grade: 'U', color: 'hsl(0, 84%, 30%)' },
                                { value: 0.2, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                                { value: 0.4, grade: 'C-', color: 'hsl(0, 84%, 60%)' },
                                { value: 0.6, grade: 'C', color: 'hsl(25, 75%, 45%)' },
                                { value: 0.8, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                                { value: 1.0, grade: 'B-', color: 'hsl(60, 70%, 50%)' },
                                { value: 1.2, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                                { value: 1.4, grade: 'B+', color: 'hsl(142, 70%, 40%)' },
                                { value: 1.6, grade: 'A-', color: 'hsl(142, 65%, 45%)' },
                                { value: 1.8, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                                { value: 2.0, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                              ];
                            case "xg":
                              return [
                                { value: 0.05, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                                { value: 0.1, grade: 'C-', color: 'hsl(0, 84%, 60%)' },
                                { value: 0.15, grade: 'C', color: 'hsl(25, 75%, 45%)' },
                                { value: 0.2, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                                { value: 0.3, grade: 'B-', color: 'hsl(60, 70%, 50%)' },
                                { value: 0.35, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                                { value: 0.4, grade: 'B+', color: 'hsl(142, 70%, 40%)' },
                                { value: 0.5, grade: 'A-', color: 'hsl(142, 65%, 45%)' },
                                { value: 0.75, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                                { value: 1.0, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                              ];
                            case "xa":
                              return [
                                { value: 0.04, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                                { value: 0.08, grade: 'C-', color: 'hsl(0, 84%, 60%)' },
                                { value: 0.13, grade: 'C', color: 'hsl(25, 75%, 45%)' },
                                { value: 0.18, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                                { value: 0.25, grade: 'B-', color: 'hsl(60, 70%, 50%)' },
                                { value: 0.3, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                                { value: 0.4, grade: 'B+', color: 'hsl(142, 70%, 40%)' },
                                { value: 0.5, grade: 'A-', color: 'hsl(142, 65%, 45%)' },
                                { value: 0.6, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                                { value: 0.75, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                              ];
                            case "regains":
                              return [
                                { value: 1, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                                { value: 2, grade: 'C-', color: 'hsl(0, 84%, 60%)' },
                                { value: 3, grade: 'C', color: 'hsl(25, 75%, 45%)' },
                                { value: 4, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                                { value: 5, grade: 'B-', color: 'hsl(60, 70%, 50%)' },
                                { value: 6, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                                { value: 7, grade: 'B+', color: 'hsl(142, 70%, 40%)' },
                                { value: 8, grade: 'A-', color: 'hsl(142, 65%, 45%)' },
                                { value: 9, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                                { value: 10, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                              ];
                            case "interceptions":
                              return [
                                { value: 0, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                                { value: 1, grade: 'C-', color: 'hsl(0, 84%, 60%)' },
                                { value: 2, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                                { value: 3, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                                { value: 4, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                                { value: 5, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                              ];
                            case "xgchain":
                              return [
                                { value: 0.4, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                                { value: 0.6, grade: 'C-', color: 'hsl(0, 84%, 60%)' },
                                { value: 0.8, grade: 'C', color: 'hsl(25, 75%, 45%)' },
                                { value: 1.0, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                                { value: 1.2, grade: 'B-', color: 'hsl(60, 70%, 50%)' },
                                { value: 1.4, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                                { value: 1.6, grade: 'B+', color: 'hsl(142, 70%, 40%)' },
                                { value: 1.8, grade: 'A-', color: 'hsl(142, 65%, 45%)' },
                                { value: 2.2, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                                { value: 2.5, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                                { value: 3.0, grade: 'A*', color: 'hsl(43, 96%, 56%)' },
                              ];
                            case "progressivepasses":
                              return [
                                { value: 0, grade: 'U', color: 'hsl(0, 84%, 30%)' },
                                { value: 1, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                                { value: 2, grade: 'C', color: 'hsl(25, 75%, 45%)' },
                                { value: 3, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                                { value: 4, grade: 'B-', color: 'hsl(60, 70%, 50%)' },
                                { value: 5, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                                { value: 7, grade: 'B+', color: 'hsl(142, 70%, 40%)' },
                                { value: 8, grade: 'A-', color: 'hsl(142, 65%, 45%)' },
                                { value: 9, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                                { value: 10, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                              { value: 12, grade: 'A*', color: 'hsl(43, 96%, 56%)' },
                            ];
                          case "ppturnoversratio":
                            return [
                              { value: 0.5, grade: 'D', color: 'hsl(0, 84%, 45%)' },
                              { value: 0.75, grade: 'C-', color: 'hsl(0, 84%, 60%)' },
                              { value: 1, grade: 'C', color: 'hsl(25, 75%, 45%)' },
                              { value: 1.25, grade: 'C+', color: 'hsl(40, 85%, 50%)' },
                              { value: 1.5, grade: 'B-', color: 'hsl(60, 70%, 50%)' },
                              { value: 1.75, grade: 'B', color: 'hsl(142, 76%, 36%)' },
                              { value: 2, grade: 'B+', color: 'hsl(142, 70%, 40%)' },
                              { value: 2.5, grade: 'A-', color: 'hsl(142, 65%, 45%)' },
                              { value: 3, grade: 'A', color: 'hsl(142, 70%, 50%)' },
                              { value: 3.5, grade: 'A+', color: 'hsl(142, 76%, 55%)' },
                              { value: 4, grade: 'A*', color: 'hsl(43, 96%, 56%)' },
                            ];
                          default:
                              return [];
                          }
                        };

                        // Function to get color based on metric and score
                        const getMetricColor = (score: number) => {
                          // Striker/Winger xC metrics use grey
                          const strikerMetrics = ["triplethreatxc", "movementtofeetxc", "movementinbehindxc", "movementdownsidexc", "crossingmovementxc"];
                          if (strikerMetrics.includes(selectedFormMetric)) {
                            return "hsl(var(--muted-foreground))";
                          }
                          
                          switch(selectedFormMetric) {
                            case "r90":
                              return getR90Grade(score).color;
                            case "xg":
                              return getXGGrade(score).color;
                            case "xa":
                              return getXAGrade(score).color;
                            case "regains":
                              return getRegainsGrade(score).color;
                            case "interceptions":
                              return getInterceptionsGrade(score).color;
                            case "xgchain":
                              return getXGChainGrade(score).color;
                            case "progressivepasses":
                              return getProgressivePassesGrade(score).color;
                            case "ppturnoversratio":
                              return getPPTurnoversRatioGrade(score).color;
                            default:
                              return getR90Grade(score).color;
                          }
                        };

                        // Function to get grade based on metric and score
                        const getMetricGrade = (score: number) => {
                          // Striker/Winger xC metrics show the score value, not a grade
                          const strikerMetrics = ["triplethreatxc", "movementtofeetxc", "movementinbehindxc", "movementdownsidexc", "crossingmovementxc"];
                          if (strikerMetrics.includes(selectedFormMetric)) {
                            return score.toFixed(3);
                          }
                          
                          switch(selectedFormMetric) {
                            case "r90":
                              return getR90Grade(score).grade;
                            case "xg":
                              return getXGGrade(score).grade;
                            case "xa":
                              return getXAGrade(score).grade;
                            case "regains":
                              return getRegainsGrade(score).grade;
                            case "interceptions":
                              return getInterceptionsGrade(score).grade;
                            case "xgchain":
                              return getXGChainGrade(score).grade;
                            case "progressivepasses":
                              return getProgressivePassesGrade(score).grade;
                            case "ppturnoversratio":
                              return getPPTurnoversRatioGrade(score).grade;
                            default:
                              return score.toFixed(2);
                          }
                        };
                        
                        // Calculate average for striker metrics
                        const strikerMetrics = ["triplethreatxc", "movementtofeetxc", "movementinbehindxc", "movementdownsidexc", "crossingmovementxc"];
                        const isStrikerMetric = strikerMetrics.includes(selectedFormMetric);
                        const averageValue = isStrikerMetric && chartData.length > 0 
                          ? chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length 
                          : null;

                        return chartData.length > 0 ? (
                          <div className="w-full px-2 -ml-6">
                            <ResponsiveContainer width="100%" height={550}>
                              <BarChart data={chartData} margin={{ bottom: 25, left: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis 
                                  dataKey="opponent"
                                  stroke="hsl(var(--muted-foreground))"
                                  fontSize={10}
                                  height={160}
                                  interval={0}
                                  tick={(props) => {
                                    const { x, y, payload } = props;
                                    const data = chartData.find(d => d.opponent === payload.value);
                                    return (
                                      <g transform={`translate(${x},${y})`}>
                                        <text 
                                          x={0} 
                                          y={0} 
                                          dy={16} 
                                          textAnchor="middle" 
                                          fill="white"
                                          fontSize={12}
                                          fontWeight="bold"
                                        >
                                          {data?.result || ''}
                                        </text>
                                        <text 
                                          x={0} 
                                          y={30} 
                                          dy={16} 
                                          textAnchor="end"
                                          fill="hsl(var(--muted-foreground))"
                                          fontSize={10}
                                          transform={`rotate(-90, 0, 46)`}
                                        >
                                          {payload.value}
                                        </text>
                                      </g>
                                    );
                                  }}
                                />
                                <YAxis 
                                  stroke="hsl(var(--muted-foreground))"
                                  fontSize={12}
                                  domain={[0, maxScore]}
                                  ticks={Array.from({ length: maxScore + 1 }, (_, i) => i)}
                                />
                                <RechartsTooltip 
                                  labelFormatter={() => ""}
                                  separator=""
                                  contentStyle={{
                                    backgroundColor: "#000000",
                                    border: "2px solid hsl(43, 49%, 61%)",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    color: "#ffffff"
                                  }}
                                  itemStyle={{
                                    color: "#ffffff"
                                  }}
                                   formatter={(value: any, name: any, props: any) => {
                                    const data = props.payload;
                                    const stats = data.strikerStats;
                                    const metricLabel = getMetricLabel();
                                    return [
                                      <div key="tooltip" className="space-y-2 min-w-[200px]">
                                        <div className="font-bold text-white text-base mb-1">{data.result} {data.opponent}</div>
                                        <div className="text-sm text-white font-bold" style={{ color: getR90Color(data.score) }}>
                                          {metricLabel}: {data.score.toFixed(2)}
                                        </div>
                                        {data.minutesPlayed && (
                                          <div className="text-xs text-white/60">Minutes Played: {data.minutesPlayed}</div>
                                        )}
                                        {stats && selectedFormMetric === "r90" && (
                                          <div className="space-y-1 pt-2 border-t border-white/20">
                                            <div className="text-xs font-semibold text-white/80">Advanced Stats (per 90):</div>
                                            {stats.xG_adj_per90 !== undefined && (
                                              <div className="text-xs text-white/70">xG (adj): {stats.xG_adj_per90.toFixed(2)}</div>
                                            )}
                                            {stats.xA_adj_per90 !== undefined && (
                                              <div className="text-xs text-white/70">xA (adj): {stats.xA_adj_per90.toFixed(2)}</div>
                                            )}
                                            {stats.xGChain_per90 !== undefined && (
                                              <div className="text-xs text-white/70">xGChain: {stats.xGChain_per90.toFixed(2)}</div>
                                            )}
                                            {stats.progressive_passes_adj_per90 !== undefined && (
                                              <div className="text-xs text-white/70">Progressive Passes (adj): {stats.progressive_passes_adj_per90.toFixed(2)}</div>
                                            )}
                                            {stats.interceptions_per90 !== undefined && (
                                              <div className="text-xs text-white/70">Interceptions: {stats.interceptions_per90.toFixed(2)}</div>
                                            )}
                                            {stats.regains_adj_per90 !== undefined && (
                                              <div className="text-xs text-white/70">Regains (adj): {stats.regains_adj_per90.toFixed(2)}</div>
                                            )}
                                            {stats.turnovers_adj_per90 !== undefined && (
                                              <div className="text-xs text-white/70">Turnovers (adj): {stats.turnovers_adj_per90.toFixed(2)}</div>
                                            )}
                                            {stats.movement_in_behind_xC_per90 !== undefined && (
                                              <div className="text-xs text-white/70">Movement In Behind xC: {stats.movement_in_behind_xC_per90.toFixed(2)}</div>
                                            )}
                                            {stats.movement_to_feet_xC_per90 !== undefined && (
                                              <div className="text-xs text-white/70">Movement To Feet xC: {stats.movement_to_feet_xC_per90.toFixed(2)}</div>
                                            )}
                                            {stats.crossing_movement_xC_per90 !== undefined && (
                                              <div className="text-xs text-white/70">Crossing Movement xC: {stats.crossing_movement_xC_per90.toFixed(2)}</div>
                                            )}
                                          </div>
                                        )}
                                      </div>,
                                      ""
                                    ];
                                  }}
                                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                                />
                                {/* Grade boundary reference lines */}
                                {!isStrikerMetric && getGradeBoundaries()
                                  .filter(boundary => boundary.value <= maxScore)
                                  .map((boundary, index) => (
                                    <ReferenceLine
                                      key={`grade-${index}`}
                                      y={boundary.value}
                                      stroke={boundary.color}
                                      strokeDasharray="3 3"
                                      strokeWidth={1}
                                      strokeOpacity={0.4}
                                    />
                                  ))}
                                {/* Average line for striker metrics */}
                                {isStrikerMetric && averageValue !== null && (
                                  <ReferenceLine
                                    y={averageValue}
                                    stroke="hsl(var(--gold))"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    label={{ 
                                      value: `Avg: ${averageValue.toFixed(3)}`, 
                                      position: 'right',
                                      fill: 'hsl(var(--gold))',
                                      fontSize: 12,
                                      fontWeight: 'bold'
                                    }}
                                  />
                                )}
                                <Bar
                                  dataKey="score" 
                                  radius={[8, 8, 0, 0]}
                                >
                                  {chartData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={getMetricColor(entry.score)}
                                      className="hover:opacity-80 transition-opacity"
                                    />
                                  ))}
                                  <LabelList 
                                    dataKey="score" 
                                    position="top" 
                                    content={(props: any) => {
                                      const { x, y, width, value } = props;
                                      if (!x || y === undefined || !width || value === undefined) return null;
                                      
                                      // Striker/Winger xC metrics use grey
                                      const strikerMetrics = ["triplethreatxc", "movementtofeetxc", "movementinbehindxc", "movementdownsidexc", "crossingmovementxc"];
                                      const gradeColor = strikerMetrics.includes(selectedFormMetric)
                                        ? "hsl(var(--muted-foreground))"
                                        : getMetricColor(value);
                                      const gradeText = getMetricGrade(value);
                                      
                                      return (
                                        <text
                                          x={x + width / 2}
                                          y={y - 5}
                                          fill={gradeColor}
                                          textAnchor="middle"
                                          dominantBaseline="baseline"
                                          fontSize="14"
                                          fontWeight="700"
                                        >
                                          {gradeText}
                                        </text>
                                      );
                                    }}
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            No performance data available yet.
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="other">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Other Analysis
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4 space-y-3 md:space-y-4">
                      {otherAnalyses.length === 0 ? (
                        <div className="py-8">
                          <p className="text-center text-muted-foreground text-sm md:text-base">No other analysis available yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {otherAnalyses.map((item: any) => (
                            <div 
                              key={item.id} 
                              className="border rounded-lg p-3 md:p-4 hover:border-primary transition-colors bg-card"
                            >
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                                <div className="flex-1 w-full">
                                  <h3 className="font-semibold text-base md:text-lg mb-2">{item.analysis.title}</h3>
                                  {item.analysis.category && (
                                    <span className="inline-block px-2 py-1 text-xs rounded bg-primary/10 text-primary">
                                      {item.analysis.category}
                                    </span>
                                  )}
                                </div>
                                {item.analysis.content && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(item.analysis.content);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `${item.analysis.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                        toast.success("PDF downloaded");
                                      } catch (error) {
                                        console.error('Error downloading PDF:', error);
                                        toast.error("Failed to download PDF");
                                      }
                                    }}
                                    className="w-full sm:w-auto flex-shrink-0"
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    <span className="text-xs md:text-sm">Download PDF</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="physical" className="space-y-6">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                <CardHeader marble>
                  <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle className="font-heading tracking-tight">
                      Physical Programming
                    </CardTitle>
                    {programs.filter(p => p.program_name !== 'Testing Protocol').length > 1 && (
                      <Select value={selectedProgramId || undefined} onValueChange={setSelectedProgramId}>
                        <SelectTrigger className="w-full md:w-[250px]">
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.filter(p => p.program_name !== 'Testing Protocol').map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.phase_dates || program.program_name} {program.is_current && "(Current)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="container mx-auto px-4">
                  {/* Programming Notes from Coach */}
                  {playerData?.id && <PlayerProgrammingNotes playerId={playerData.id} />}
                  
                  {programs.filter(p => p.program_name !== 'Testing Protocol').length === 0 ? (
                    <div className="py-8"></div>
                  ) : (
                    <>
                      {programs.filter(p => p.id === selectedProgramId && p.program_name !== 'Testing Protocol').map((program) => {
                        const hasContent = 
                          program.overview_text || 
                          program.phase_image_url || 
                          program.player_image_url ||
                          (program.weekly_schedules && Array.isArray(program.weekly_schedules) && program.weekly_schedules.length > 0) ||
                          program.schedule_notes ||
                          (program.sessions && typeof program.sessions === 'object' && Object.keys(program.sessions).length > 0);

                        return (
                          <div key={program.id}>
                            {!hasContent ? (
                              <div className="p-6 border border-primary/20 rounded-lg bg-accent/10">
                                <p className="text-center text-muted-foreground">
                                  Your coach is currently preparing the details for this program. Check back soon!
                                </p>
                              </div>
                            ) : (
                              <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full">{/* defaultValue="schedule" removed as we're now using controlled state */}
                                {/* Overview Section */}
                                {(program.overview_text || program.phase_image_url || program.player_image_url) && (
                                  <AccordionItem value="overview">
                                    <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline pl-6">
                                      Overview
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pl-6 pr-6">
                                      {program.overview_text && (
                                        <p className="text-base text-muted-foreground whitespace-pre-wrap">{program.overview_text}</p>
                                      )}
                                      
                                      {(program.phase_image_url || program.player_image_url) && (
                                        <div className="grid md:grid-cols-2 gap-4">
                                          {program.phase_image_url && (
                                            <img 
                                              src={program.phase_image_url} 
                                              alt="Phase overview"
                                              className="w-full rounded-lg"
                                            />
                                          )}
                                          {program.player_image_url && (
                                            <img 
                                              src={program.player_image_url} 
                                              alt="Player"
                                              className="w-full rounded-lg"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {/* Schedule Section */}
                                {((program.weekly_schedules && Array.isArray(program.weekly_schedules) && program.weekly_schedules.length > 0) || program.schedule_notes) && (
                                  <AccordionItem value="schedule">
                                    <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline pl-6">
                                      Schedule
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-6 pr-6">
                                      <div className="space-y-6">
                                        {/* Weekly Schedule Table */}
                                        {program.weekly_schedules && Array.isArray(program.weekly_schedules) && program.weekly_schedules.length > 0 && (
                                          <div className="bg-black/40 rounded-xl p-2 md:p-4 overflow-x-auto">
                                            <div>
                                            {/* Table Header */}
                                            <div className="grid grid-cols-8 gap-1 md:gap-2 mb-2">
                                                 <div 
                                                  className="p-1 md:p-4 font-bebas uppercase text-[10px] md:text-lg flex items-center justify-center rounded-lg leading-tight"
                                                  style={{ 
                                                    backgroundColor: 'hsl(43, 49%, 61%)',
                                                    color: 'hsl(0, 0%, 0%)'
                                                  }}
                                                >
                                                  <span className="hidden md:inline text-center w-full">Week Start Date</span>
                                                  <span className="md:hidden text-center w-full">Week Start</span>
                                                </div>
                                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                                                 <div 
                                                  key={day}
                                                  className="p-1 md:p-4 font-bebas uppercase text-xs md:text-lg flex items-center justify-center rounded-lg"
                                                     style={{ 
                                                       backgroundColor: 'hsl(43, 49%, 61%)',
                                                       color: 'hsl(0, 0%, 0%)'
                                                     }}
                                                   >
                                                     <span className="hidden md:inline">
                                                       {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][idx]}
                                                     </span>
                                                     <span className="md:hidden">{day}</span>
                                                   </div>
                                                 ))}
                                               </div>
                                               
                                               {/* Table Rows */}
                                               <div className="space-y-1 md:space-y-2">
                                              {program.weekly_schedules.map((week: any, idx: number) => (
                                                <div 
                                                  key={idx}
                                                  className="grid grid-cols-8 gap-1 md:gap-2"
                                                >
                                                   {/* Week Cell */}
                                                    <div 
                                                      className="p-3 md:p-6 flex flex-col items-center justify-center rounded-lg"
                                                      style={{ 
                                                        backgroundColor: week.week_start_date && (() => {
                                                          const weekStart = parseISO(week.week_start_date);
                                                          const today = new Date();
                                                          const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
                                                          const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
                                                          const isCurrentWeek = isWithinInterval(weekStart, { start: currentWeekStart, end: currentWeekEnd });
                                                          return isCurrentWeek ? 'hsl(43, 49%, 61%)' : 'hsl(0, 0%, 95%)';
                                                        })() || 'hsl(0, 0%, 95%)',
                                                        color: 'hsl(0, 0%, 0%)'
                                                      }}
                                                    >
                                                      {week.week_start_date ? (() => {
                                                        const date = parseISO(week.week_start_date);
                                                        const day = format(date, 'd');
                                                        const suffix = day.endsWith('1') && day !== '11' ? 'st' :
                                                                      day.endsWith('2') && day !== '12' ? 'nd' :
                                                                      day.endsWith('3') && day !== '13' ? 'rd' : 'th';
                                                        return (
                                                           <div className="text-center">
                                                             <div className="text-sm md:text-3xl font-bold mb-1">{day}<sup className="text-[10px] md:text-base">{suffix}</sup></div>
                                                              <div className="text-[8px] md:text-base font-medium italic">
                                                                <span className="md:hidden">{format(date, 'MMM')}</span>
                                                                <span className="hidden md:inline">{format(date, 'MMMM')}</span>
                                                              </div>
                                                           </div>
                                                        );
                                                      })() : <span>{week.week}</span>}
                                                    </div>
                                                  
                                                  {/* Day Cells */}
                                                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, dayIdx) => {
                                                    const sessionValue = week[day] || '';
                                                    const teamSessionValue = week[`${day}Team`] || '';
                                                    const colors = sessionValue ? getSessionColor(sessionValue) : { bg: 'hsl(0, 0%, 10%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 15%)' };
                                                    const weekDates = getWeekDates(week.week_start_date);
                                                    const dayDate = weekDates ? weekDates[day as keyof typeof weekDates] : null;
                                                    const dayImageKey = `${day}Image`;
                                                    const clubLogoUrl = week[dayImageKey];
                                                    const teamImageKey = `${day}TeamImage`;
                                                    const teamImageUrl = week[teamImageKey];
                                                    
                                                    const hasBoth = teamSessionValue && sessionValue;
                                                    const onlyTeam = teamSessionValue && !sessionValue;
                                                    const onlySession = !teamSessionValue && sessionValue;
                                                    
                                                    return (
                                                      <div 
                                                        key={day}
                                                        className={`flex flex-col rounded-lg min-h-[50px] md:min-h-[60px] overflow-hidden transition-all relative ${sessionValue ? 'cursor-pointer hover:scale-105' : ''}`}
                                                        style={{ 
                                                          border: '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}
                                                      >
                                                        {/* Team Session Only - Top 25% only */}
                                                        {onlyTeam && (
                                                          <>
                                                            <div 
                                                              className="flex items-center justify-center px-1 py-0.5 gap-1"
                                                              style={{ 
                                                                height: '25%',
                                                                minHeight: '14px',
                                                                backgroundColor: 'hsl(45, 70%, 25%)',
                                                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                              }}
                                                            >
                                                              {teamImageUrl && (
                                                                <img 
                                                                  src={teamImageUrl} 
                                                                  alt="Team" 
                                                                  className="h-3 md:h-4 w-auto object-contain"
                                                                />
                                                              )}
                                                              <span 
                                                                className="font-medium text-[8px] md:text-[10px] uppercase truncate"
                                                                style={{ color: 'hsl(45, 100%, 80%)' }}
                                                              >
                                                                {teamSessionValue}
                                                              </span>
                                                            </div>
                                                            <div 
                                                              className="flex-1 flex items-center justify-center relative"
                                                              style={{ backgroundColor: 'hsl(0, 0%, 10%)' }}
                                                            >
                                                              {dayDate && (
                                                                <span 
                                                                  className="absolute top-0.5 right-0.5 text-[8px] md:text-xs opacity-50 leading-none z-30"
                                                                  style={{ color: 'hsl(0, 0%, 50%)' }}
                                                                >
                                                                  {format(dayDate, 'd')}
                                                                </span>
                                                              )}
                                                              {clubLogoUrl && (
                                                                <div className="absolute inset-0 flex items-center justify-center p-2 z-0">
                                                                  <img src={clubLogoUrl} alt={`${day} club logo`} className="max-w-full max-h-full object-contain opacity-40" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                                </div>
                                                              )}
                                                            </div>
                                                          </>
                                                        )}
                                                        
                                                        {/* Both Team and Individual Session - Split 25%/75% */}
                                                        {hasBoth && (
                                                          <>
                                                            <div 
                                                              className="flex items-center justify-center px-1 py-0.5 gap-1"
                                                              style={{ 
                                                                height: '25%',
                                                                minHeight: '14px',
                                                                backgroundColor: 'hsl(45, 70%, 25%)',
                                                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                              }}
                                                            >
                                                              {teamImageUrl && (
                                                                <img 
                                                                  src={teamImageUrl} 
                                                                  alt="Team" 
                                                                  className="h-3 md:h-4 w-auto object-contain"
                                                                />
                                                              )}
                                                              <span 
                                                                className="font-medium text-[8px] md:text-[10px] uppercase truncate"
                                                                style={{ color: 'hsl(45, 100%, 80%)' }}
                                                              >
                                                                {teamSessionValue}
                                                              </span>
                                                            </div>
                                                            <div 
                                                              onClick={() => handleSessionClick(sessionValue)}
                                                              className="flex-1 flex items-center justify-center relative cursor-pointer"
                                                              style={{ backgroundColor: colors.bg }}
                                                              onMouseEnter={(e) => {
                                                                if (colors.hover) e.currentTarget.style.backgroundColor = colors.hover;
                                                              }}
                                                              onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = colors.bg;
                                                              }}
                                                            >
                                                              {dayDate && (
                                                                <span className="absolute top-0.5 right-0.5 text-[8px] md:text-xs opacity-50 leading-none z-30" style={{ color: colors.text }}>
                                                                  {format(dayDate, 'd')}
                                                                </span>
                                                              )}
                                                              {clubLogoUrl && (
                                                                <div className="absolute inset-0 flex items-center justify-center p-3 z-0">
                                                                  <img src={clubLogoUrl} alt={`${day} club logo`} className="max-w-full max-h-full object-contain opacity-25" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                                </div>
                                                              )}
                                                              <span className="font-bebas text-base md:text-2xl uppercase font-bold relative z-20" style={{ color: 'hsl(43, 49%, 61%)', textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>
                                                                {sessionValue.toUpperCase()}
                                                              </span>
                                                            </div>
                                                          </>
                                                        )}
                                                        
                                                        {/* Individual Session Only or Empty - Full 100% */}
                                                        {(onlySession || (!teamSessionValue && !sessionValue)) && (
                                                          <div 
                                                            onClick={() => sessionValue && handleSessionClick(sessionValue)}
                                                            className={`flex-1 flex items-center justify-center relative ${sessionValue ? 'cursor-pointer' : ''}`}
                                                            style={{ backgroundColor: colors.bg }}
                                                            onMouseEnter={(e) => {
                                                              if (sessionValue && colors.hover) e.currentTarget.style.backgroundColor = colors.hover;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                              if (sessionValue) e.currentTarget.style.backgroundColor = colors.bg;
                                                            }}
                                                          >
                                                            {dayDate && (
                                                              <span className="absolute top-0.5 right-0.5 text-[8px] md:text-xs opacity-50 leading-none z-30" style={{ color: colors.text }}>
                                                                {format(dayDate, 'd')}
                                                              </span>
                                                            )}
                                                            {clubLogoUrl && (
                                                              <div className="absolute inset-0 flex items-center justify-center p-3 z-0">
                                                                <img src={clubLogoUrl} alt={`${day} club logo`} className="max-w-full max-h-full object-contain opacity-25" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                              </div>
                                                            )}
                                                            {sessionValue && (
                                                              <span className="font-bebas text-base md:text-2xl uppercase font-bold relative z-20" style={{ color: 'hsl(43, 49%, 61%)', textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>
                                                                {sessionValue.toUpperCase()}
                                                              </span>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                   );
                                                 })}
                                               </div>
                                             ))}
                                             </div>
                                             </div>
                                           </div>
                                         )}

                                        {/* Schedule Notes */}
                                        {program.schedule_notes && (
                                          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
                                            <p className="text-base text-foreground/90 leading-relaxed">{program.schedule_notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {/* Sessions Section */}
                                {program.sessions && typeof program.sessions === 'object' && Object.keys(program.sessions).length > 0 && (() => {
                                  // Define all possible sessions A-H
                                  const allSessions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                                  
                                  // Check which sessions have actual exercise data
                                  const hasSessionData = (sessionKey: string) => {
                                    const mainSession = program.sessions[sessionKey] || program.sessions[sessionKey.toLowerCase()];
                                    const preSession = program.sessions[`PRE-${sessionKey}`] || program.sessions[`pre-${sessionKey.toLowerCase()}`];
                                    
                                    const mainHasData = mainSession && mainSession.exercises && Array.isArray(mainSession.exercises) && mainSession.exercises.length > 0;
                                    const preHasData = preSession && preSession.exercises && Array.isArray(preSession.exercises) && preSession.exercises.length > 0;
                                    
                                    return !!(mainHasData || preHasData);
                                  };
                                  
                                  // Find first session with data
                                  const firstSessionWithData = allSessions.find(s => hasSessionData(s)) || 'A';
                                  
                                  return (
                                    <AccordionItem value="sessions">
                                      <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline pl-6">
                                        Sessions
                                      </AccordionTrigger>
                                      <AccordionContent className="pl-6 pr-6">
                                        {/* Main Session Tabs - Two Rows */}
                                        <div className="space-y-2 mb-4">
                                          {/* First Row: A, B, C, D */}
                                           <div className="grid grid-cols-4 gap-2">
                                             {['A', 'B', 'C', 'D'].map((mainKey) => {
                                               const colors = getSessionColor(mainKey);
                                               const hasData = hasSessionData(mainKey);
                                               const isActive = (selectedSession || firstSessionWithData) === mainKey;
                                               return (
                                                 <Button
                                                   key={mainKey}
                                                   onClick={() => hasData && setSelectedSession(mainKey)}
                                                   disabled={!hasData}
                                                   className="font-bebas uppercase text-sm"
                                                   style={{
                                                     backgroundColor: hasData ? colors.bg : 'hsl(0, 0%, 20%)',
                                                     color: hasData ? colors.text : 'hsl(0, 0%, 40%)',
                                                     opacity: hasData ? (isActive ? 1 : 0.7) : 0.3,
                                                     border: isActive ? '2px solid white' : 'none',
                                                     cursor: hasData ? 'pointer' : 'not-allowed',
                                                   }}
                                                 >
                                                   Session {mainKey}
                                                 </Button>
                                               );
                                             })}
                                           </div>
                                           
                                           {/* Second Row: E, F, G, H */}
                                           <div className="grid grid-cols-4 gap-2">
                                             {['E', 'F', 'G', 'H'].map((mainKey) => {
                                               const colors = getSessionColor(mainKey);
                                               const hasData = hasSessionData(mainKey);
                                               const isActive = (selectedSession || firstSessionWithData) === mainKey;
                                               return (
                                                 <Button
                                                   key={mainKey}
                                                   onClick={() => hasData && setSelectedSession(mainKey)}
                                                   disabled={!hasData}
                                                   className="font-bebas uppercase text-sm"
                                                   style={{
                                                     backgroundColor: hasData ? colors.bg : 'hsl(0, 0%, 20%)',
                                                     color: hasData ? colors.text : 'hsl(0, 0%, 40%)',
                                                     opacity: hasData ? (isActive ? 1 : 0.7) : 0.3,
                                                     border: isActive ? '2px solid white' : 'none',
                                                     cursor: hasData ? 'pointer' : 'not-allowed',
                                                   }}
                                                 >
                                                   Session {mainKey}
                                                 </Button>
                                               );
                                             })}
                                           </div>
                                        </div>
                                        
                                        {/* Main Session Content with Sub-tabs */}
                                        {allSessions.map((mainKey) => {
                                            const preKey = `PRE-${mainKey}`;
                                            const preSessionData = program.sessions[preKey] || program.sessions[preKey.toLowerCase()];
                                            const mainSession = program.sessions[mainKey] || program.sessions[mainKey.toLowerCase()];
                                            
                                            // Check if sessions have actual exercise data
                                            const hasPreSession = preSessionData && preSessionData.exercises && Array.isArray(preSessionData.exercises) && preSessionData.exercises.length > 0;
                                            const hasMainSession = mainSession && mainSession.exercises && Array.isArray(mainSession.exercises) && mainSession.exercises.length > 0;
                                            
                                          // Only render content if there's data for this session and it's selected
                                          if (!hasPreSession && !hasMainSession) return null;
                                          if ((selectedSession || firstSessionWithData) !== mainKey) return null;
                                          
                                           return (
                                             <div key={mainKey} id={`session-${mainKey}`} className="mt-4">
                                                 <Tabs defaultValue={hasPreSession ? "pre" : "main"} className="w-full">
                                                    {/* Sub-tabs for Pre and Main Session */}
                                                     <TabsList className="grid w-full gap-2 grid-cols-2 mb-4 bg-transparent p-0">
                                                         {hasPreSession && (
                                                           <TabsTrigger
                                                             value="pre"
                                                             className="font-bebas uppercase text-sm transition-all data-[state=active]:!bg-[hsl(43,49%,61%)] data-[state=active]:!text-black"
                                                             style={{
                                                               backgroundColor: getSessionColor(preKey).bg,
                                                               color: getSessionColor(preKey).text,
                                                             } as React.CSSProperties}
                                                           >
                                                             Pre-{mainKey}
                                                           </TabsTrigger>
                                                         )}
                                                         {hasMainSession && (
                                                           <TabsTrigger
                                                             value="main"
                                                             className="font-bebas uppercase text-sm transition-all data-[state=active]:!bg-[hsl(43,49%,61%)] data-[state=active]:!text-black"
                                                             style={{
                                                               backgroundColor: getSessionColor(mainKey).bg,
                                                               color: getSessionColor(mainKey).text,
                                                             } as React.CSSProperties}
                                                           >
                                                             Session {mainKey}
                                                           </TabsTrigger>
                                                         )}
                                                    </TabsList>
                                                  
                                                   {/* Pre Session Content */}
                                                   {hasPreSession && (
                                                     <TabsContent value="pre">
                                                       {preSessionData.exercises && Array.isArray(preSessionData.exercises) && preSessionData.exercises.length > 0 && (
                                                        <div className="space-y-4">
                                                           {/* Exercise Table */}
                                                          <div className="border-2 border-white rounded-lg overflow-hidden">
                                                            <div 
                                                              className="grid grid-cols-5 gap-0 text-xs md:text-base"
                                                            >
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Exercise Name
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Reps
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Sets
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Load
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                <span className="hidden md:inline">Recovery Time</span>
                                                                <span className="md:hidden">Recovery</span>
                                                              </div>
                                                            </div>
                                                            
                                                             <div>
                                                               {preSessionData.exercises.map((exercise: any, idx: number) => (
                                                                <div 
                                                                  key={idx}
                                                                  onClick={() => handleExerciseClick(exercise)}
                                                                  className="grid grid-cols-5 gap-0 border-t-2 border-white cursor-pointer hover:opacity-80 transition-opacity min-h-[60px] md:min-h-[80px]"
                                                                >
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm font-medium border-r-2 border-white flex items-center justify-center text-center break-words"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(45, 40%, 80%)',
                                                                      color: 'hsl(0, 0%, 0%)'
                                                                    }}
                                                                  >
                                                                    {exercise.name || exercise}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.reps || exercise.repetitions || '-'}
                                                                  </div>
                                                                  <div
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.sets || '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.load && exercise.load !== "'-" ? exercise.load : '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.rest || exercise.recoveryTime || exercise.recovery_time || '-'}
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </TabsContent>
                                                  )}
                                                  
                                                   {/* Main Session Content */}
                                                   {hasMainSession && (
                                                     <TabsContent value="main">
                                                       {mainSession.exercises && Array.isArray(mainSession.exercises) && mainSession.exercises.length > 0 && (
                                                        <div className="space-y-4">
                                                          {/* Exercise Table */}
                                                          <div className="border-2 border-white rounded-lg overflow-hidden">
                                                            <div 
                                                              className="grid grid-cols-5 gap-0 text-xs md:text-base"
                                                            >
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Exercise Name
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Reps
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Sets
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Load
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase text-center flex items-center justify-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                <span className="hidden md:inline">Recovery Time</span>
                                                                <span className="md:hidden">Recovery</span>
                                                              </div>
                                                            </div>
                                                            
                                                            <div>
                                                              {mainSession.exercises.map((exercise: any, idx: number) => (
                                                                <div 
                                                                  key={idx}
                                                                  onClick={() => handleExerciseClick(exercise)}
                                                                  className="grid grid-cols-5 gap-0 border-t-2 border-white cursor-pointer hover:opacity-80 transition-opacity min-h-[60px] md:min-h-[80px]"
                                                                >
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm font-medium border-r-2 border-white flex items-center justify-center text-center break-words"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(45, 40%, 80%)',
                                                                      color: 'hsl(0, 0%, 0%)'
                                                                    }}
                                                                  >
                                                                    {exercise.name || exercise}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.reps || exercise.repetitions || '-'}
                                                                  </div>
                                                                  <div
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.sets || '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.load && exercise.load !== "'-" ? exercise.load : '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.rest || exercise.recoveryTime || exercise.recovery_time || '-'}
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </TabsContent>
                                                  )}
                                                </Tabs>
                                              </div>
                                            );
                                          })}
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })()}

                                {/* Testing Section */}
                                {(() => {
                                  const testingProgram = programs.find(p => p.program_name === 'Testing Protocol');
                                  const testingCategories = ['Strength', 'Power', 'Speed', 'Conditioning'];
                                  
                                  if (!testingProgram?.sessions) return null;
                                  
                                  return (
                                    <AccordionItem value="testing">
                                      <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline pl-6">
                                        Testing
                                      </AccordionTrigger>
                                      <AccordionContent className="pl-6 pr-6 space-y-6">
                                        {/* History Button */}
                                        <div className="flex justify-end mb-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setTestHistoryOpen(true)}
                                            className="gap-2"
                                          >
                                            <Calendar className="w-4 h-4" />
                                            View Previous Results
                                          </Button>
                                        </div>
                                        
                                        {testingProgram.overview_text && (
                                          <p className="text-sm text-muted-foreground mb-4">{testingProgram.overview_text}</p>
                                        )}
                                        {testingCategories.map((category) => {
                                          const tests = testingProgram.sessions[category];
                                          if (!tests || tests.length === 0) return null;
                                          
                                          return (
                                            <div key={category} className="space-y-3">
                                              <h4 className="font-bebas text-lg uppercase tracking-wider text-primary border-b border-primary/30 pb-1">
                                                {category}
                                              </h4>
                                              <div className="space-y-2">
                                                {tests.map((test: any, idx: number) => {
                                                  // Find latest score for this test
                                                  const latestResult = testResults.find(
                                                    r => r.test_name === test.name && r.test_category === category
                                                  );
                                                  
                                                  return (
                                                    <div 
                                                      key={idx}
                                                      onClick={() => handleTestClick(test, category)}
                                                      className="bg-secondary/30 rounded-lg p-3 hover:bg-secondary/50 transition-colors cursor-pointer group"
                                                    >
                                                      <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                          <span className="font-medium group-hover:text-primary transition-colors">{test.name}</span>
                                                          {latestResult && (
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                                                Latest: {latestResult.score}
                                                              </span>
                                                              {latestResult.status === 'draft' && (
                                                                <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                                                                  Draft
                                                                </span>
                                                              )}
                                                              <span className="text-xs text-muted-foreground">
                                                                ({format(new Date(latestResult.test_date), 'dd MMM yyyy')})
                                                              </span>
                                                            </div>
                                                          )}
                                                        </div>
                                                        <div className="text-right text-sm">
                                                          {test.sets && <span className="text-muted-foreground">{test.sets}x </span>}
                                                          <span className="font-medium text-primary">{test.reps}</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })()}
                              </Accordion>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0">
                <CardContent className="container mx-auto px-4 pt-2">
                  <Tabs defaultValue="invoices" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 mb-0 bg-muted h-auto p-2">
                  <TabsTrigger value="invoices" className="font-bebas uppercase text-sm sm:text-base">
                    Invoices
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="font-bebas uppercase text-sm sm:text-base">
                    Make Payment
                  </TabsTrigger>
                  <TabsTrigger value="contracts" className="font-bebas uppercase text-sm sm:text-base">
                    Contracts
                  </TabsTrigger>
                  <TabsTrigger value="other" className="font-bebas uppercase text-sm sm:text-base">
                    Other
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="invoices">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Invoices
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4">
                      {/* Outstanding Summary */}
                      {invoices.length > 0 && invoices.some(inv => inv.status === 'pending' || inv.status === 'overdue') && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outstanding</p>
                          <p className="text-xl font-bold text-amber-500">
                            {(() => {
                              const outstanding = invoices
                                .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
                                .reduce((sum, inv) => {
                                  const remaining = (inv.converted_amount || inv.amount) - (inv.amount_paid || 0);
                                  return sum + Math.max(0, remaining);
                                }, 0);
                              const currency = invoices.find(inv => inv.converted_currency)?.converted_currency || 
                                               invoices[0]?.currency || 'GBP';
                              return `${outstanding.toFixed(2)} ${currency}`;
                            })()}
                          </p>
                        </div>
                      )}

                      {invoices.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          No invoices available yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Outstanding invoices first */}
                          {invoices
                            .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
                            .map((invoice) => {
                              const remaining = invoice.amount - (invoice.amount_paid || 0);
                              const isPartiallyPaid = (invoice.amount_paid || 0) > 0 && remaining > 0;
                              const getStatusColor = (status: string) => {
                                switch (status) {
                                  case 'paid':
                                    return 'bg-green-500/10 text-green-500 border-green-500/20';
                                  case 'pending':
                                    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                                  case 'overdue':
                                    return 'bg-red-500/10 text-red-500 border-red-500/20';
                                  case 'cancelled':
                                    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
                                  default:
                                    return 'bg-muted text-muted-foreground';
                                }
                              };

                              return (
                                <div 
                                  key={invoice.id}
                                  className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-4 hover:border-primary transition-colors bg-card gap-4"
                                >
                                  <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                                    <div className="flex flex-col">
                                      <span className="font-mono text-sm font-medium">
                                        {invoice.invoice_number}
                                      </span>
                                      {invoice.billing_month && (
                                        <span className="text-xs text-primary font-medium">
                                          {invoice.billing_month}
                                        </span>
                                      )}
                                      {invoice.description && (
                                        <span className="text-xs text-muted-foreground">
                                          {invoice.description}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                      <span className="text-sm text-muted-foreground">
                                        Due: {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <div className="flex flex-col">
                                        <span className="text-lg font-bold">
                                          {invoice.converted_amount 
                                            ? `${invoice.converted_amount.toFixed(2)} ${invoice.converted_currency}`
                                            : `${invoice.amount.toFixed(2)} ${invoice.currency}`
                                          }
                                        </span>
                                        {isPartiallyPaid && (
                                          <span className="text-xs text-primary">
                                            {(invoice.amount_paid || 0).toFixed(2)} paid
                                          </span>
                                        )}
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase border ${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                      </span>
                                    </div>
                                  </div>

                                  {invoice.pdf_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(invoice.pdf_url!, '_blank')}
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      View PDF
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          
                          {/* Paid invoices */}
                          {invoices
                            .filter(inv => inv.status === 'paid')
                            .map((invoice) => {
                              const getStatusColor = (status: string) => {
                                switch (status) {
                                  case 'paid':
                                    return 'bg-green-500/10 text-green-500 border-green-500/20';
                                  default:
                                    return 'bg-muted text-muted-foreground';
                                }
                              };

                              return (
                                <div 
                                  key={invoice.id}
                                  className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-4 hover:border-primary transition-colors bg-card gap-4 opacity-70"
                                >
                                  <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                                    <div className="flex flex-col">
                                      <span className="font-mono text-sm font-medium">
                                        {invoice.invoice_number}
                                      </span>
                                      {invoice.billing_month && (
                                        <span className="text-xs text-primary font-medium">
                                          {invoice.billing_month}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <span className="text-lg font-bold">
                                        {invoice.converted_amount 
                                          ? `${invoice.converted_amount.toFixed(2)} ${invoice.converted_currency}`
                                          : `${invoice.amount.toFixed(2)} ${invoice.currency}`
                                        }
                                      </span>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase border ${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                      </span>
                                    </div>
                                  </div>

                                  {invoice.pdf_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(invoice.pdf_url!, '_blank')}
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      View PDF
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payment">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Make a Payment
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4">
                      <PaymentOptions />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contracts">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight flex items-center gap-2">
                          <Lock className="h-5 w-5" />
                          Contracts
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4">
                      {playerData?.id ? (
                        <ProtectedContracts playerId={playerData.id} />
                      ) : (
                        <div className="py-8 flex justify-center">
                          <LoadingSpinner size="md" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="other">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          Other Documents
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4">
                      <div className="py-8 text-center text-muted-foreground">
                        No other documents available yet.
                      </div>
                    </CardContent>
                  </Card>
                  </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="highlights">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0">
                <CardContent className="container mx-auto px-4 pt-2">
                  <Tabs defaultValue="best" className="w-full" key="highlights-tabs">
                    <TabsList className="grid w-full grid-cols-2 gap-2 mb-2 bg-muted h-auto p-2">
                      <TabsTrigger value="match" className="font-bebas uppercase">
                        Match Highlights
                      </TabsTrigger>
                      <TabsTrigger value="best" className="font-bebas uppercase">
                        Best Clips
                      </TabsTrigger>
                    </TabsList>
                        
                        <TabsContent value="match">
                          {!highlightsData.matchHighlights || highlightsData.matchHighlights.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                              No match highlights available yet.
                            </div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              {highlightsData.matchHighlights?.map((highlight: any, index: number) => (
                                <div 
                                  key={index}
                                  className="border rounded-lg overflow-hidden hover:border-primary transition-colors bg-card"
                                >
                                  {highlight.clubLogo && (
                                    <div className="relative aspect-video bg-black">
                                      <img 
                                        src={highlight.clubLogo} 
                                        alt={highlight.name || `Highlight ${index + 1}`}
                                        className="w-full h-full object-contain p-8"
                                      />
                                    </div>
                                  )}
                                   <div className="p-4 space-y-3">
                                     <div className="flex items-start gap-3">
                                       <span className="text-2xl font-bold text-primary">{index + 1}</span>
                                       <div className="flex-1">
                                         <h3 className="font-bebas text-xl uppercase tracking-wider">
                                           {highlight.name || `Match Highlight ${index + 1}`}
                                         </h3>
                                       </div>
                                     </div>
                                     <div className="flex gap-2">
                                      {highlight.videoUrl && (
                                        <>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => window.open(highlight.videoUrl, '_blank')}
                                            className="flex-1"
                                          >
                                            <Play className="w-4 h-4 mr-2" />
                                            Watch
                                          </Button>
                                          <Button 
                                            variant="default" 
                                            size="sm"
                                            onClick={() => {
                                              const videoUrl = highlight.videoUrl || highlight.url;
                                              const fileName = highlight.name || highlight.title || `highlight-${index + 1}`;
                                              downloadVideo(videoUrl, fileName);
                                            }}
                                            className="flex-1"
                                          >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="best" className="mt-0">
                          <Tabs defaultValue="clips" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 bg-muted h-auto p-2 -mt-2">
                              <TabsTrigger value="clips" className="font-bebas uppercase">
                                All Clips
                              </TabsTrigger>
                              <TabsTrigger value="playlists" className="font-bebas uppercase">
                                Playlists
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="clips">
                              {!highlightsData.bestClips || highlightsData.bestClips.length === 0 ? (
                                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                                  <p className="text-muted-foreground">No best clips available yet.</p>
                                  <Button
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.multiple = true;
                                      input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/*';
                                      input.onchange = (e: any) => {
                                        const files = e.target.files;
                                        if (files && files.length > 0) {
                                          handleFileUpload(files);
                                        }
                                      };
                                      input.click();
                                    }}
                                    variant="outline"
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Clip{uploadProgress !== null ? 'ping...' : 's'}
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center gap-2 container mx-auto px-4">
                                    <Button
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.multiple = true;
                                        input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/*';
                                        input.onchange = (e: any) => {
                                          const files = e.target.files;
                                          if (files && files.length > 0) {
                                            handleFileUpload(files);
                                          }
                                        };
                                        input.click();
                                      }}
                                      variant="outline"
                                      size="sm"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      Upload Clip{uploadProgress !== null ? 'ping...' : 's'}
                                    </Button>
                                    {uploadProgress !== null && (
                                      <div className="text-sm text-muted-foreground">
                                        Uploading: {uploadProgress}%
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-3">
                                  {highlightsData.bestClips?.slice(0, visibleClipsCount).map((highlight: any, index: number) => (
                                    <div 
                                       key={highlight.id || highlight.uploadId || highlight.videoUrl || `${highlight.name}-${index}`}
                                       className="border rounded-lg p-4 bg-card"
                                     >
                                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                           {/* Video Preview Thumbnail */}
                                           {!highlight.uploading && !highlight.uploadFailed && highlight.videoUrl && (
                                             <div 
                                               className="relative w-full md:w-32 h-20 md:h-20 flex-shrink-0 rounded overflow-hidden bg-black cursor-pointer group"
                                               onClick={() => {
                                                 setCurrentVideoUrl(highlight.videoUrl);
                                                 setCurrentVideoName(highlight.name || `Clip ${index + 1}`);
                                                 setVideoPlayerOpen(true);
                                               }}
                                             >
                                               <video
                                                 src={highlight.videoUrl}
                                                 className="w-full h-full object-cover"
                                                 preload="metadata"
                                                 playsInline
                                                 muted
                                                 onLoadStart={(e) => {
                                                   const video = e.target as HTMLVideoElement;
                                                   video.currentTime = 0.1; // Seek to show first frame
                                                 }}
                                                 onError={(e) => {
                                                   console.error('Video thumbnail error:', e);
                                                   const video = e.target as HTMLVideoElement;
                                                   video.style.display = 'none';
                                                 }}
                                               />
                                               <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                                                 <Play className="w-6 md:w-8 h-6 md:h-8 text-white drop-shadow-lg" />
                                               </div>
                                             </div>
                                           )}
                                            
                                            <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                               <span className="text-lg md:text-xl font-bold text-primary">{index + 1}.</span>
                                               <div className="flex-1 min-w-0">
                                           {highlight.uploading ? (
                                             <div className="space-y-2">
                                               <div className="flex items-center justify-between">
                                                 <p className="font-bebas text-lg uppercase tracking-wider truncate">{highlight.name}</p>
                                                 {fileUploadProgress[highlight.uploadId] !== undefined && (
                                                   <span className="text-sm text-muted-foreground">
                                                     {fileUploadProgress[highlight.uploadId]}%
                                                   </span>
                                                 )}
                                               </div>
                                               {fileUploadProgress[highlight.uploadId] !== undefined && (
                                                 <Progress value={fileUploadProgress[highlight.uploadId]} className="h-2" />
                                               )}
                                             </div>
                                           ) : highlight.uploadFailed ? (
                                             <div className="space-y-1">
                                               <p className="font-bebas text-lg uppercase tracking-wider text-destructive truncate">{highlight.name}</p>
                                               <p className="text-xs text-destructive">Upload failed. Please try again.</p>
                                               <Button 
                                                 variant="destructive" 
                                                 size="sm"
                                                 onClick={() => handleDeleteClip(highlight.name, highlight.videoUrl)}
                                               >
                                                 Remove
                                               </Button>
                                             </div>
                                           ) : highlight.justCompleted ? (
                                             <div className="flex items-center gap-2">
                                               <p className="font-bebas text-lg uppercase tracking-wider truncate">{highlight.name}</p>
                                               <CheckCircle2 className="w-5 h-5 text-green-500" />
                                             </div>
                                           ) : (
                                             <ClipNameEditor
                                               initialName={highlight.name || `Clip ${index + 1}`}
                                               videoUrl={highlight.videoUrl}
                                                onRename={(newName) => handleRenameClip(highlight.name, newName, highlight.videoUrl)}
                                              />
                                             )}
                                             </div>
                                           </div>
                                             {!highlight.uploading && !highlight.uploadFailed && !highlight.justCompleted && (
                                               <div className="flex gap-1 md:gap-2 flex-shrink-0">
                                                <Button 
                                                 variant="outline" 
                                                 size="sm"
                                                 onClick={() => {
                                                   setCurrentVideoUrl(highlight.videoUrl);
                                                   setCurrentVideoName(highlight.name || `Clip ${index + 1}`);
                                                   setVideoPlayerOpen(true);
                                                 }}
                                                 className="h-8 px-2"
                                               >
                                                 <Play className="w-4 h-4" />
                                                 <span className="hidden sm:inline ml-2">Watch</span>
                                               </Button>
                                              <Button 
                                                variant="ghost" 
                                                 size="sm"
                                                 onClick={() => {
                                                   const videoUrl = highlight.videoUrl || highlight.url;
                                                   const fileName = highlight.name || highlight.title || `clip-${index + 1}`;
                                                   downloadVideo(videoUrl, fileName);
                                                 }}
                                                 className="h-8 px-2"
                                                >
                                                  <Download className="w-4 h-4" />
                                                </Button>
                                             <Button 
                                               variant="ghost" 
                                               size="sm"
                                               onClick={() => handleDeleteClip(highlight.name, highlight.videoUrl)}
                                               className="text-destructive hover:text-destructive h-8 px-2"
                                             >
                                               <Trash2 className="w-4 h-4" />
                                             </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                     </div>
                                   ))}
                                   </div>
                                  {highlightsData.bestClips && highlightsData.bestClips.length > visibleClipsCount && (
                                    <div className="flex justify-center pt-4">
                                      <Button
                                        onClick={() => setVisibleClipsCount(prev => prev + 10)}
                                        variant="outline"
                                      >
                                        Load More Clips ({highlightsData.bestClips.length - visibleClipsCount} remaining)
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="playlists">
                              <div className="container mx-auto px-4">
                                <PlaylistContent
                                  playerData={playerData}
                                  availableClips={highlightsData.bestClips || []}
                                />
                              </div>
                            </TabsContent>
                          </Tabs>
                  </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="updates">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0">
                <CardContent className="container mx-auto px-4 pt-2">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 mb-6 bg-muted h-auto p-2">
                      <TabsTrigger value="general" className="font-bebas uppercase text-sm">
                        General Updates
                      </TabsTrigger>
                      <TabsTrigger value="app" className="font-bebas uppercase text-sm">
                        App Updates
                      </TabsTrigger>
                      <TabsTrigger value="offline" className="font-bebas uppercase text-sm">
                        Offline Access
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6 pl-6 pr-6">
                      {updates.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          No updates available yet.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {updates.map((update) => (
                            <div 
                              key={update.id}
                              className="border rounded-lg p-6 space-y-3 bg-card hover:border-primary transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <h3 className="text-xl font-bebas uppercase tracking-wider">
                                  {update.title}
                                </h3>
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                  {format(new Date(update.date), 'MMMM d, yyyy')}
                                </span>
                              </div>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {update.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="app" className="space-y-6 pl-6 pr-6">
                      <div>
                        <h3 className="text-xl font-bebas uppercase tracking-wider mb-4">
                          Latest App Update
                        </h3>
                        <PWAInstallPrompt />
                      </div>
                    </TabsContent>

                    <TabsContent value="offline" className="space-y-6 pl-6 pr-6">
                      <div>
                        <h3 className="text-xl font-bebas uppercase tracking-wider mb-4">
                          Offline Access
                        </h3>
                        <OfflineContentManager 
                          playerData={playerData}
                          analyses={analyses}
                          programs={programs}
                          concepts={concepts}
                          updates={updates}
                          invoices={invoices}
                          aphorisms={dailyAphorism ? [dailyAphorism] : []}
                          assets={[
                            playerData?.image_url,
                            ...analyses.map(a => a.pdf_url).filter(Boolean),
                            ...programs.map(p => [p.phase_image_url, p.player_image_url]).flat().filter(Boolean),
                            ...concepts.map(c => [c.match_image_url, c.scheme_image_url, c.player_image_url]).flat().filter(Boolean),
                          ].filter(Boolean)}
                        />
                      </div>
                    </TabsContent>

                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfer-hub">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0">
                <CardHeader marble>
                  <div className="container mx-auto px-4">
                    <CardTitle className="font-heading tracking-tight flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Transfer Hub
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="container mx-auto px-4">
                  {playerData?.id ? (
                    <PlayerTransferHub playerId={playerData.id} />
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading player data...
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nutrition">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0">
                <CardHeader marble>
                  <div className="container mx-auto px-4">
                    <CardTitle className="font-heading tracking-tight">
                      Nutrition
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="container mx-auto px-4">
                  {playerData?.id ? (
                    <NutritionProgramDisplay playerId={playerData.id} />
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading player data...
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        )}
      </main>

      {/* Exercise Details Dialog */}
      <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
        <DialogContent className="w-[98vw] max-w-none sm:max-w-2xl mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas uppercase text-2xl">
              {selectedExercise?.name || 'Exercise Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedExercise?.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedExercise.description}
                </p>
              </div>
            )}
            
            {(selectedExercise?.videoUrl || selectedExercise?.video_url) && (
              <div>
                <h4 className="font-semibold mb-2">Video</h4>
                <a 
                  href={selectedExercise.videoUrl || selectedExercise.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Play className="w-4 h-4" />
                  Watch Exercise Video
                </a>
              </div>
            )}
            
            {!selectedExercise?.description && !selectedExercise?.videoUrl && !selectedExercise?.video_url && (
              <p className="text-sm text-muted-foreground italic">
                No additional details available for this exercise.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={videoPlayerOpen} onOpenChange={setVideoPlayerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-bebas uppercase tracking-wider">
              {currentVideoName}
            </DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              key={currentVideoUrl}
              controls
              autoPlay
              className="w-full h-full"
              controlsList="nodownload"
            >
              <source src={currentVideoUrl} type="video/mp4" />
              <source src={currentVideoUrl} type="video/quicktime" />
              Your browser does not support the video tag.
            </video>
          </div>
        </DialogContent>
      </Dialog>

      <PlayerProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        playerData={playerData}
      />

      <CoachAvailability
        open={coachAvailabilityOpen}
        onOpenChange={setCoachAvailabilityOpen}
      />

      {/* Test Input Dialog */}
      <Dialog open={testingDialogOpen} onOpenChange={setTestingDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas uppercase text-2xl">
              {selectedTest?.name || 'Test Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTest?.description && (
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">{selectedTest.description}</p>
              </div>
            )}
            
            <div className="flex gap-4 text-sm">
              {selectedTest?.sets && (
                <div>
                  <span className="text-muted-foreground">Sets: </span>
                  <span className="font-medium">{selectedTest.sets}</span>
                </div>
              )}
              {selectedTest?.reps && (
                <div>
                  <span className="text-muted-foreground">Target: </span>
                  <span className="font-medium text-primary">{selectedTest.reps}</span>
                </div>
              )}
            </div>
            
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Record Your Score</h4>
              <div className="space-y-2">
                <Label htmlFor="testScore">Score / Result</Label>
                <input
                  id="testScore"
                  type="text"
                  value={testScore}
                  onChange={(e) => setTestScore(e.target.value)}
                  placeholder="e.g., 100kg, 2.5m, 4.2s"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testNotes">Notes (optional)</Label>
                <textarea
                  id="testNotes"
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => saveTestResult('draft')} 
                  disabled={savingTestResult || !testScore.trim()}
                  className="flex-1"
                >
                  {savingTestResult ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button 
                  onClick={() => saveTestResult('submitted')} 
                  disabled={savingTestResult || !testScore.trim()}
                  className="flex-1"
                >
                  {savingTestResult ? 'Saving...' : 'Submit'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test History Dialog */}
      <Dialog open={testHistoryOpen} onOpenChange={setTestHistoryOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas uppercase text-2xl">
              Testing History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <Label>Select Month:</Label>
              <Select value={selectedHistoryMonth} onValueChange={setSelectedHistoryMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableMonths().length > 0 ? (
                    getAvailableMonths().map(month => (
                      <SelectItem key={month} value={month}>
                        {format(new Date(month + '-01'), 'MMMM yyyy')}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={format(new Date(), 'yyyy-MM')}>
                      {format(new Date(), 'MMMM yyyy')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Results by Category */}
            {(() => {
              const monthResults = getTestResultsByMonth(selectedHistoryMonth);
              const categories = ['Strength', 'Power', 'Speed', 'Conditioning'];
              
              if (monthResults.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    No test results recorded for this month.
                  </div>
                );
              }
              
              return categories.map(category => {
                const categoryResults = monthResults.filter(r => r.test_category === category);
                if (categoryResults.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-2">
                    <h4 className="font-bebas text-lg uppercase tracking-wider text-primary border-b border-primary/30 pb-1">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {categoryResults.map((result: any) => (
                        <div 
                          key={result.id}
                          className="bg-secondary/30 rounded-lg p-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{result.test_name}</span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(result.test_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                            <span className="font-bold text-primary text-lg">{result.score}</span>
                          </div>
                          {result.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">{result.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Section */}
      <div className="container mx-auto px-4 pb-8">
        <div className="border-t border-border my-6" />
        <div className="flex justify-center items-center gap-4">
          {playerData?.id && (
            <NotificationSettings playerId={playerData.id} />
          )}
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="font-bebas uppercase tracking-wider"
          >
            Log Out
          </Button>
          <Button 
            variant="outline"
            size="icon"
            onClick={() => window.location.reload()}
            className="text-gold hover:text-gold/80"
            title="Refresh app"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Performance Report Dialog */}
      <PerformanceReportDialog
        open={performanceReportDialogOpen}
        onOpenChange={setPerformanceReportDialogOpen}
        analysisId={selectedReportAnalysisId}
      />
    </div>
  );
};

export default Dashboard;
