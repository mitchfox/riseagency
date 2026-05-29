import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageLoading, LoadingSpinner } from "@/components/LoadingSpinner";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import { supabase } from "@/integrations/supabase/client";
import { insertStaffNotification } from "@/lib/staffNotifications";
import { t, normalizePortalLanguage } from "@/lib/portalTranslations";
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
import { FileText, Play, Download, Upload, ChevronDown, Trash2, Lock, Calendar, Trophy, TrendingUp, Eye, EyeOff, ChevronUp, ChevronDown as ChevronDownIcon, List, RefreshCw, CheckCircle2, WifiOff, Bell, BarChart3, ChevronLeft, LineChart, Video, Database, Users, Search, Compass, Layers, Brain, FolderOpen, Activity, UtensilsCrossed, Home } from "lucide-react";
import { ClipNameEditor } from "@/components/ClipNameEditor";
import { addDays, format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { SEO } from "@/components/SEO";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { PlaylistContent } from "@/components/PlaylistContent";
import { effectiveR90 } from "@/lib/r90";
import { CoachAvailability } from "@/components/CoachAvailability";
import { PlayerScoutingReports } from "@/components/PlayerScoutingReports";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineContentManager } from "@/components/OfflineContentManager";
import { PortalWelcomeModal } from "@/components/portal/PortalWelcomeModal";
import { CacheManager } from "@/lib/cacheManager";
import { VersionManager } from "@/lib/versionManager";
import { Hub } from "@/components/dashboard/Hub";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { Link } from "react-router-dom";

import { getR90Grade, getXGGrade, getXAGrade, getRegainsGrade, getInterceptionsGrade, getXGChainGrade, getProgressivePassesGrade, getPPTurnoversRatioGrade } from "@/lib/gradeCalculations";
import { useFormGradeConfigs, METRIC_KEY_MAP } from "@/hooks/useFormGradeConfigs";
import { downloadVideo } from "@/lib/videoDownload";
import { PlayerPositionalGuides } from "@/components/PlayerPositionalGuides";
import { ProtectedContracts } from "@/components/player/ProtectedContracts";
import { PaymentOptions } from "@/components/player/PaymentOptions";
import { PlayerTransferHub } from "@/components/player/TransferHub";
import { CognisanceSection } from "@/components/portal/CognisanceSection";
import { NutritionProgramDisplay } from "@/components/portal/NutritionProgramDisplay";
import { AnalysisComparisons } from "@/components/portal/AnalysisComparisons";
import { LongTermVisionSection } from "@/components/portal/LongTermVisionSection";
import { OperatingProfileDialog } from "@/components/portal/OperatingProfileDialog";
import { OperatingProfileReminder } from "@/components/portal/OperatingProfileReminder";
import { AnalysisVideoReports } from "@/components/portal/AnalysisVideoReports";
import { AnalysisDataTab } from "@/components/portal/AnalysisDataTab";
import { MarkdownContent } from "@/utils/markdownRenderer";
import { InjuryLog } from "@/components/portal/InjuryLog";
import { PlayerSpqHistory } from "@/components/staff/PlayerSpqHistory";
import { PlayerMatchClipper } from "@/components/portal/PlayerMatchClipper";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { SectionDivider } from "@/components/portal/SectionDivider";
import { MobileBottomNav } from "@/components/portal/MobileBottomNav";
import { PortalMusicPlayer } from "@/components/portal/PortalMusicPlayer";
import { PortalMusicControls } from "@/components/portal/PortalMusicControls";
import { normalizeClubName } from "@/lib/clubNameUtils";

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
  fixture_id?: string | null;
  analysis_writer_id?: string | null;
  analysis_writer_data?: any;
  striker_stats?: any;
  visibility_status?: string;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
  placeholder_per?: number | null;
  placeholder_sr?: number | null;
  tagged_analyses?: any[];
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
  const [portalLanguageHint, setPortalLanguageHint] = useState<string>("en");
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
  const [showAnalysisSub, setShowAnalysisSub] = useState(false);
  const [portalSettings, setPortalSettings] = useState<any>(null);
  const [operatingProfileOpen, setOperatingProfileOpen] = useState(false);
  const [operatingProfileChecked, setOperatingProfileChecked] = useState(false);
  const [operatingProfileStatus, setOperatingProfileStatus] = useState<"unknown" | "none" | "in_progress" | "done">("unknown");
  const [operatingProfileReminderDismissed, setOperatingProfileReminderDismissed] = useState(false);

  useEffect(() => {
    if (operatingProfileChecked) return;
    if (!playerData?.id) return;
    // Wait until welcome modal has been seen so we don't double-stack popups
    const welcomeSeen =
      portalSettings?.has_seen_welcome_modal === true ||
      localStorage.getItem(`player_welcome_seen_${playerData.id}`) === "true";
    if (!welcomeSeen) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_operating_profile_status", { _player_id: playerData.id });
      if (cancelled) return;
      // If the lookup fails for any reason, do NOT show the popup — better to
      // skip than to nag a player who has already completed it.
      if (error) {
        setOperatingProfileChecked(true);
        setOperatingProfileStatus("done");
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      const submittedAt = row?.submitted_at ?? null;
      const hasAny = !!row?.has_any;
      setOperatingProfileChecked(true);
      if (submittedAt) {
        setOperatingProfileStatus("done");
      } else if (hasAny) {
        setOperatingProfileStatus("in_progress");
      } else {
        setOperatingProfileStatus("none");
        // Do NOT auto-open the full dialog. The reminder banner is the
        // only entry point — players open it manually when ready.
      }
    })();
    return () => { cancelled = true; };
  }, [playerData?.id, portalSettings?.has_seen_welcome_modal, operatingProfileChecked]);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

  // Initialize form grade configs from database
  const { getGradeBoundaries: getDynamicGradeBoundaries, getGradeForScore, hasThresholds } = useFormGradeConfigs();

  // Initialize push notifications with player ID
  usePushNotifications(playerData?.id);

  // Track portal tab views for staff notifications
  useEffect(() => {
    if (!playerData?.id) return;
    const playerName = playerData?.name || playerData?.email || "A player";
    const playerId = playerData.id;

    if (activeTab === "analysis") {
      const subType = activeAnalysisTab === "performance" ? "portal_performance_view" : "portal_analysis_view";
      const label = activeAnalysisTab === "performance" ? "Performance Reports" : "Analysis";
      insertStaffNotification({
        eventType: subType,
        title: `Portal ${label} View`,
        body: `${playerName} viewed ${label}`,
        eventData: { player_name: playerName, player_id: playerId, sub_tab: activeAnalysisTab },
        dedupeKey: playerId,
      });
    }
  }, [activeTab, activeAnalysisTab, playerData?.id]);

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

  // Check for app updates first
  useEffect(() => {
    if (navigator.onLine) {
      VersionManager.initialize();
    }
  }, []);

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
      // Check URL params first (staff portal login passes email via URL)
      const urlParams = new URLSearchParams(window.location.search);
      const staffLoginEmail = urlParams.get("staff_login");
      // Optional language override passed from public pages (e.g. the
      // representation Cristiano example links). When present we lock it
      // in immediately so the portal renders in that language even after
      // we strip the URL params below, and so it wins over the demo
      // player's stored portal_language.
      const langParam = urlParams.get("lang");
      // Optional flag to hide the Key Documents (invoices) tab when the
      // portal is embedded inside the prospect "Rise With Us" offer page.
      if (urlParams.get("hide_invoices") === "1") {
        try { sessionStorage.setItem("portal_hide_invoices", "1"); } catch {}
      }
      if (urlParams.get("hide_logout") === "1") {
        try { sessionStorage.setItem("portal_hide_logout", "1"); } catch {}
      }
      if (urlParams.get("hide_music") === "1") {
        try { sessionStorage.setItem("portal_hide_music", "1"); } catch {}
      }
      if (langParam) {
        try {
          localStorage.setItem("portal_language_hint", langParam);
          sessionStorage.setItem("portal_language_url_override", langParam);
        } catch {}
        setPortalLanguageHint(langParam);
      }
      if (staffLoginEmail) {
        localStorage.setItem("player_email", staffLoginEmail);
        sessionStorage.setItem("player_email", staffLoginEmail);
        localStorage.setItem("player_login_timestamp", Date.now().toString());
        // Clean the URL
        window.history.replaceState({}, '', window.location.pathname);
      }

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
        .select("id, portal_language")
        .ilike("email", playerEmail.trim().toLowerCase())
        .maybeSingle();

      if (playerError || !player) {
        // Email no longer valid, clear session and redirect
        localStorage.removeItem("player_email");
        navigate("/login");
        return;
      }

      if (player?.portal_language) {
        // If the visitor explicitly arrived with ?lang=, that wins over
        // the player's stored portal_language for this session.
        const urlOverride = (() => {
          try { return sessionStorage.getItem("portal_language_url_override"); } catch { return null; }
        })();
        if (!urlOverride) {
          setPortalLanguageHint(player.portal_language);
          localStorage.setItem("portal_language_hint", player.portal_language);
        } else {
          // Force the player's effective portal_language to the URL override
          // so every `t(playerData?.portal_language, ...)` call and every
          // child `portalLanguage` prop downstream renders in the visitor's
          // chosen language instead of the demo player's stored English.
          (player as any).portal_language = urlOverride;
          setPortalLanguageHint(urlOverride);
          localStorage.setItem("portal_language_hint", urlOverride);
        }
      }

      await fetchAnalyses(playerEmail);
      await fetchPrograms(playerEmail);
      await fetchInvoices(playerEmail);
      await fetchUpdates(player.id);
      await fetchTestResults(player.id);
      await fetchNutritionPrograms(player.id);
      await fetchPortalSettings(player.id);
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
        .ilike("email", email.trim().toLowerCase())
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
          
          // Only merge if bioData is a valid object, but preserve critical player fields
          if (bioData && typeof bioData === 'object' && !Array.isArray(bioData)) {
            const preservedFields = {
              portal_language: playerData.portal_language,
              id: playerData.id,
              email: playerData.email,
              name: playerData.name,
            };
            parsedPlayerData = { ...playerData, ...bioData, ...preservedFields };
          }
        }
      } catch (e) {
        console.error('Error parsing player bio:', e);
      }

      setPlayerData(parsedPlayerData);
      // Apply URL ?lang= override BEFORE downstream renders so all
      // `t(playerData?.portal_language, ...)` calls and child
      // `portalLanguage={playerData?.portal_language}` props use the
      // visitor's chosen language for example portals (e.g. Cristiano).
      try {
        const urlOverride = sessionStorage.getItem("portal_language_url_override");
        if (urlOverride) {
          parsedPlayerData = { ...parsedPlayerData, portal_language: urlOverride };
          setPlayerData(parsedPlayerData);
        }
      } catch {}
      if (parsedPlayerData?.portal_language) {
        const urlOverride = (() => {
          try { return sessionStorage.getItem("portal_language_url_override"); } catch { return null; }
        })();
        if (!urlOverride) {
          setPortalLanguageHint(parsedPlayerData.portal_language);
          localStorage.setItem("portal_language_hint", parsedPlayerData.portal_language);
        } else {
          // Override already applied to parsedPlayerData below; ensure
          // the loading-screen hint is also in sync.
          setPortalLanguageHint(urlOverride);
          localStorage.setItem("portal_language_hint", urlOverride);
        }
      }

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

      // Build the Performance tab from fixtures first, then merge reports.
      // This keeps separate same-opponent fixtures visible even when a report
      // has not been created yet, so linked pre/post-match analysis can still show.
      const { data: playerFixtureLinks } = await supabase
        .from("player_fixtures")
        .select(`
          fixture_id,
          minutes_played,
          fixtures (
            id,
            home_team,
            away_team,
            home_score,
            away_score,
            match_date,
            match_time,
            venue,
            competition
          )
        `)
        .eq("player_id", playerData.id);

      const { data: analysisData, error: analysisError } = await supabase
        .from("player_analysis")
        .select("*")
        .eq("player_id", playerData.id)
        .order("analysis_date", { ascending: false });

      if (analysisError) throw analysisError;

      const reportByFixture = new Map<string, Analysis>();
      (analysisData || []).forEach((report: any) => {
        if (report.fixture_id) reportByFixture.set(report.fixture_id, report as Analysis);
      });

      const deriveOpponent = (fixture: any) => {
        const playerClub = normalizeClubName(parsedPlayerData.club || "");
        const home = normalizeClubName(fixture.home_team || "");
        const away = normalizeClubName(fixture.away_team || "");
        if (playerClub && home && (home.includes(playerClub) || playerClub.includes(home))) return fixture.away_team;
        if (playerClub && away && (away.includes(playerClub) || playerClub.includes(away))) return fixture.home_team;
        return fixture.away_team || fixture.home_team || null;
      };

      const deriveResult = (fixture: any) => {
        if (fixture.home_score === null || fixture.home_score === undefined || fixture.away_score === null || fixture.away_score === undefined) return null;
        return `${fixture.home_score}-${fixture.away_score}`;
      };

      const fixtureRows: Analysis[] = ((playerFixtureLinks || []) as any[])
        .map((link) => {
          const fixture = Array.isArray(link.fixtures) ? link.fixtures[0] : link.fixtures;
          if (!fixture?.id) return null;
          const existingReport = reportByFixture.get(fixture.id);
          if (existingReport) {
            return {
              ...existingReport,
              fixture_id: fixture.id,
              analysis_date: existingReport.analysis_date || fixture.match_date,
              opponent: existingReport.opponent || deriveOpponent(fixture),
              result: existingReport.result || deriveResult(fixture),
              minutes_played: existingReport.minutes_played ?? link.minutes_played ?? null,
            } as Analysis;
          }

          return {
            id: `fixture-${fixture.id}`,
            fixture_id: fixture.id,
            analysis_date: fixture.match_date,
            r90_score: null as any,
            pdf_url: null,
            video_url: null,
            notes: null,
            opponent: deriveOpponent(fixture),
            result: deriveResult(fixture),
            minutes_played: link.minutes_played ?? null,
            visibility_status: "live",
          } as Analysis;
        })
        .filter(Boolean) as Analysis[];

      const reportsWithoutFixture = ((analysisData || []) as Analysis[]).filter((report: any) => !report.fixture_id);
      const initialAnalyses = [...fixtureRows, ...reportsWithoutFixture].sort((a, b) => {
        const dateA = new Date(a.analysis_date || 0).getTime();
        const dateB = new Date(b.analysis_date || 0).getTime();
        return dateB - dateA;
      });

      setAnalyses(initialAnalyses);

      // Fetch all concepts from coaching_analysis (available to all players)
      const { data: conceptsData, error: conceptsError } = await supabase
        .from("coaching_analysis")
        .select("*")
        .eq("analysis_type", "concept");

      if (!conceptsError && conceptsData) {
        const normalizedConcepts = conceptsData.map(concept => {
          const attachments = Array.isArray(concept.attachments) ? concept.attachments : [];
          // Separate media URLs (strings) from structured point objects
          const mediaUrls = attachments.filter((a: any) => typeof a === 'string');
          const structuredPoints = attachments.filter((a: any) => typeof a === 'object' && a !== null);
          return {
            id: concept.id,
            title: concept.title || "Untitled Concept",
            concept: concept.content || concept.description || null,
            explanation: concept.content || concept.description || null,
            points: structuredPoints,
            media: mediaUrls,
            created_at: concept.created_at
          };
        });
        setConcepts(normalizedConcepts);
      }

      // Fetch all analyses (pre-match, post-match) linked to this player
      let latestAnalyses = [...initialAnalyses] as Analysis[];
      const linkedAnalysisIds = (analysisData || [])
        .filter(a => a.analysis_writer_id)
        .map(a => a.analysis_writer_id);

      if (linkedAnalysisIds.length > 0) {
        const { data: allAnalysesData, error: allAnalysesError } = await supabase
          .from("analyses")
          .select("*")
          .in("id", linkedAnalysisIds);

        if (!allAnalysesError && allAnalysesData) {
          const matchAnalyses = allAnalysesData.filter(a => 
            a.analysis_type === "pre-match" || a.analysis_type === "post-match"
          );
          
          matchAnalyses.forEach(matchAnalysis => {
            const playerAnalysis = (analysisData || []).find(
              pa => pa.analysis_writer_id === matchAnalysis.id
            );
            if (playerAnalysis) {
              const index = latestAnalyses.findIndex(a => a.id === playerAnalysis.id);
              if (index !== -1) {
                latestAnalyses[index] = {
                  ...latestAnalyses[index],
                  analysis_writer_data: matchAnalysis
                } as Analysis;
              }
            }
          });
        }
      }

      // Fetch tagged analyses for this player (via analysis_player_tags)
      const { data: taggedData, error: taggedError } = await supabase
        .from("analysis_player_tags")
        .select(`
          id,
          created_at,
          analysis_id,
          analyses (
            id,
            title,
            analysis_type,
            match_date,
            home_team,
            away_team,
            home_score,
            away_score,
            category,
            fixture_id
          )
        `)
        .eq("player_id", playerData.id)
        .order("created_at", { ascending: false });

      if (!taggedError && taggedData) {
        const validTagged = taggedData.filter((item: any) => item.analyses);
        setOtherAnalyses(validTagged);

        // Merge tagged analyses into performance report rows
        // so pre/post-match buttons appear on matching fixtures
        const updatedAnalyses = [...latestAnalyses] as Analysis[];

        validTagged.forEach((tag: any) => {
          const taggedAnalysis = tag.analyses;
          if (!taggedAnalysis) return;
          if (taggedAnalysis.category === "training") return;

          const matchDate = taggedAnalysis.match_date;
          const taggedFixtureId = taggedAnalysis.fixture_id;
          const homeTeam = taggedAnalysis.home_team?.toLowerCase()?.trim();
          const awayTeam = taggedAnalysis.away_team?.toLowerCase()?.trim();

          // Build matching candidate rows. Prefer fixture_id (1-to-1 with a
          // specific fixture); fall back to date+opponent only when neither
          // side has a fixture_id. This guarantees that two analyses against
          // the same opponent on different dates (e.g. two RFC Liege fixtures)
          // attach to their own performance reports rather than collapsing
          // into one.
          const matches: number[] = [];
          updatedAnalyses.forEach((pa: any, idx) => {
            if (taggedFixtureId && pa.fixture_id) {
              if (taggedFixtureId === pa.fixture_id) matches.push(idx);
              return;
            }
            const paOpponent = pa.opponent?.toLowerCase()?.trim();
            const paDate = pa.analysis_date;
            const dateMatch = matchDate && paDate && matchDate === paDate;
            const opponentMatch = paOpponent && (paOpponent === homeTeam || paOpponent === awayTeam);
            if (dateMatch && opponentMatch) matches.push(idx);
          });

          matches.forEach(idx => {
            const row: any = updatedAnalyses[idx];
            const sameId = (a: any) => a && a.id === taggedAnalysis.id;
            const writerHasIt = sameId(row.analysis_writer_data);
            const taggedHasIt = (row.tagged_analyses || []).some(sameId);
            if (writerHasIt || taggedHasIt) return; // exact same analysis already attached

            if (!row.analysis_writer_data) {
              row.analysis_writer_data = taggedAnalysis;
              row.analysis_writer_id = taggedAnalysis.id;
            } else {
              // Always append additional analyses (same type or different).
              // Previously the same-type case was silently dropped, which
              // hid the second of two pre-match (or post-match) analyses
              // against the same opponent.
              if (!row.tagged_analyses) row.tagged_analyses = [];
              row.tagged_analyses.push(taggedAnalysis);
            }
          });
        });

        setAnalyses(updatedAnalyses);
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

    const refetchPortalData = () => {
      fetchAnalyses(playerEmail);
    };

    const channel = supabase
      .channel('dashboard-analysis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_analysis'
        },
        refetchPortalData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analysis_player_tags' },
        refetchPortalData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analyses' },
        refetchPortalData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_fixtures' },
        refetchPortalData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixtures' },
        refetchPortalData
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
        .ilike("email", email.trim().toLowerCase())
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

  const fetchPortalSettings = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("player_portal_settings")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) throw error;

      const localWelcomeSeen = localStorage.getItem(`player_welcome_seen_${playerId}`) === "true";
      if (data) {
        setPortalSettings(data);
      } else {
        setPortalSettings({
          player_id: playerId,
          has_seen_welcome_modal: localWelcomeSeen,
        });
      }
      // Bump login counter (session-scoped, so we only count once per tab open)
      try {
        const sessionKey = `player_login_bumped_${playerId}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          await (supabase as any).rpc("bump_player_portal_login", { _player_id: playerId });
        }
      } catch {}
    } catch (error) {
      console.error("Error fetching portal settings:", error);
    }
  };

  const markWelcomeSeen = async (playerId: string) => {
    const localKey = `player_welcome_seen_${playerId}`;

    try {
      localStorage.setItem(localKey, "true");
      sessionStorage.setItem(localKey, "true");

      const { error } = await supabase.rpc("mark_welcome_seen", { _player_id: playerId });
      if (error) throw error;
    } catch (error) {
      console.error("Error marking welcome modal as seen:", error);
    } finally {
      setPortalSettings((prev: any) => ({
        ...(prev || {}),
        player_id: playerId,
        has_seen_welcome_modal: true,
      }));
    }
  };

  const fetchInvoices = async (email: string | undefined) => {
    if (!email) return;
    
    try {
      // First get the player ID from email
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id")
        .ilike("email", email.trim().toLowerCase())
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
    return <PageLoading text={t(portalLanguageHint, "loading")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Modal for new users */}
      {playerData && (
        <PortalWelcomeModal
          playerName={playerData.name || ""}
          playerId={playerData.id}
          portalLanguage={playerData.portal_language}
          hasSeenWelcome={
            portalSettings?.has_seen_welcome_modal === true ||
            localStorage.getItem(`player_welcome_seen_${playerData.id}`) === "true"
          }
          hasAnalyses={analyses.length > 0}
          hasPerformanceReports={analyses.some((a: any) => a.r90_score != null)}
          onNavigate={(tab, subTab) => {
            setActiveTab(tab);
            if (subTab) setActiveAnalysisTab(subTab);
          }}
          onMarkSeen={() => markWelcomeSeen(playerData.id)}
        />
      )}
      {playerData && (
        <OperatingProfileDialog
          playerId={playerData.id}
          open={operatingProfileOpen}
          onOpenChange={setOperatingProfileOpen}
          onSubmitted={() => { setOperatingProfileChecked(true); setOperatingProfileStatus("done"); }}
          portalLanguage={playerData.portal_language}
        />
      )}
      {/* Header with Logo */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-50 pwa-safe-top">
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

      {playerData && operatingProfileStatus !== "unknown" && (
        <OperatingProfileReminder
          visible={(operatingProfileStatus === "in_progress" || operatingProfileStatus === "none") && !operatingProfileReminderDismissed && !operatingProfileOpen}
          inProgress={operatingProfileStatus === "in_progress"}
          onOpen={() => setOperatingProfileOpen(true)}
          onDismiss={() => setOperatingProfileReminderDismissed(true)}
          portalLanguage={playerData?.portal_language}
        />
      )}

      {/* Subheader with Options */}
      <div id="subheader" className="bg-background lg:bg-background bg-[url('/smudged-marble-header.png')] lg:bg-none bg-cover bg-center bg-no-repeat border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 h-12">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5"
              onClick={() => window.open('/', '_blank')}
              title="Visit RISE homepage"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 relative"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">{t(playerData?.portal_language, "notifications")}</span>
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
                  <h3 className="font-semibold">{t(playerData?.portal_language, "recent_notifications")}</h3>
                </div>
                <div className="py-2">
                  {(() => {
                    const notifications: Array<{ type: string; title: string; subtitle: string; date: Date; onClick?: () => void }> = [];
                    const languageCode = normalizePortalLanguage(playerData?.portal_language);
                    const localeMap: Record<string, string> = { fr: "fr-FR", es: "es-ES", pt: "pt-PT", de: "de-DE", it: "it-IT", pl: "pl-PL", cs: "cs-CZ", ru: "ru-RU", tr: "tr-TR" };
                    const locale = localeMap[languageCode] || "en-GB";
                    const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
                    const formatRelative = (date: Date) => {
                      const diffMs = date.getTime() - Date.now();
                      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
                      if (Math.abs(diffHours) < 24) return relativeFormatter.format(diffHours, "hour");
                      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                      return relativeFormatter.format(diffDays, "day");
                    };

                    // Add recent analyses
                    analyses.slice(0, 3).forEach(analysis => {
                      notifications.push({
                        type: 'analysis',
                        title: t(playerData?.portal_language, "new_performance_report"),
                        subtitle: `${analysis.opponent || t(playerData?.portal_language, "match")} - ${new Date(analysis.analysis_date).toLocaleDateString(locale, { month: "short", day: "numeric" })}`,
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
                        title: t(playerData?.portal_language, "training_program"),
                        subtitle: program.program_name,
                        date: parseISO(program.created_at),
                        onClick: () => setActiveTab('physical')
                      });
                    });

                    // Add recent concepts
                    concepts.slice(0, 2).forEach(concept => {
                      notifications.push({
                        type: 'concept',
                        title: t(playerData?.portal_language, "new_concept"),
                        subtitle: concept.title || t(playerData?.portal_language, "analysis"),
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
                        title: t(playerData?.portal_language, "new_update"),
                        subtitle: update.title,
                        date: parseISO(update.date),
                        onClick: () => setActiveTab('updates')
                      });
                    });

                    const sortedNotifications = notifications
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .slice(0, 5);

                    if (sortedNotifications.length === 0) {
                      return (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          {t(playerData?.portal_language, "no_recent_notifications")}
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
                            <p className="text-xs text-muted-foreground mt-1">{formatRelative(notif.date)}</p>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Music controls between notifications and coach availability */}
            {!(typeof window !== "undefined" && sessionStorage.getItem("portal_hide_music") === "1") && (
              <PortalMusicControls />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCoachAvailabilityOpen(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{t(playerData?.portal_language, "coach_availability")}</span>
              <span className="sm:hidden">{t(playerData?.portal_language, "availability")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-28 left-0 right-0 z-20 bg-destructive/90 backdrop-blur-sm text-destructive-foreground py-2 px-4">
          <div className="container mx-auto text-center text-sm font-medium">
            <WifiOff className="inline-block h-4 w-4 mr-2" />
            {t(playerData?.portal_language, "offline_notice")}
          </div>
        </div>
      )}

      <main className="pb-16 md:pb-0">
        {/* Notification Permission - with padding */}
        <div className="container mx-auto max-w-6xl px-4 md:px-6 mb-0">
          <NotificationPermission />
        </div>
        {/* Navigation Menu - Full width, conditionally sticky */}
        <div className={`w-full ${!isSubheaderVisible ? 'sticky top-16 z-40' : ''}`}>
          <DropdownMenu open={navDropdownOpen} onOpenChange={setNavDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" 
                className="w-full justify-center font-bebas uppercase text-xl px-6 py-6 bg-card hover:bg-card/80 border-t-2 border-gold border-x-0 border-b-2 !text-gold hover:!text-gold z-50 rounded-none"
                >
                  <span>
                    {activeTab === "hub" && t(playerData?.portal_language, "hub")}
                    {activeTab === "analysis" && t(playerData?.portal_language, "analysis")}
                    {activeTab === "physical" && t(playerData?.portal_language, "programming")}
                    {activeTab === "invoices" && t(playerData?.portal_language, "key_documents")}
                    {activeTab === "updates" && t(playerData?.portal_language, "updates")}
                    {activeTab === "highlights" && t(playerData?.portal_language, "highlights")}
                    {activeTab === "transfer-hub" && t(playerData?.portal_language, "transfer_hub")}
                    {activeTab === "nutrition" && t(playerData?.portal_language, "nutrition")}
                  </span>
                  <ChevronDown className="ml-2 h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
               <DropdownMenuContent align="center" sideOffset={0} className="w-[100vw] max-w-[100vw] bg-card border-2 border-gold shadow-lg shadow-gold/20 z-50 p-2 sm:p-3 rounded-none">
                {showAnalysisSub ? (
                  <div className="space-y-2">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAnalysisSub(false); }}
                      className="flex items-center gap-2 text-gold/70 hover:text-gold font-bebas uppercase text-sm px-2 py-1 transition-colors"
                    >
                       <ChevronLeft className="h-4 w-4" />
                      {t(playerData?.portal_language, "back")}
                    </button>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      {[
                        { value: "performance", label: t(playerData?.portal_language, "performance"), icon: <Activity className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "form", label: t(playerData?.portal_language, "form"), icon: <LineChart className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "video-reports", label: t(playerData?.portal_language, "video_reports"), icon: <Video className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "data", label: t(playerData?.portal_language, "data"), icon: <Database className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "comparisons", label: t(playerData?.portal_language, "comparisons"), icon: <Users className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "scouting", label: t(playerData?.portal_language, "scouting"), icon: <Search className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "positional-guides", label: t(playerData?.portal_language, "positional"), icon: <Compass className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "schemes", label: t(playerData?.portal_language, "schemes"), icon: <Layers className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "concepts", label: t(playerData?.portal_language, "concepts"), icon: <Brain className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "cognisance", label: t(playerData?.portal_language, "cognisance"), icon: <Eye className="h-5 w-5 sm:h-6 sm:w-6" /> },
                        { value: "other", label: t(playerData?.portal_language, "other"), icon: <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6" /> },
                      ].map((tab) => (
                        <DropdownMenuItem
                          key={tab.value}
                          onClick={() => {
                            setActiveTab("analysis");
                            setActiveAnalysisTab(tab.value);
                            setShowAnalysisSub(false);
                          }}
                          className={`flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-lg transition-all py-4 font-bebas uppercase text-xs sm:text-sm ${
                            activeTab === "analysis" && activeAnalysisTab === tab.value
                              ? "bg-gold/20 text-gold border border-gold"
                              : "text-gold/80 hover:text-gold hover:bg-gold/10"
                          }`}
                        >
                          {tab.icon}
                          <span className="text-center leading-tight">{tab.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: '0.8fr 1.4fr 0.8fr', gridTemplateRows: 'auto auto auto' }}>
                    {[
                      { tab: "analysis", label: t(playerData?.portal_language, "analysis"), icon: <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7" />, isAnalysis: true },
                      { tab: "physical", label: t(playerData?.portal_language, "programming"), icon: <Calendar className="h-6 w-6 sm:h-7 sm:w-7" /> },
                      { tab: "nutrition", label: t(playerData?.portal_language, "nutrition"), icon: <UtensilsCrossed className="h-6 w-6 sm:h-7 sm:w-7" /> },
                      { tab: "invoices", label: t(playerData?.portal_language, "key_documents"), icon: <FileText className="h-6 w-6 sm:h-7 sm:w-7" /> },
                      { tab: "hub", label: t(playerData?.portal_language, "hub"), icon: <TrendingUp className="h-8 w-8 sm:h-9 sm:w-9" />, isHub: true },
                      { tab: "updates", label: t(playerData?.portal_language, "updates"), icon: <Bell className="h-6 w-6 sm:h-7 sm:w-7" /> },
                      { tab: "highlights", label: t(playerData?.portal_language, "highlights"), icon: <Play className="h-6 w-6 sm:h-7 sm:w-7" /> },
                      { tab: "transfer-hub", label: t(playerData?.portal_language, "transfer_hub"), icon: <RefreshCw className="h-6 w-6 sm:h-7 sm:w-7" /> },
                      { tab: "profile", label: t(playerData?.portal_language, "view_profile"), icon: <Eye className="h-6 w-6 sm:h-7 sm:w-7" /> },
                     ].filter((item) => !(item.tab === "invoices" && (typeof window !== "undefined" && sessionStorage.getItem("portal_hide_invoices") === "1"))).map((item) => (
                      <DropdownMenuItem
                        key={item.tab}
                        onClick={(e) => {
                          if (item.isAnalysis) {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAnalysisSub(true);
                          } else if (item.tab === "profile") {
                            setShowProfileModal(true);
                          } else {
                            setActiveTab(item.tab);
                          }
                        }}
                        className={`flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg transition-all py-6 sm:py-8 ${
                          item.isHub
                            ? `font-bebas uppercase text-xl sm:text-2xl border-2 py-8 sm:py-10 ${activeTab === "hub" ? "bg-gold/20 text-gold border-gold" : "text-gold border-gold/30 hover:bg-gold/10 hover:border-gold/60"}`
                            : `font-bebas uppercase text-sm sm:text-lg ${activeTab === item.tab || (item.isAnalysis && activeTab === "analysis") ? "bg-gold/20 text-gold border border-gold" : "text-gold/80 hover:text-gold hover:bg-gold/10"}`
                        }`}
                      >
                        {item.icon}
                        <span className="text-center leading-tight">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Tab Content with Transitions */}
        <AnimatePresence mode="wait">
          {activeTab === "hub" && (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Hub 
                programs={programs} 
                analyses={analyses} 
                playerData={playerData}
                dailyAphorism={dailyAphorism}
                portalSettings={portalSettings}
                portalLanguage={playerData?.portal_language}
                onNavigateToAnalysis={() => {
                  setActiveTab("analysis");
                  setActiveAnalysisTab("performance");
                }}
                onNavigateToComparisons={() => {
                  setActiveTab("analysis");
                  setActiveAnalysisTab("comparisons");
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
            </motion.div>
          )}

          {activeTab !== "hub" && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Upload Progress Indicator */}
            {uploadProgress !== null && (
              <Card className="mb-6 border-primary/30">
                <CardContent className="py-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-foreground">{t(playerData?.portal_language, "uploading_clip")}</span>
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
                    <TabsList className="grid grid-cols-3 sm:grid-cols-4 w-full h-auto bg-transparent p-0 gap-0 mb-0 rounded-none">
                      {[
                        { value: "performance", label: t(playerData?.portal_language, "performance") },
                        { value: "form", label: t(playerData?.portal_language, "form") },
                        { value: "video-reports", label: t(playerData?.portal_language, "video_reports") },
                        { value: "data", label: t(playerData?.portal_language, "data") },
                        { value: "comparisons", label: t(playerData?.portal_language, "comparisons") },
                        { value: "scouting", label: t(playerData?.portal_language, "scouting") },
                        { value: "positional-guides", label: t(playerData?.portal_language, "positional") },
                        { value: "schemes", label: t(playerData?.portal_language, "schemes") },
                        { value: "concepts", label: t(playerData?.portal_language, "concepts") },
                        { value: "cognisance", label: t(playerData?.portal_language, "cognisance") },
                        { value: "other", label: t(playerData?.portal_language, "other") },
                      ].map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="font-bebas uppercase text-xs sm:text-sm py-2.5 px-1 sm:px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:shadow-none text-muted-foreground hover:text-gold/70 transition-colors"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                <TabsContent value="performance">
                  <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
                    <CardHeader marble>
                      <div className="container mx-auto px-4">
                        <CardTitle className="font-heading tracking-tight">
                          {t(playerData?.portal_language, "performance_analysis")}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="container mx-auto px-4 space-y-4">
                      {analyses.length === 0 ? (
                        <PortalEmptyState icon="performance" title={t(playerData?.portal_language, "no_performance_reports")} description={t(playerData?.portal_language, "reports_will_appear")} />
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
                                    {new Date(analysis.analysis_date).toLocaleDateString(
                                      (() => { const lc = normalizePortalLanguage(playerData?.portal_language); const lm: Record<string, string> = { fr: "fr-FR", es: "es-ES", pt: "pt-PT", de: "de-DE", it: "it-IT", pl: "pl-PL", cs: "cs-CZ", ru: "ru-RU", tr: "tr-TR" }; return lm[lc] || "en-GB"; })()
                                    )}
                                  </span>
                                  {(() => {
                                    const statusLower = String(analysis.visibility_status || '').toLowerCase();
                                    const hideOpponent = ['hidden', 'draft', 'clipped'].includes(statusLower);
                                    if (hideOpponent || !analysis.opponent) return null;
                                    return (
                                      <>
                                        <span className="text-xs font-medium">vs {analysis.opponent}</span>
                                        {analysis.result && (
                                          <span className="text-xs text-muted-foreground">({analysis.result})</span>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {(() => {
                                    const isHidden = String(analysis.visibility_status || "").toLowerCase() === "hidden";
                                    const effectiveMinutes = isHidden && (analysis.placeholder_minutes ?? 0) > 0
                                      ? analysis.placeholder_minutes
                                      : analysis.minutes_played;

                                    return effectiveMinutes !== null && effectiveMinutes !== undefined ? (
                                      <span className="text-xs text-muted-foreground">• {effectiveMinutes}'</span>
                                    ) : null;
                                  })()}
                                </div>
                              </div>

                              {/* Line 2: Buttons - Order: R90, PRE, POST */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                  const isDraft = String(analysis.visibility_status || "").toLowerCase() === "draft";
                                  const isClipped = String(analysis.visibility_status || "").toLowerCase() === "clipped";
                                  const isHidden = String(analysis.visibility_status || "").toLowerCase() === "hidden";
                                  
                                  if (isDraft || isClipped) {
                                    return (
                                      <span className="bg-muted text-muted-foreground px-3 py-1.5 rounded text-sm font-bold">
                                        R90: ?
                                      </span>
                                    );
                                  }
                                  
                                  const effectiveR90 = isHidden && analysis.placeholder_raw_score != null && (analysis.placeholder_minutes ?? 0) > 0
                                    ? (analysis.placeholder_raw_score / analysis.placeholder_minutes) * 90
                                    : analysis.r90_score;

                                  if (effectiveR90 === null || effectiveR90 === undefined) return null;

                                  return (
                                    <button
                                      onClick={() => {
                                        setSelectedReportAnalysisId(analysis.id);
                                        setPerformanceReportDialogOpen(true);
                                      }}
                                      className={`${getR90Color(effectiveR90)} text-white px-3 py-1.5 rounded text-sm font-bold hover:opacity-80 transition-opacity cursor-pointer`}
                                    >
                                      R90: {effectiveR90.toFixed(2)}
                                    </button>
                                  );
                                })()}

                                {/* Pre-match buttons first */}
                                {analysis.analysis_writer_data?.analysis_type === "pre-match" && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/analysis/${analysis.analysis_writer_id}`)}
                                    className="text-xs border-0 bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 hover:from-slate-400 hover:to-slate-500"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    Pre-Match Analysis
                                  </Button>
                                )}
                                {analysis.tagged_analyses?.filter((ta: any) => ta.analysis_type === "pre-match").map((ta: any, taIdx: number) => (
                                  <Button 
                                    key={`tagged-pre-${taIdx}`}
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/analysis/${ta.id}`)}
                                    className="text-xs border-0 bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 hover:from-slate-400 hover:to-slate-500"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    Pre-Match Analysis
                                  </Button>
                                ))}

                                {/* Post-match buttons second */}
                                {analysis.analysis_writer_data?.analysis_type === "post-match" && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/analysis/${analysis.analysis_writer_id}`)}
                                    className="text-xs border-0 bg-[hsl(43,49%,61%)] text-black hover:bg-[hsl(43,49%,71%)]"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    Post-Match Analysis
                                  </Button>
                                )}
                                {analysis.tagged_analyses?.filter((ta: any) => ta.analysis_type === "post-match").map((ta: any, taIdx: number) => (
                                  <Button 
                                    key={`tagged-post-${taIdx}`}
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/analysis/${ta.id}`)}
                                    className="text-xs border-0 bg-[hsl(43,49%,61%)] text-black hover:bg-[hsl(43,49%,71%)]"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    Post-Match Analysis
                                  </Button>
                                ))}
                                
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
                        <PortalEmptyState icon="concepts" title="No concepts available yet" description="Tactical concepts and principles will appear here." />
                      ) : (
                        <Accordion type="single" collapsible className="space-y-4">
                          {concepts.map((concept) => (
                            <AccordionItem key={concept.id} value={concept.id} className="border rounded-lg px-6">
                              <AccordionTrigger className="hover:no-underline py-4">
                                <h3 className="text-2xl font-bebas uppercase tracking-wider text-left">
                                  {concept.title || "Untitled Concept"}
                                </h3>
                              </AccordionTrigger>
                              <AccordionContent className="pb-6 space-y-4">
                                {concept.points && Array.isArray(concept.points) && concept.points.length > 0 && (
                                  <div className="grid gap-4">
                                    {concept.points.map((point: any, index: number) => (
                                      <div key={index} className="space-y-2">
                                        {point.title && (
                                          <h5 className="font-semibold">{point.title}</h5>
                                        )}
                                        {point.description && (
                                          <div className="text-muted-foreground">
                                            <MarkdownContent content={point.description} />
                                          </div>
                                        )}
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
                                    <div className="text-muted-foreground">
                                      <MarkdownContent content={concept.explanation} />
                                    </div>
                                  </div>
                                )}
                                {concept.media && concept.media.length > 0 && (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {concept.media.map((url: string, idx: number) => (
                                      url.match(/\.(mp4|webm|mov)$/i) ? (
                                        <video key={idx} src={url} controls className="w-full rounded-lg" />
                                      ) : (
                                        <img key={idx} src={url} alt={`Concept media ${idx + 1}`} className="w-full h-48 object-cover rounded-lg" />
                                      )
                                    ))}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
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

                <TabsContent value="comparisons">
                  <AnalysisComparisons analyses={analyses} playerData={playerData} />
                </TabsContent>

                <TabsContent value="video-reports">
                  <AnalysisVideoReports analyses={analyses} playerId={playerData?.id || ''} />
                </TabsContent>

                <TabsContent value="data">
                  <AnalysisDataTab analyses={analyses} playerData={playerData} />
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
                                // Special case for touches in box per 90 (needs both touches_in_box and minutes_played)
                                if (metricKey === "touchesinbox") {
                                  return analyses.some(a => 
                                    a.striker_stats && 
                                    a.striker_stats.touches_in_box != null &&
                                    a.minutes_played != null &&
                                    Number(a.minutes_played) > 0
                                  );
                                }
                                // Special case for aerial duel win percentage
                                if (metricKey === "aerialduelswinpct") {
                                  return analyses.some(a => 
                                    a.striker_stats && 
                                    a.striker_stats.aerial_duels_won != null &&
                                    a.striker_stats.aerial_duels_attempted != null &&
                                    Number(a.striker_stats.aerial_duels_attempted) > 0
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
                                { value: "xg", label: "xG (per 90)", statKey: "xG_adj_per90" },
                                { value: "xa", label: "xA (per 90)", statKey: "xA_adj_per90" },
                                { value: "regains", label: "Regains (per 90)", statKey: "regains_adj_per90" },
                                { value: "interceptions", label: "Interceptions (per 90)", statKey: "interceptions_per90" },
                                { value: "xgchain", label: "xG Chain (per 90)", statKey: "xGChain_per90" },
                                { value: "xgbuildup", label: "xG Buildup (per 90)", statKey: "xGBuildup_per90" },
                                { value: "progressivepasses", label: "Progressive Passes (per 90)", statKey: "progressive_passes_adj_per90" },
                                { value: "ppturnoversratio", label: "PP/Turnovers Ratio", statKey: "progressive_passes,turnovers" },
                                { value: "shots", label: "Shots", statKey: "shots" },
                                { value: "shotsontarget", label: "Shots on Target (per 90)", statKey: "ShotsOnTarget_per90" },
                                { value: "triplethreatxc", label: "Triple Threat xC (per 90)", statKey: "triple_threat_xC_per90" },
                                { value: "movementtofeetxc", label: "Movement to Feet xC (per 90)", statKey: "movement_to_feet_xC_per90" },
                                { value: "movementinbehindxc", label: "Movement in Behind xC (per 90)", statKey: "movement_in_behind_xC_per90" },
                                { value: "movementdownsidexc", label: "Movement Down Side xC (per 90)", statKey: "movement_down_side_xC_per90" },
                                { value: "crossingmovementxc", label: "Crossing Movement xC (per 90)", statKey: "crossing_movement_xC_per90" },
                                { value: "dribbles", label: "Dribbles (per 90)", statKey: "dribbles_per90" },
                                { value: "dribblesattempted", label: "Dribbles Attempted (per 90)", statKey: "dribbles_attempted_per90" },
                                { value: "successfuldribbles", label: "Successful Dribbles", statKey: "successful_dribbles" },
                                { value: "turnovers", label: "Turnovers (per 90)", statKey: "turnovers_adj_per90" },
                                { value: "touchesinbox", label: "Touches in Box (per 90)", statKey: "touches_in_box,minutes_played" },
                                { value: "aerialduelswinpct", label: "Aerial Duel Win %", statKey: "aerial_duels_won,aerial_duels_attempted" },
                                { value: "duelswon", label: "Duels Won", statKey: "duels_won" },
                                { value: "longpassescompleted", label: "Long Passes Completed", statKey: "long_passes_completed" },
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
                          if (selectedFormMetric === "r90") return effectiveR90(analysis);
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
                          
                          // Special case for touches in box per 90 (calculate from total and minutes)
                          if (selectedFormMetric === "touchesinbox") {
                            const touches = analysis.striker_stats.touches_in_box;
                            const minutes = analysis.minutes_played;
                            if (touches != null && minutes != null && Number(minutes) > 0) {
                              return (Number(touches) / Number(minutes)) * 90;
                            }
                            return null;
                          }
                          
                          // Special case for aerial duel win percentage
                          if (selectedFormMetric === "aerialduelswinpct") {
                            const won = analysis.striker_stats.aerial_duels_won;
                            const attempted = analysis.striker_stats.aerial_duels_attempted;
                            if (won != null && attempted != null && Number(attempted) > 0) {
                              return (Number(won) / Number(attempted)) * 100;
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
                                          selectedFormMetric === "shots" ? "shots" :
                                          selectedFormMetric === "shotsontarget" ? "ShotsOnTarget_per90" :
                                          selectedFormMetric === "triplethreatxc" ? "triple_threat_xC_per90" :
                                          selectedFormMetric === "movementtofeetxc" ? "movement_to_feet_xC_per90" :
                                          selectedFormMetric === "movementinbehindxc" ? "movement_in_behind_xC_per90" :
                                          selectedFormMetric === "movementdownsidexc" ? "movement_down_side_xC_per90" :
                                          selectedFormMetric === "crossingmovementxc" ? "crossing_movement_xC_per90" :
                                          selectedFormMetric === "dribbles" ? "dribbles_per90" :
                                          selectedFormMetric === "dribblesattempted" ? "dribbles_attempted_per90" :
                                          selectedFormMetric === "successfuldribbles" ? "successful_dribbles" :
                                          selectedFormMetric === "turnovers" ? "turnovers_adj_per90" :
                                          selectedFormMetric === "duelswon" ? "duels_won" :
                                          selectedFormMetric === "longpassescompleted" ? "long_passes_completed" : null;
                          
                          return statKey ? analysis.striker_stats[statKey] : null;
                        };
                        
                        // Get metric label
                        const getMetricLabel = () => {
                          switch(selectedFormMetric) {
                            case "r90": return "R90";
                            case "xg": return "xG (per 90)";
                            case "xa": return "xA (per 90)";
                            case "regains": return "Regains (per 90)";
                            case "interceptions": return "Interceptions (per 90)";
                            case "xgchain": return "xGChain (per 90)";
                            case "xgbuildup": return "xGBuildup (per 90)";
                            case "progressivepasses": return "Progressive Passes (per 90)";
                            case "ppturnoversratio": return "PP/TO Ratio";
                            case "shots": return "Shots";
                            case "shotsontarget": return "Shots on Target (per 90)";
                            case "triplethreatxc": return "Triple Threat xC (per 90)";
                            case "movementtofeetxc": return "Movement to Feet xC (per 90)";
                            case "movementinbehindxc": return "Movement in Behind xC (per 90)";
                            case "movementdownsidexc": return "Movement Down Side xC (per 90)";
                            case "crossingmovementxc": return "Crossing Movement xC (per 90)";
                            case "dribbles": return "Dribbles (per 90)";
                            case "dribblesattempted": return "Dribbles Attempted (per 90)";
                            case "successfuldribbles": return "Successful Dribbles";
                            case "turnovers": return "Turnovers (per 90)";
                            case "touchesinbox": return "Touches in Box (per 90)";
                            case "aerialduelswinpct": return "Aerial Duel Win %";
                            case "duelswon": return "Duels Won";
                            case "longpassescompleted": return "Long Passes";
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
                            strikerStats: (a as any).striker_stats,
                            visibilityStatus: (a as any).visibility_status,
                            isPlayable: (
                              ((a as any).visibility_status === 'live' || (a as any).visibility_status === 'clipped')
                              && typeof a.id === 'string'
                              && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.id)
                            ),
                          }));

                        // Calculate max Y-axis value - dynamic based on metric
                        const maxScore = chartData.length > 0 
                          ? Math.ceil(Math.max(...chartData.map(d => d.score)) * 1.1) // 10% padding
                          : 4;

                        // Function to get grade boundaries for reference lines - uses dynamic database configs
                        const getGradeBoundaries = () => {
                          // Get the database metric key for this selected metric
                          const metricKey = METRIC_KEY_MAP[selectedFormMetric];
                          
                          // Try to get dynamic boundaries from database first
                          if (metricKey && hasThresholds(metricKey)) {
                            return getDynamicGradeBoundaries(metricKey);
                          }
                          
                          // Fallback to hardcoded values for core metrics that may not be in DB yet
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

                        // Function to get color based on metric and score - uses dynamic database configs
                        const getMetricColor = (score: number) => {
                          // Striker/Winger xC metrics use grey
                          const strikerMetrics = ["triplethreatxc", "movementtofeetxc", "movementinbehindxc", "movementdownsidexc", "crossingmovementxc"];
                          if (strikerMetrics.includes(selectedFormMetric)) {
                            return "hsl(var(--muted-foreground))";
                          }
                          
                          // Try dynamic config first
                          const metricKey = METRIC_KEY_MAP[selectedFormMetric];
                          if (metricKey && hasThresholds(metricKey)) {
                            return getGradeForScore(metricKey, score).color;
                          }
                          
                          // Fallback to hardcoded
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
                              return "hsl(var(--muted-foreground))";
                          }
                        };

                        // Function to get grade based on metric and score - uses dynamic database configs
                        const getMetricGrade = (score: number) => {
                          // Striker/Winger xC metrics show the score value, not a grade
                          const strikerMetrics = ["triplethreatxc", "movementtofeetxc", "movementinbehindxc", "movementdownsidexc", "crossingmovementxc"];
                          if (strikerMetrics.includes(selectedFormMetric)) {
                            return score.toFixed(3);
                          }
                          
                          // Try dynamic config first
                          const metricKey = METRIC_KEY_MAP[selectedFormMetric];
                          if (metricKey && hasThresholds(metricKey)) {
                            return getGradeForScore(metricKey, score).grade;
                          }
                          
                          // Fallback to hardcoded
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
                                        {data?.isPlayable && (
                                          <g
                                            transform="translate(0, 32)"
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/analysis/${data.analysisId}`);
                                            }}
                                          >
                                            <circle r={9} fill="hsl(43, 49%, 61%)" />
                                            <polygon points="-3,-4 -3,4 4,0" fill="#000" />
                                          </g>
                                        )}
                                        <text 
                                          x={0} 
                                          y={data?.isPlayable ? 48 : 30} 
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
                    <CardContent className="container mx-auto px-4 space-y-6 md:space-y-8">
                      {(() => {
                        const matchItems = otherAnalyses.filter((it: any) => it.analyses && it.analyses.category !== "training");
                        const trainingItems = otherAnalyses.filter((it: any) => it.analyses && it.analyses.category === "training");

                        const renderItem = (item: any) => {
                          const analysis = item.analyses;
                          if (!analysis) return null;
                          const isTraining = analysis.category === "training";
                          return (
                            <div
                              key={item.id}
                              className="border rounded-lg p-3 md:p-4 hover:border-primary transition-colors bg-card cursor-pointer"
                              onClick={() => navigate(`/analysis/${analysis.id}`)}
                            >
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                                <div className="flex-1 w-full">
                                  <h3 className="font-semibold text-base md:text-lg mb-1">
                                    {analysis.title || `${analysis.home_team || ''} vs ${analysis.away_team || ''}`}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                                      isTraining
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : analysis.analysis_type === "pre-match"
                                          ? "bg-slate-300 text-slate-900"
                                          : "bg-[hsl(43,49%,61%)] text-black"
                                    }`}>
                                      {isTraining
                                        ? "Training"
                                        : analysis.analysis_type === "pre-match" ? "Pre-Match" : "Post-Match"}
                                    </span>
                                    {analysis.match_date && (
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(analysis.match_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto flex-shrink-0"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  <span className="text-xs md:text-sm">View Analysis</span>
                                </Button>
                              </div>
                            </div>
                          );
                        };

                        if (otherAnalyses.length === 0) {
                          return (
                            <div className="py-8">
                              <p className="text-center text-muted-foreground text-sm md:text-base">No other analysis available yet.</p>
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Match Analysis</h4>
                              {matchItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No match analysis available yet.</p>
                              ) : (
                                <div className="space-y-3">{matchItems.map(renderItem)}</div>
                              )}
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Training</h4>
                              {trainingItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No training analysis available yet.</p>
                              ) : (
                                <div className="space-y-3">{trainingItems.map(renderItem)}</div>
                              )}
                            </div>
                          </>
                        );
                      })()}
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
                                      {t(playerData?.portal_language, "schedule")}
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
                                                   <span className="hidden md:inline text-center w-full">{t(playerData?.portal_language, "week_start_date")}</span>
                                                   <span className="md:hidden text-center w-full">{t(playerData?.portal_language, "week_start")}</span>
                                                </div>
                                              {(() => {
                                                const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
                                                const shortDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                                                return dayKeys.map((dayKey, idx) => (
                                                 <div 
                                                  key={dayKey}
                                                  className="p-1 md:p-4 font-bebas uppercase text-xs md:text-lg flex items-center justify-center rounded-lg"
                                                     style={{ 
                                                       backgroundColor: 'hsl(43, 49%, 61%)',
                                                       color: 'hsl(0, 0%, 0%)'
                                                     }}
                                                   >
                                                     <span className="hidden md:inline">
                                                       {t(playerData?.portal_language, dayKey)}
                                                     </span>
                                                     <span className="md:hidden">{t(playerData?.portal_language, shortDayKeys[idx])}</span>
                                                   </div>
                                                ));
                                              })()}
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
              {/* Injury Log Section */}
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0 mt-6">
                <CardHeader marble>
                  <div className="container mx-auto px-4">
                    <CardTitle className="font-heading tracking-tight">Injury Log</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="container mx-auto px-4 py-4">
                  {playerData?.id && <InjuryLog playerId={playerData.id} />}
                </CardContent>
              </Card>

              {/* Psychology / SPQ Section */}
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0 mt-6">
                <CardHeader marble>
                  <div className="container mx-auto px-4">
                    <CardTitle className="font-heading tracking-tight flex items-center gap-2">
                      <Brain className="h-5 w-5" /> Psychology
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="container mx-auto px-4 py-4">
                  {playerData?.id && <PlayerSpqHistory playerId={playerData.id} variant="inline" />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0">
                <CardContent className="container mx-auto px-4 pt-2">
                  <Tabs defaultValue={invoices.length > 0 ? "invoices" : "contracts"} className="w-full">
                    <TabsList className={`grid w-full gap-2 mb-0 bg-muted h-auto p-2`} style={{ gridTemplateColumns: `repeat(${[invoices.length > 0, invoices.some(inv => inv.status === 'pending' || inv.status === 'overdue'), true, true].filter(Boolean).length}, 1fr)` }}>
                  {invoices.length > 0 && (
                    <TabsTrigger value="invoices" className="font-bebas uppercase text-sm sm:text-base">
                      Invoices
                    </TabsTrigger>
                  )}
                  {invoices.some(inv => inv.status === 'pending' || inv.status === 'overdue') && (
                    <TabsTrigger value="payment" className="font-bebas uppercase text-sm sm:text-base">
                      Make Payment
                    </TabsTrigger>
                  )}
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
                        <PortalEmptyState icon="invoices" title="No invoices yet" description="Your invoices and billing documents will appear here." />
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
                    <TabsList className="grid w-full grid-cols-3 gap-2 mb-2 bg-muted h-auto p-2">
                      <TabsTrigger value="match" className="font-bebas uppercase">
                        Match Highlights
                      </TabsTrigger>
                      <TabsTrigger value="best" className="font-bebas uppercase">
                        Best Clips
                      </TabsTrigger>
                      <TabsTrigger value="clipper" className="font-bebas uppercase">
                        Match Clipper
                      </TabsTrigger>
                    </TabsList>
                        
                        <TabsContent value="match">
                          {!highlightsData.matchHighlights || highlightsData.matchHighlights.length === 0 ? (
                            <PortalEmptyState icon="highlights" title="No match highlights yet" description="Match highlight compilations will be added here." />
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
                                <PortalEmptyState icon="highlights" title="No clips yet" description="Upload your best clips to build your compilation reel.">
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
                                </PortalEmptyState>
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

                  <TabsContent value="clipper">
                    {playerData?.id && (
                      <PlayerMatchClipper
                        playerId={playerData.id}
                        playerEmail={localStorage.getItem("player_email") || sessionStorage.getItem("player_email") || ""}
                      />
                    )}
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
                        <PortalEmptyState icon="updates" title="No updates yet" description="Important updates and announcements will appear here." />
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
            </motion.div>
          )}
        </AnimatePresence>
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
        portalLanguage={playerData?.portal_language}
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
      {!(typeof window !== "undefined" && sessionStorage.getItem("portal_hide_logout") === "1") && (
      <div className="container mx-auto px-4 pb-8 mb-20 md:mb-0">
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
            {t(playerData?.portal_language, "log_out")}
          </Button>
          <Button 
            type="button"
            variant="outline"
            size="icon"
            onClick={async () => {
              try {
                // Clear all offline caches first
                await CacheManager.clearAllCaches();
                
                // Clear browser cache by adding timestamp to URL
                const timestamp = Date.now();
                const url = new URL(window.location.href);
                url.searchParams.set('_refresh', timestamp.toString());
                
                // Force reload bypassing cache
                window.location.replace(url.toString());
              } catch (error) {
                console.error('Error refreshing:', error);
                // Fallback to simple reload with cache bust
                window.location.reload();
              }
            }}
            className="text-gold hover:text-gold/80"
            title="Refresh app"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>
      )}
      
      {/* Performance Report Dialog */}
      <PerformanceReportDialog
        open={performanceReportDialogOpen}
        onOpenChange={setPerformanceReportDialogOpen}
        analysisId={selectedReportAnalysisId}
      />

      {/* Portal Music Player */}
      <PortalMusicPlayer
        tracks={(portalSettings?.music_tracks as any[] || []).map((t: any) => ({ url: t.url || '', name: t.name || 'Track' }))}
        enabled={
          portalSettings?.show_music_player === true &&
          !(typeof window !== "undefined" && sessionStorage.getItem("portal_hide_music") === "1")
        }
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setNavDropdownOpen(false); }}
        onMoreClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => setNavDropdownOpen(true), 300);
        }}
        lang={playerData?.portal_language}
      />
    </div>
  );
};

export default Dashboard;
