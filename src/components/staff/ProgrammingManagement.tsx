import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { toast } from "sonner";
import { Plus, Trash2, Check, Edit, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Database, Sparkles, Calendar, FolderOpen, Save, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExerciseDatabaseSelector } from "./ExerciseDatabaseSelector";
import { SessionDatabaseSelector } from "./SessionDatabaseSelector";
import { SaveToCoachingDBDialog } from "./SaveToCoachingDBDialog";
import { ProgrammingWeeksEditor } from "./programming/ProgrammingWeeksEditor";
interface ProgrammingManagementProps {
  isOpen?: boolean;
  onClose?: () => void;
  playerId: string;
  playerName: string;
  isAdmin: boolean;
  embedded?: boolean;
}

interface Exercise {
  name: string;
  description: string;
  repetitions: string;
  sets: string;
  load: string;
  recoveryTime: string;
  videoUrl: string;
}

interface SessionData {
  exercises: Exercise[];
  staffNotes?: string;
}

interface WeeklySchedule {
  week?: string;
  week_start_date: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  mondayColor: string;
  tuesdayColor: string;
  wednesdayColor: string;
  thursdayColor: string;
  fridayColor: string;
  saturdayColor: string;
  sundayColor: string;
  mondayImage?: string;
  tuesdayImage?: string;
  wednesdayImage?: string;
  thursdayImage?: string;
  fridayImage?: string;
  saturdayImage?: string;
  sundayImage?: string;
  mondayFixture?: string;
  tuesdayFixture?: string;
  wednesdayFixture?: string;
  thursdayFixture?: string;
  fridayFixture?: string;
  saturdayFixture?: string;
  sundayFixture?: string;
  mondayTeam?: string;
  tuesdayTeam?: string;
  wednesdayTeam?: string;
  thursdayTeam?: string;
  fridayTeam?: string;
  saturdayTeam?: string;
  sundayTeam?: string;
  mondayTeamImage?: string;
  tuesdayTeamImage?: string;
  wednesdayTeamImage?: string;
  thursdayTeamImage?: string;
  fridayTeamImage?: string;
  saturdayTeamImage?: string;
  sundayTeamImage?: string;
  scheduleNotes: string;
}

interface ProgrammingData {
  phaseName: string;
  phaseDates: string;
  startDate: string;
  endDate: string;
  overviewText: string;
  sessionA: SessionData;
  sessionB: SessionData;
  sessionC: SessionData;
  sessionD: SessionData;
  sessionE: SessionData;
  sessionF: SessionData;
  sessionG: SessionData;
  sessionH: SessionData;
  preSessionA: SessionData;
  preSessionB: SessionData;
  preSessionC: SessionData;
  preSessionD: SessionData;
  preSessionE: SessionData;
  preSessionF: SessionData;
  preSessionG: SessionData;
  preSessionH: SessionData;
  weeklySchedules: WeeklySchedule[];
  testing: string;
}

const sessionLabels = [
  { key: 'preSessionA', label: 'Pre-A' },
  { key: 'sessionA', label: 'Session A' },
  { key: 'preSessionB', label: 'Pre-B' },
  { key: 'sessionB', label: 'Session B' },
  { key: 'preSessionC', label: 'Pre-C' },
  { key: 'sessionC', label: 'Session C' },
  { key: 'preSessionD', label: 'Pre-D' },
  { key: 'sessionD', label: 'Session D' },
  { key: 'preSessionE', label: 'Pre-E' },
  { key: 'sessionE', label: 'Session E' },
  { key: 'preSessionF', label: 'Pre-F' },
  { key: 'sessionF', label: 'Session F' },
  { key: 'preSessionG', label: 'Pre-G' },
  { key: 'sessionG', label: 'Session G' },
  { key: 'preSessionH', label: 'Pre-H' },
  { key: 'sessionH', label: 'Session H' },
];

const emptyExercise = (): Exercise => ({
  name: '',
  description: '',
  repetitions: '',
  sets: '',
  load: '',
  recoveryTime: '',
  videoUrl: ''
});

const emptySession = (): SessionData => ({
  exercises: [],
});

const emptyWeeklySchedule = (): WeeklySchedule => ({
  week: '',
  week_start_date: '',
  monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '',
  mondayColor: '', tuesdayColor: '', wednesdayColor: '', thursdayColor: '', fridayColor: '', saturdayColor: '', sundayColor: '',
  mondayImage: '', tuesdayImage: '', wednesdayImage: '', thursdayImage: '', fridayImage: '', saturdayImage: '', sundayImage: '',
  mondayFixture: '', tuesdayFixture: '', wednesdayFixture: '', thursdayFixture: '', fridayFixture: '', saturdayFixture: '', sundayFixture: '',
  mondayTeam: '', tuesdayTeam: '', wednesdayTeam: '', thursdayTeam: '', fridayTeam: '', saturdayTeam: '', sundayTeam: '',
  mondayTeamImage: '', tuesdayTeamImage: '', wednesdayTeamImage: '', thursdayTeamImage: '', fridayTeamImage: '', saturdayTeamImage: '', sundayTeamImage: '',
  scheduleNotes: ''
});

const initialProgrammingData = (): ProgrammingData => ({
  phaseName: '',
  phaseDates: '',
  startDate: '',
  endDate: '',
  overviewText: '',
  sessionA: emptySession(),
  sessionB: emptySession(),
  sessionC: emptySession(),
  sessionD: emptySession(),
  sessionE: emptySession(),
  sessionF: emptySession(),
  sessionG: emptySession(),
  sessionH: emptySession(),
  preSessionA: emptySession(),
  preSessionB: emptySession(),
  preSessionC: emptySession(),
  preSessionD: emptySession(),
  preSessionE: emptySession(),
  preSessionF: emptySession(),
  preSessionG: emptySession(),
  preSessionH: emptySession(),
  weeklySchedules: [],
  testing: '',
});

export const ProgrammingManagement = ({ isOpen, onClose, playerId, playerName, isAdmin, embedded }: ProgrammingManagementProps) => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
  const [programmingData, setProgrammingData] = useState<ProgrammingData>(initialProgrammingData());
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [showUploadProgram, setShowUploadProgram] = useState(false);
  const [showSaveToDBDialog, setShowSaveToDBDialog] = useState(false);
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const [isSessionSelectorOpen, setIsSessionSelectorOpen] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPasteScheduleDialog, setShowPasteScheduleDialog] = useState(false);
  const [pasteScheduleText, setPasteScheduleText] = useState("");
  const [pasteScheduleWeekIndex, setPasteScheduleWeekIndex] = useState<number | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [coachingPrograms, setCoachingPrograms] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [exerciseTitles, setExerciseTitles] = useState<string[]>([]);
  const [showFixturesDialog, setShowFixturesDialog] = useState(false);
  const [selectedFixturePlayer, setSelectedFixturePlayer] = useState("");
  const [fetchingFixtures, setFetchingFixtures] = useState(false);
  const [availableFixtures, setAvailableFixtures] = useState<any[]>([]);
  const [selectedFixtures, setSelectedFixtures] = useState<Set<number>>(new Set());
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  
  // Ref to track pending exercise name lookups for debouncing
  const exerciseLookupTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Auto-save backup key
  const getBackupKey = () => `program_backup_${playerId}_${selectedProgram?.id || 'new'}`;

  // Auto-save to localStorage whenever programming data changes
  useEffect(() => {
    if (selectedProgram && hasUnsavedChanges) {
      const backupData = {
        programId: selectedProgram.id,
        programName: selectedProgram.program_name,
        data: programmingData,
        timestamp: Date.now()
      };
      localStorage.setItem(getBackupKey(), JSON.stringify(backupData));
    }
  }, [programmingData, selectedProgram, hasUnsavedChanges]);

  // Check for recovery data on mount
  useEffect(() => {
    if ((isOpen || embedded) && selectedProgram) {
      const backupKey = getBackupKey();
      const backup = localStorage.getItem(backupKey);
      if (backup) {
        try {
          const backupData = JSON.parse(backup);
          if (backupData.programId === selectedProgram.id && 
              Date.now() - backupData.timestamp < 24 * 60 * 60 * 1000) {
            setShowRecoveryBanner(true);
          }
        } catch (e) {
          localStorage.removeItem(backupKey);
        }
      }
    }
  }, [isOpen, embedded, selectedProgram]);

  // Recovery function
  const recoverUnsavedChanges = () => {
    const backupKey = getBackupKey();
    console.log('Recovery attempt - backup key:', backupKey);
    const backup = localStorage.getItem(backupKey);
    console.log('Recovery attempt - backup data exists:', !!backup);
    
    if (backup) {
      try {
        const backupData = JSON.parse(backup);
        console.log('Recovery attempt - parsed backup:', backupData);
        setProgrammingData(backupData.data);
        setHasUnsavedChanges(true);
        toast.success('Recovered unsaved changes!');
        setShowRecoveryBanner(false);
      } catch (e) {
        console.error('Recovery failed:', e);
        toast.error('Failed to recover data');
      }
    } else {
      console.log('No backup found at key:', backupKey);
      toast.error('No backup data found');
    }
  };

  const dismissRecovery = () => {
    localStorage.removeItem(getBackupKey());
    setShowRecoveryBanner(false);
  };

  // Clear backup after successful save
  const clearBackup = () => {
    localStorage.removeItem(getBackupKey());
    setHasUnsavedChanges(false);
  };

  // Track changes
  const updateProgrammingData = (updates: Partial<ProgrammingData>) => {
    setProgrammingData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  // Cleanup exercise lookup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(exerciseLookupTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if ((isOpen || embedded) && playerId) {
      // Clear any pending lookups when switching players
      Object.values(exerciseLookupTimeoutRef.current).forEach(clearTimeout);
      exerciseLookupTimeoutRef.current = {};
      
      // Clear any selected program and data when switching players
      setSelectedProgram(null);
      setProgrammingData(initialProgrammingData());
      setSelectedSession(null);
      setHasUnsavedChanges(false);
      setShowRecoveryBanner(false);
      
      loadPrograms();
      loadCoachingPrograms();
      fetchExerciseTitles();
      loadAllPlayers();
    }
  }, [isOpen, embedded, playerId]);

  const loadAllPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, club')
        .order('name');
      
      if (error) throw error;
      setAllPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const fetchExerciseTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('coaching_exercises')
        .select('title')
        .order('title');

      if (error) throw error;

      const titles = data?.map(item => item.title) || [];
      setExerciseTitles(titles);
    } catch (error) {
      console.error('Error fetching exercise titles:', error);
    }
  };

  const loadCoachingPrograms = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('coaching_programmes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoachingPrograms(data || []);
    } catch (error) {
      console.error('Error loading coaching programs:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Helper function to create a deep copy of data to ensure complete independence
  const deepClone = <T,>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };

  const hasTemplateSessionDetail = (sessions: any) => {
    if (!sessions || typeof sessions !== 'object' || Array.isArray(sessions)) return false;
    return Object.values(sessions).some((session: any) => Array.isArray(session?.exercises) && session.exercises.length > 0);
  };

  const normaliseSpsTemplateSessions = (template: any) => {
    const attachments = template?.attachments || {};
    const legacySessions = deepClone(attachments.sessions || {});
    if (hasTemplateSessionDetail(legacySessions)) return legacySessions;

    const spsSessions = Array.isArray(attachments.sps_sessions) ? attachments.sps_sessions : [];
    const normalised: Record<string, { exercises: any[] }> = {};
    spsSessions.forEach((session: any) => {
      const rawKey = String(session?.key || '').trim();
      const compact = rawKey.replace(/[\s_-]/g, '').toLowerCase();
      const preMatch = compact.match(/^pre(?:session)?([a-h])$/);
      const mainMatch = compact.match(/^(?:session)?([a-h])$/);
      const sessionKey = preMatch ? `PRE-${preMatch[1].toUpperCase()}` : mainMatch ? mainMatch[1].toUpperCase() : null;
      if (!sessionKey) return;
      normalised[sessionKey] = { exercises: deepClone(Array.isArray(session?.exercises) ? session.exercises : []) };
    });
    return normalised;
  };

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('player_programs')
        .select('*')
        .eq('player_id', playerId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('Failed to load programs');
    }
  };

  const loadProgramDetails = async (programId: string) => {
    console.log('Loading program details for:', programId);
    try {
      const { data, error } = await supabase
        .from('player_programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (error) throw error;
      
      console.log('Program data loaded:', data);
      console.log('Sessions:', data.sessions);

      // Deep clone all data to ensure complete independence between programs
      const sessions = deepClone((data.sessions || {}) as any);
      const weeklySchedules = deepClone((data.weekly_schedules || []) as any[]);

      setSelectedProgram(data);
      setProgrammingData({
        phaseName: data.phase_name || '',
        phaseDates: data.phase_dates || '',
        startDate: (data as any).start_date || '',
        endDate: data.end_date || '',
        overviewText: data.overview_text || '',
        sessionA: sessions.A || sessions.sessionA || emptySession(),
        sessionB: sessions.B || sessions.sessionB || emptySession(),
        sessionC: sessions.C || sessions.sessionC || emptySession(),
        sessionD: sessions.D || sessions.sessionD || emptySession(),
        sessionE: sessions.E || sessions.sessionE || emptySession(),
        sessionF: sessions.F || sessions.sessionF || emptySession(),
        sessionG: sessions.G || sessions.sessionG || emptySession(),
        sessionH: sessions.H || sessions.sessionH || emptySession(),
        preSessionA: sessions['PRE-A'] || sessions.preSessionA || emptySession(),
        preSessionB: sessions['PRE-B'] || sessions.preSessionB || emptySession(),
        preSessionC: sessions['PRE-C'] || sessions.preSessionC || emptySession(),
        preSessionD: sessions['PRE-D'] || sessions.preSessionD || emptySession(),
        preSessionE: sessions['PRE-E'] || sessions.preSessionE || emptySession(),
        preSessionF: sessions['PRE-F'] || sessions.preSessionF || emptySession(),
        preSessionG: sessions['PRE-G'] || sessions.preSessionG || emptySession(),
        preSessionH: sessions['PRE-H'] || sessions.preSessionH || emptySession(),
        weeklySchedules: weeklySchedules,
        testing: ''
      });
      
      console.log('Programming data set successfully');
      
      // Reset state when loading a program
      setHasUnsavedChanges(false);
      setShowRecoveryBanner(false);
    } catch (error) {
      console.error('Error loading program details:', error);
      toast.error('Failed to load program details');
    }
  };

  const createNewProgram = async () => {
    if (!newProgramName.trim()) {
      toast.error('Please enter a program name');
      return;
    }

    setLoading(true);
    try {
      // Get max display_order for this player
      const { data: existingPrograms } = await supabase
        .from('player_programs')
        .select('display_order')
        .eq('player_id', playerId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existingPrograms && existingPrograms.length > 0 
        ? (existingPrograms[0].display_order || 0) + 1 
        : 1;

      // If Excel file is uploaded, process it with AI
      let aiParsedData: any = null;
      if (excelFile) {
        setUploadingExcel(true);
        console.log('Starting file upload for:', excelFile.name);
        try {
          const formData = new FormData();
          formData.append('file', excelFile);

          // Get the session for authentication
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Authentication required - please log in again');
          }

          console.log('Calling parse-program-excel edge function...');
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-program-excel`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: formData,
            }
          );

          console.log('Response status:', response.status);
          
          if (!response.ok) {
            let errorMessage = 'Failed to parse file';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
              console.error('Server error response:', errorData);
            } catch (e) {
              console.error('Could not parse error response');
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();
          console.log('Parse result:', result);
          
          if (!result.data) {
            throw new Error('No data returned from parser');
          }
          
          aiParsedData = result.data;
          toast.success('✅ File parsed successfully! Creating program...');
        } catch (error: any) {
          console.error('File parsing error:', error);
          toast.error(
            <div>
              <p className="font-semibold">Failed to parse file</p>
              <p className="text-xs">{error.message}</p>
              <p className="text-xs mt-1">Try creating a blank program instead and adding exercises manually.</p>
            </div>,
            { duration: 8000 }
          );
          setUploadingExcel(false);
          setLoading(false);
          return;
        } finally {
          setUploadingExcel(false);
        }
      } else {
        console.log('No file uploaded - creating blank program');
        toast.success('Creating blank program with empty sessions...');
      }

      // Create the program with AI-parsed data if available
      const programData: any = {
        player_id: playerId,
        program_name: newProgramName,
        is_current: programs.length === 0,
        display_order: nextOrder
      };

      if (aiParsedData) {
        programData.phase_name = aiParsedData.phaseName;
        programData.phase_dates = aiParsedData.phaseDates;
        programData.overview_text = aiParsedData.overviewText;
        programData.sessions = aiParsedData.sessions;
        programData.weekly_schedules = aiParsedData.weeklySchedules;
      } else {
        programData.sessions = {
          A: { exercises: [] },
          B: { exercises: [] },
          C: { exercises: [] },
          D: { exercises: [] },
          E: { exercises: [] },
          F: { exercises: [] },
          G: { exercises: [] },
          H: { exercises: [] },
          'PRE-A': { exercises: [] },
          'PRE-B': { exercises: [] },
          'PRE-C': { exercises: [] },
          'PRE-D': { exercises: [] },
          'PRE-E': { exercises: [] },
          'PRE-F': { exercises: [] },
          'PRE-G': { exercises: [] },
          'PRE-H': { exercises: [] },
        };
        programData.weekly_schedules = [];
        console.log('Creating blank program with empty sessions:', programData);
      }

      const { error, data: newProgram } = await supabase
        .from('player_programs')
        .insert(programData)
        .select()
        .single();

      if (error) throw error;

      console.log('Program created successfully:', newProgram);
      toast.success('✅ Program created! Opening for editing...');
      setNewProgramName('');
      setExcelFile(null);
      setIsCreatingNew(false);
      
      // Always open the program for editing after creation
      if (newProgram) {
        console.log('Opening newly created program:', newProgram.id);
        // Small delay to ensure state updates properly
        setTimeout(async () => {
          await loadProgramDetails(newProgram.id);
          // Auto-select first session tab
          setSelectedSession('preSessionA');
          toast.success('Program ready! Add exercises to any session tab.');
        }, 100);
      } else {
        loadPrograms();
      }
    } catch (error) {
      console.error('Error creating program:', error);
      toast.error('Failed to create program');
    } finally {
      setLoading(false);
    }
  };

  const moveProgram = async (programId: string, direction: 'up' | 'down') => {
    const currentIndex = programs.findIndex(p => p.id === programId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= programs.length) return;

    setLoading(true);
    try {
      const currentProgram = programs[currentIndex];
      const targetProgram = programs[targetIndex];

      // Swap display orders
      await supabase
        .from('player_programs')
        .update({ display_order: targetProgram.display_order })
        .eq('id', currentProgram.id);

      await supabase
        .from('player_programs')
        .update({ display_order: currentProgram.display_order })
        .eq('id', targetProgram.id);

      toast.success('Program order updated');
      loadPrograms();
    } catch (error) {
      console.error('Error reordering program:', error);
      toast.error('Failed to reorder program');
    } finally {
      setLoading(false);
    }
  };

  const saveProgrammingData = async () => {
    if (!selectedProgram) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_programs')
        .update({
          program_name: programmingData.phaseName,
          phase_name: programmingData.phaseName,
          phase_dates: programmingData.phaseDates,
          start_date: programmingData.startDate || null,
          end_date: programmingData.endDate || null,
          overview_text: programmingData.overviewText,
          sessions: deepClone({
            A: programmingData.sessionA,
            B: programmingData.sessionB,
            C: programmingData.sessionC,
            D: programmingData.sessionD,
            E: programmingData.sessionE,
            F: programmingData.sessionF,
            G: programmingData.sessionG,
            H: programmingData.sessionH,
            'PRE-A': programmingData.preSessionA,
            'PRE-B': programmingData.preSessionB,
            'PRE-C': programmingData.preSessionC,
            'PRE-D': programmingData.preSessionD,
            'PRE-E': programmingData.preSessionE,
            'PRE-F': programmingData.preSessionF,
            'PRE-G': programmingData.preSessionG,
            'PRE-H': programmingData.preSessionH,
          }) as any,
          weekly_schedules: deepClone(programmingData.weeklySchedules) as any,
        })
        .eq('id', selectedProgram.id);

      if (error) throw error;

      // Note: Save to coaching database is now handled via separate SaveToCoachingDBDialog

      toast.success('Program saved successfully');
      
      // Clear the backup after successful save
      clearBackup();
      
      // Update the selected program with the new name
      if (selectedProgram) {
        setSelectedProgram({
          ...selectedProgram,
          program_name: programmingData.phaseName
        });
      }
      
      loadPrograms();
    } catch (error: any) {
      console.error('Error saving program:', error);
      // More detailed error message - DON'T close the dialog
      const isNetworkError = error?.message?.includes('NetworkError') || 
                             error?.message?.includes('fetch') ||
                             error?.code === 'NETWORK_ERROR';
      
      if (isNetworkError) {
        toast.error(
          <div>
            <p className="font-semibold">Network error - changes NOT saved</p>
            <p className="text-xs mt-1">Your work is backed up locally. Check your connection and try again.</p>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error(
          <div>
            <p className="font-semibold">Failed to save program</p>
            <p className="text-xs mt-1">{error?.message || 'Unknown error'}</p>
            <p className="text-xs">Your work is backed up locally.</p>
          </div>,
          { duration: 8000 }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const makeCurrentProgram = async (programId: string) => {
    setLoading(true);
    try {
      await supabase
        .from('player_programs')
        .update({ is_current: false })
        .eq('player_id', playerId);

      const { error } = await supabase
        .from('player_programs')
        .update({ is_current: true })
        .eq('id', programId);

      if (error) throw error;

      toast.success('Program set as current');
      loadPrograms();
    } catch (error) {
      console.error('Error setting current program:', error);
      toast.error('Failed to set current program');
    } finally {
      setLoading(false);
    }
  };

  const deleteProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      toast.success('Program deleted successfully');
      if (selectedProgram?.id === programId) {
        setSelectedProgram(null);
        setProgrammingData(initialProgrammingData());
      }
      loadPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error('Failed to delete program');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Duplicate a programme — deep clones every JSONB field (sessions A-H +
   * PRE-A-H, weekly_schedules with all per-day data, overview_text, phase
   * info, schedule_notes, image URLs). The new row is never current and is
   * placed at the end of the player's programme list with " (Copy)" suffix.
   */
  const duplicateProgram = async (programId: string) => {
    setLoading(true);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from('player_programs')
        .select('*')
        .eq('id', programId)
        .single();
      if (fetchErr) throw fetchErr;
      if (!row) throw new Error('Programme not found');

      const clone: any = JSON.parse(JSON.stringify(row));
      delete clone.id;
      delete clone.created_at;
      delete clone.updated_at;
      clone.is_current = false;
      clone.program_name = `${clone.program_name || 'Programme'} (Copy)`;

      const { data: existing } = await supabase
        .from('player_programs')
        .select('display_order')
        .eq('player_id', row.player_id)
        .order('display_order', { ascending: false })
        .limit(1);
      clone.display_order = existing && existing.length > 0
        ? (existing[0].display_order || 0) + 1
        : 1;

      const { error: insertErr } = await supabase
        .from('player_programs')
        .insert(clone);
      if (insertErr) throw insertErr;

      toast.success('Programme duplicated');
      loadPrograms();
    } catch (error: any) {
      console.error('Error duplicating programme:', error);
      toast.error(error.message || 'Failed to duplicate programme');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ProgrammingData, value: any) => {
    setProgrammingData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  type SessionKey = 'sessionA' | 'sessionB' | 'sessionC' | 'sessionD' | 'sessionE' | 'sessionF' | 'sessionG' | 'sessionH' | 'preSessionA' | 'preSessionB' | 'preSessionC' | 'preSessionD' | 'preSessionE' | 'preSessionF' | 'preSessionG' | 'preSessionH';

  const addExercise = (sessionKey: SessionKey) => {
    const session = programmingData[sessionKey] as SessionData;
    if (!session || !session.exercises) {
      console.error('Session not found or invalid:', sessionKey);
      return;
    }
    // Deep clone existing exercises to prevent reference sharing
    const exercisesClone = deepClone(session.exercises);
    updateField(sessionKey, {
      ...session,
      exercises: [...exercisesClone, emptyExercise()]
    });
  };

  const addExerciseFromDatabase = (sessionKey: SessionKey, exercise: Exercise) => {
    const session = programmingData[sessionKey] as SessionData;
    if (!session || !session.exercises) {
      console.error('Session not found or invalid:', sessionKey);
      return;
    }
    // Deep clone BOTH the exercise and existing exercises to prevent reference sharing
    const exerciseClone = deepClone(exercise);
    const exercisesClone = deepClone(session.exercises);
    updateField(sessionKey, {
      ...session,
      exercises: [...exercisesClone, exerciseClone]
    });
  };

  const importSessionFromDatabase = (sessionKey: SessionKey, exercises: Exercise[], mode: 'replace' | 'append') => {
    const session = programmingData[sessionKey] as SessionData;
    if (!session) {
      console.error('Session not found:', sessionKey);
      return;
    }
    
    // Deep clone the imported exercises
    const importedExercises = deepClone(exercises);
    
    if (mode === 'replace') {
      updateField(sessionKey, {
        ...session,
        exercises: importedExercises
      });
      toast.success(`Replaced with ${exercises.length} exercise(s)`);
    } else {
      const existingExercises = deepClone(session.exercises || []);
      updateField(sessionKey, {
        ...session,
        exercises: [...existingExercises, ...importedExercises]
      });
      toast.success(`Added ${exercises.length} exercise(s)`);
    }
  };

  const parsePastedExercises = () => {
    if (!selectedSession || !pasteText.trim()) {
      toast.error("Please paste exercise data");
      return;
    }

    const lines = pasteText.trim().split('\n').filter(line => line.trim());
    const newExercises: Exercise[] = [];

    for (const line of lines) {
      const fields = line.split('\t').map(f => f.trim());
      
      if (fields.length < 4) {
        console.warn(`Skipping invalid line (needs at least 4 fields): ${line.substring(0, 50)}...`);
        continue;
      }

      const exercise: Exercise = {
        name: fields[0] || '',
        description: fields[1] || '',
        repetitions: fields[2] || '',
        sets: fields[3] || '',
        load: fields[4] || '',
        recoveryTime: fields[5] || '',
        videoUrl: fields[6] || '',
      };

      newExercises.push(exercise);
    }

    if (newExercises.length > 0) {
      const session = programmingData[selectedSession as SessionKey] as SessionData;
      // Deep clone existing exercises to prevent reference sharing
      const exercisesClone = deepClone(session.exercises);
      updateField(selectedSession as SessionKey, {
        ...session,
        exercises: [...exercisesClone, ...newExercises]
      });

      toast.success(`Added ${newExercises.length} exercise${newExercises.length > 1 ? 's' : ''}`);
      setShowPasteDialog(false);
      setPasteText("");
    } else {
      toast.error("No valid exercises found in pasted data");
    }
  };

  const removeExercise = (sessionKey: SessionKey, index: number) => {
    const session = programmingData[sessionKey] as SessionData;
    // Deep clone exercises to prevent reference sharing
    const exercisesClone = deepClone(session.exercises);
    updateField(sessionKey, {
      ...session,
      exercises: exercisesClone.filter((_, i) => i !== index)
    });
  };

  const updateExercise = (sessionKey: SessionKey, index: number, field: keyof Exercise, value: string) => {
    // Immediately update state synchronously - this ensures responsive typing
    setProgrammingData(prev => {
      const session = prev[sessionKey] as SessionData;
      const updatedExercises = deepClone(session.exercises);
      updatedExercises[index] = { ...updatedExercises[index], [field]: value };
      return { ...prev, [sessionKey]: { ...session, exercises: updatedExercises } };
    });
    setHasUnsavedChanges(true);
    
    // If updating the name field, debounce the database lookup for auto-fill
    if (field === 'name' && value.trim()) {
      const lookupKey = `${sessionKey}-${index}`;
      
      // Clear any pending lookup for this exercise
      if (exerciseLookupTimeoutRef.current[lookupKey]) {
        clearTimeout(exerciseLookupTimeoutRef.current[lookupKey]);
      }
      
      // Debounce the database lookup by 3 seconds
      exerciseLookupTimeoutRef.current[lookupKey] = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('coaching_exercises')
            .select('*')
            .ilike('title', value.trim())
            .limit(1)
            .single();

          if (data && !error) {
            // Only auto-fill if the name still matches (user hasn't changed it)
            setProgrammingData(prev => {
              const session = prev[sessionKey] as SessionData;
              const currentExercise = session.exercises[index];
              
              // Only proceed if the name still matches what triggered the lookup
              if (currentExercise?.name !== value) return prev;
              
              const updatedExercises = deepClone(session.exercises);
              // Only auto-fill fields that are currently empty
              updatedExercises[index] = {
                ...currentExercise,
                name: value,
                description: currentExercise.description || data.description || '',
                repetitions: currentExercise.repetitions || data.reps || '',
                sets: currentExercise.sets || data.sets?.toString() || '',
                load: currentExercise.load || data.load || '',
                recoveryTime: currentExercise.recoveryTime || data.rest_time?.toString() || '',
                videoUrl: currentExercise.videoUrl || data.video_url || ''
              };
              return { ...prev, [sessionKey]: { ...session, exercises: updatedExercises } };
            });
          }
        } catch (error) {
          // Silently fail - just use the typed value
          console.log('Exercise not found in database, using manual input');
        }
        
        // Clean up the timeout ref
        delete exerciseLookupTimeoutRef.current[lookupKey];
      }, 3000);
    }
  };

  const generateDescription = async (sessionKey: SessionKey, index: number, exerciseName: string) => {
    if (!exerciseName.trim()) {
      toast.error('Please enter an exercise name first');
      return;
    }

    setAiGenerating(true);
    try {
      // Fetch sample descriptions from all existing exercises
      const { data: sampleData, error: sampleError } = await supabase
        .from('coaching_exercises')
        .select('description')
        .not('description', 'is', null)
        .not('description', 'eq', '')
        .limit(15);

      if (sampleError) throw sampleError;

      const sampleDescriptions = sampleData?.map(e => e.description) || [];

      if (sampleDescriptions.length === 0) {
        toast.error('No sample descriptions found to learn from');
        return;
      }

      const { data, error } = await invokeEdgeFunction('ai-write-description', {
        body: { 
          exerciseName,
          sampleDescriptions
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits depleted. Please add credits to continue.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.description) {
        const session = programmingData[sessionKey] as SessionData;
        const updatedExercises = deepClone(session.exercises);
        updatedExercises[index] = { 
          ...updatedExercises[index], 
          description: data.description 
        };
        
        updateField(sessionKey, {
          ...session,
          exercises: updatedExercises
        });

        toast.success('Description generated successfully!');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error('Failed to generate description');
    } finally {
      setAiGenerating(false);
    }
  };

  const moveExercise = (sessionKey: SessionKey, index: number, direction: 'up' | 'down') => {
    const session = programmingData[sessionKey] as SessionData;
    // Deep clone exercises to prevent reference sharing
    const exercises = deepClone(session.exercises);
    
    if (direction === 'up' && index > 0) {
      [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]];
    } else if (direction === 'down' && index < exercises.length - 1) {
      [exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]];
    }
    
    updateField(sessionKey, {
      ...session,
      exercises
    });
  };

  const addWeeklySchedule = () => {
    updateField('weeklySchedules', [...programmingData.weeklySchedules, emptyWeeklySchedule()]);
  };

  const addNextWeekFromPrevious = () => {
    if (programmingData.weeklySchedules.length === 0) {
      toast.error('Add a week first before duplicating');
      return;
    }

    const lastWeek = programmingData.weeklySchedules[programmingData.weeklySchedules.length - 1];
    const duplicatedWeek = deepClone(lastWeek);

    // Advance the date by 7 days
    if (duplicatedWeek.week_start_date) {
      const currentDate = new Date(duplicatedWeek.week_start_date);
      currentDate.setDate(currentDate.getDate() + 7);
      duplicatedWeek.week_start_date = currentDate.toISOString().split('T')[0];
    }

    updateField('weeklySchedules', [...programmingData.weeklySchedules, duplicatedWeek]);
    toast.success('Next week added with +7 days');
  };

  const removeWeeklySchedule = (index: number) => {
    updateField('weeklySchedules', programmingData.weeklySchedules.filter((_, i) => i !== index));
  };

  const updateWeeklySchedule = (index: number, field: keyof WeeklySchedule, value: string) => {
    const updated = [...programmingData.weeklySchedules];
    updated[index] = { ...updated[index], [field]: value };
    updateField('weeklySchedules', updated);
  };

  const getSessionColor = (sessionLetter: string): string => {
    const upperLetter = sessionLetter.toUpperCase().trim();
    const colorMap: { [key: string]: string } = {
      'A': 'red',
      'B': 'blue', 
      'C': 'green',
      'D': 'yellow',
      'E': 'purple',
      'F': 'orange',
      'G': 'gray',
      'H': 'red'
    };
    return colorMap[upperLetter] || 'gray';
  };

  const parsePastedSchedule = () => {
    if (pasteScheduleWeekIndex === null || !pasteScheduleText.trim()) {
      toast.error("Please paste schedule data");
      return;
    }

    const lines = pasteScheduleText.trim().split('\n').filter(line => line.trim());
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const updated = [...programmingData.weeklySchedules];
    
    lines.forEach((line, idx) => {
      if (idx >= 7) return; // Only process first 7 lines (one per day)
      
      const fields = line.split('\t').map(f => f.trim());
      const dayIndex = idx;
      const activity = fields[0] || '';
      
      if (activity && dayIndex < 7) {
        const day = days[dayIndex];
        updated[pasteScheduleWeekIndex][day as keyof WeeklySchedule] = activity;
        
        // Auto-determine color from session letter
        const sessionLetter = activity.match(/\b([A-H])\b/i)?.[0];
        if (sessionLetter) {
          const color = getSessionColor(sessionLetter);
          updated[pasteScheduleWeekIndex][`${day}Color` as keyof WeeklySchedule] = color;
        }
      }
    });

    updateField('weeklySchedules', updated);
    toast.success("Schedule pasted successfully");
    setShowPasteScheduleDialog(false);
    setPasteScheduleText("");
    setPasteScheduleWeekIndex(null);
  };

  const generateWithAI = async () => {
    setAiGenerating(true);
    try {
      const context = `Player: ${playerName}
Phase Name: ${programmingData.phaseName || 'Not specified'}
Phase Dates: ${programmingData.phaseDates || 'Not specified'}`;

      const prompt = `Write a comprehensive training program overview for this athlete's strength and conditioning program.`;

      const { data, error } = await invokeEdgeFunction('ai-write', {
        body: { 
          prompt,
          context,
          type: 'program-overview'
        }
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

      updateField('overviewText', data.text);
      toast.success('AI content generated successfully!');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate content with AI');
    } finally {
      setAiGenerating(false);
    }
  };

  const fetchFixtures = async () => {
    if (!selectedFixturePlayer) {
      toast.error('Please select a player');
      return;
    }

    setFetchingFixtures(true);
    try {
      const player = allPlayers.find(p => p.id === selectedFixturePlayer);
      const teamName = player?.club || player?.name;

      const { data, error } = await invokeEdgeFunction('fetch-team-fixtures', {
        body: { teamName }
      });

      if (error) throw error;

      if (data.fixtures && data.fixtures.length > 0) {
        setAvailableFixtures(data.fixtures);
        toast.success(`Found ${data.fixtures.length} fixtures`);
      } else {
        toast.error('No fixtures found for this team');
        setAvailableFixtures([]);
      }
    } catch (error: any) {
      console.error('Error fetching fixtures:', error);
      toast.error(`Failed to fetch fixtures: ${error.message}`);
    } finally {
      setFetchingFixtures(false);
    }
  };

  const addFixturesToSchedule = () => {
    if (selectedFixtures.size === 0) {
      toast.error('Please select at least one fixture');
      return;
    }

    const fixturesToAdd = Array.from(selectedFixtures).map(idx => availableFixtures[idx]);
    const updatedSchedules = [...programmingData.weeklySchedules];

    fixturesToAdd.forEach(fixture => {
      const fixtureDate = new Date(fixture.match_date);
      
      // Find or create a week that contains this date
      let weekIndex = updatedSchedules.findIndex(schedule => {
        if (!schedule.week_start_date) return false;
        const weekStart = new Date(schedule.week_start_date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return fixtureDate >= weekStart && fixtureDate <= weekEnd;
      });

      if (weekIndex === -1) {
        // Create a new week for this fixture
        const weekStart = new Date(fixtureDate);
        weekStart.setDate(fixtureDate.getDate() - fixtureDate.getDay()); // Go to Sunday
        weekStart.setDate(weekStart.getDate() + 1); // Go to Monday
        
        const newWeek = emptyWeeklySchedule();
        newWeek.week_start_date = weekStart.toISOString().split('T')[0];
        updatedSchedules.push(newWeek);
        weekIndex = updatedSchedules.length - 1;
      }

      // Determine which day of the week
      const dayOfWeek = fixtureDate.getDay();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = days[dayOfWeek];

      // Add fixture info
      const fixtureText = `${fixture.home_team} vs ${fixture.away_team}`;
      updatedSchedules[weekIndex][`${dayKey}Fixture` as keyof WeeklySchedule] = fixtureText;
    });

    // Sort schedules by date
    updatedSchedules.sort((a, b) => {
      if (!a.week_start_date || !b.week_start_date) return 0;
      return new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime();
    });

    updateField('weeklySchedules', updatedSchedules);
    toast.success(`Added ${selectedFixtures.size} fixture(s) to schedule`);
    setShowFixturesDialog(false);
    setSelectedFixtures(new Set());
    setAvailableFixtures([]);
  };

  const createProgramFromTemplate = async (template: any) => {
    if (!template) return;

    setLoading(true);
    try {
      // Get max display_order for this player
      const { data: existingPrograms } = await supabase
        .from('player_programs')
        .select('display_order')
        .eq('player_id', playerId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existingPrograms && existingPrograms.length > 0 
        ? (existingPrograms[0].display_order || 0) + 1 
        : 1;

      // Create completely independent copy from template using deep cloning
      const templateSessions = normaliseSpsTemplateSessions(template);
      const templateSchedules = deepClone(template.attachments?.weekly_schedules || []);
      
      const programData: any = {
        player_id: playerId,
        program_name: template.title,
        phase_name: template.title,
        phase_dates: '',
        overview_text: template.content || template.description || '',
        is_current: programs.length === 0,
        display_order: nextOrder,
        sessions: {
          A: templateSessions.A || { exercises: [] },
          B: templateSessions.B || { exercises: [] },
          C: templateSessions.C || { exercises: [] },
          D: templateSessions.D || { exercises: [] },
          E: templateSessions.E || { exercises: [] },
          F: templateSessions.F || { exercises: [] },
          G: templateSessions.G || { exercises: [] },
          H: templateSessions.H || { exercises: [] },
          'PRE-A': templateSessions['PRE-A'] || { exercises: [] },
          'PRE-B': templateSessions['PRE-B'] || { exercises: [] },
          'PRE-C': templateSessions['PRE-C'] || { exercises: [] },
          'PRE-D': templateSessions['PRE-D'] || { exercises: [] },
          'PRE-E': templateSessions['PRE-E'] || { exercises: [] },
          'PRE-F': templateSessions['PRE-F'] || { exercises: [] },
          'PRE-G': templateSessions['PRE-G'] || { exercises: [] },
          'PRE-H': templateSessions['PRE-H'] || { exercises: [] },
        },
        weekly_schedules: templateSchedules
      };

      const { error, data: newProgram } = await supabase
        .from('player_programs')
        .insert(programData)
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Program created from template! Opening for editing...');
      setShowTemplateDialog(false);
      
      // Open the program for editing
      if (newProgram) {
        setTimeout(async () => {
          await loadProgramDetails(newProgram.id);
          setSelectedSession('preSessionA');
          toast.success('Program ready! Add exercises to any session tab.');
        }, 100);
      } else {
        loadPrograms();
      }
    } catch (error) {
      console.error('Error creating program from template:', error);
      toast.error('Failed to create program from template');
    } finally {
      setLoading(false);
    }
  };

  const templateDialog = (
    <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Select Program Template</DialogTitle>
        </DialogHeader>
        
        {loadingTemplates ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        ) : coachingPrograms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No templates available in coaching database yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Create programs in the Coaching Database first to use them as templates.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coachingPrograms.map((program) => (
              <Card key={program.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => createProgramFromTemplate(program)}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{program.title}</h4>
                      {program.description && (
                        <p className="text-sm text-muted-foreground mt-1">{program.description}</p>
                      )}
                      {program.weeks && (
                        <Badge variant="secondary" className="mt-2">
                          {program.weeks} weeks
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline" disabled={loading}>
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const innerContent = (
    <>
      {/* Recovery Banner */}
        {showRecoveryBanner && selectedProgram && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm">Unsaved changes from a previous session were found.</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={dismissRecovery}>
                Dismiss
              </Button>
              <Button size="sm" onClick={recoverUnsavedChanges}>
                Recover
              </Button>
            </div>
          </div>
        )}

        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && selectedProgram && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-orange-600 text-sm">●</span>
            <span className="text-sm text-orange-600">You have unsaved changes (auto-backed up locally)</span>
          </div>
        )}

        {!selectedProgram ? (
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Programs</h3>
              {isAdmin && (
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button onClick={() => {
                    setIsCreatingNew(true);
                    setExcelFile(null);
                    setShowUploadProgram(false);
                  }} variant="default" className="flex-1 sm:flex-none" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Create Blank Program</span>
                    <span className="sm:hidden">Blank Program</span>
                  </Button>
                  <Button onClick={() => {
                    setShowTemplateDialog(true);
                  }} variant="outline" className="flex-1 sm:flex-none" size="sm">
                    <Database className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Use Template</span>
                    <span className="sm:hidden">Template</span>
                  </Button>
                </div>
              )}
            </div>

            {isCreatingNew && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle>Create New Program</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="font-semibold mb-2">You can either:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Create a BLANK program and add sessions manually</li>
                        <li>Upload a CSV/Excel file to import the structure automatically</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Label>Program Name *</Label>
                      <Input
                        placeholder="e.g., Pre-Season 2025, In-Season Phase 1"
                        value={newProgramName}
                        onChange={(e) => setNewProgramName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Upload CSV/Excel File (OPTIONAL)</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to create a blank program with all session tabs ready for manual input
                      </p>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setExcelFile(file);
                          }
                        }}
                        disabled={uploadingExcel}
                      />
                      {excelFile && (
                        <div className="flex items-center justify-between bg-muted p-2 rounded">
                          <p className="text-sm font-medium">
                            📄 {excelFile.name}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setExcelFile(null);
                              const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={createNewProgram} 
                        disabled={loading || uploadingExcel || !newProgramName.trim()}
                        className="flex-1"
                      >
                        {uploadingExcel ? '⏳ Processing...' : loading ? '⏳ Creating...' : excelFile ? '📤 Import' : '✨ Create'}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsCreatingNew(false);
                        setNewProgramName('');
                        setExcelFile(null);
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {programs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No programs created yet. Click "New Program" to get started.
                  </CardContent>
                </Card>
              ) : (
                programs.map((program, idx) => (
                  <Card key={program.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => moveProgram(program.id, 'up')}
                              disabled={idx === 0 || loading}
                            >
                              <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => moveProgram(program.id, 'down')}
                              disabled={idx === programs.length - 1 || loading}
                            >
                              <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm sm:text-base truncate">{program.program_name}</h4>
                              {program.is_current && (
                                <Badge variant="default" className="gap-1 text-xs">
                                  <Check className="w-3 h-3" />
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Created: {new Date(program.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          {!program.is_current && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => makeCurrentProgram(program.id)}
                              disabled={loading}
                            >
                              Make Current
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadProgramDetails(program.id)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateProgram(program.id)}
                            disabled={loading}
                            title="Duplicate programme"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteProgram(program.id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => {
                setSelectedProgram(null);
                setProgrammingData(initialProgrammingData());
              }}>
                &larr; Back to Programs
              </Button>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{programmingData.phaseName || selectedProgram.program_name}</span>
                {selectedProgram.is_current && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 p-1">
                <TabsTrigger value="overview" className="flex-1 min-w-[100px]">Overview</TabsTrigger>
                <TabsTrigger value="sessions" className="flex-1 min-w-[100px]">Sessions</TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1 min-w-[120px]">Weekly Schedule</TabsTrigger>
                <TabsTrigger value="testing" className="flex-1 min-w-[100px]">Testing</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Phase Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phaseName">Phase Name</Label>
                        <Input
                          id="phaseName"
                          placeholder="e.g., Push-Pull Phase"
                          value={programmingData.phaseName}
                          onChange={(e) => updateField('phaseName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phaseDates">Phase Dates</Label>
                        <Input
                          id="phaseDates"
                          placeholder="e.g., October"
                          value={programmingData.phaseDates}
                          onChange={(e) => updateField('phaseDates', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={programmingData.startDate}
                          onChange={(e) => updateField('startDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={programmingData.endDate}
                          onChange={(e) => updateField('endDate', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="overviewText">Overview Text</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateWithAI}
                          disabled={aiGenerating}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {aiGenerating ? 'Generating...' : 'Use AI to Write'}
                        </Button>
                      </div>
                      <Textarea
                        id="overviewText"
                        placeholder="Enter overall programming notes, goals, and structure..."
                        value={programmingData.overviewText}
                        onChange={(e) => updateField('overviewText', e.target.value)}
                        rows={12}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Training Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       <div className="flex flex-wrap gap-2">
                         {sessionLabels.map((session) => {
                           const sessionData = programmingData[session.key as keyof ProgrammingData] as SessionData;
                           const isEmpty = !sessionData?.exercises || sessionData.exercises.length === 0;
                           
                           return (
                             <Button
                               key={session.key}
                               variant={selectedSession === session.key ? "default" : "outline"}
                               onClick={() => setSelectedSession(session.key)}
                               className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${isEmpty ? "opacity-50" : ""}`}
                               size="sm"
                             >
                               {session.label}
                             </Button>
                           );
                         })}
                       </div>

                        {selectedSession ? (
                        <div className="space-y-4 pt-4">
                          {/* Staff-only session notes */}
                          <div className="flex items-center gap-2 border-b pb-3 mb-3">
                            <Label className="text-sm text-muted-foreground whitespace-nowrap">Staff Notes:</Label>
                            <Input
                              placeholder="Notes on what to include in this session (staff only)"
                              value={(programmingData[selectedSession as keyof ProgrammingData] as SessionData).staffNotes || ''}
                              onChange={(e) => {
                                const sessionKey = selectedSession as keyof ProgrammingData;
                                const currentSession = programmingData[sessionKey] as SessionData;
                                updateProgrammingData({
                                  [sessionKey]: { ...currentSession, staffNotes: e.target.value }
                                } as any);
                              }}
                              className="text-sm flex-1"
                            />
                          </div>
                          
                          <div className="flex justify-between items-center mb-4">
                            <Label className="text-lg font-semibold">
                              {sessionLabels.find(s => s.key === selectedSession)?.label} Exercises
                            </Label>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setIsSessionSelectorOpen(true)}
                              >
                                <FolderOpen className="w-4 h-4 mr-2" />
                                Import Session
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setIsExerciseSelectorOpen(true)}
                              >
                                <Database className="w-4 h-4 mr-2" />
                                From Database
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowPasteDialog(true)}
                              >
                                📋 Paste Exercises
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => addExercise(selectedSession as SessionKey)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Manual
                              </Button>
                            </div>
                          </div>

                          {(programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.length > 0 ? (
                            <div className="border rounded-lg overflow-x-auto">
                              <table className="w-full min-w-[1200px]">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="p-2 text-left text-xs font-semibold w-20">Order</th>
                                    <th className="p-2 text-left text-xs font-semibold min-w-[200px]">Exercise Name</th>
                                    <th className="p-2 text-left text-xs font-semibold min-w-[250px]">Description</th>
                                    <th className="p-2 text-left text-xs font-semibold w-24">Reps</th>
                                    <th className="p-2 text-left text-xs font-semibold w-20">Sets</th>
                                    <th className="p-2 text-left text-xs font-semibold w-24">Load</th>
                                    <th className="p-2 text-left text-xs font-semibold w-28">Recovery</th>
                                    <th className="p-2 text-left text-xs font-semibold w-28">Video</th>
                                    <th className="p-2 w-12"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.map((exercise, idx) => (
                                    <tr key={idx} className="border-t hover:bg-muted/50">
                                      <td className="p-2">
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => moveExercise(selectedSession as SessionKey, idx, 'up')}
                                            disabled={idx === 0}
                                          >
                                            <ChevronUp className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => moveExercise(selectedSession as SessionKey, idx, 'down')}
                                            disabled={idx === (programmingData[selectedSession as keyof ProgrammingData] as SessionData).exercises.length - 1}
                                          >
                                            <ChevronDown className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Exercise name"
                                          value={exercise.name}
                                          onChange={(e) => updateExercise(selectedSession as SessionKey, idx, 'name', e.target.value)}
                                          className="text-sm"
                                          list={`exercise-datalist-${idx}`}
                                        />
                                        <datalist id={`exercise-datalist-${idx}`}>
                                          {exerciseTitles.map((title, titleIdx) => (
                                            <option key={`${idx}-${titleIdx}`} value={title} />
                                          ))}
                                        </datalist>
                                      </td>
                                      <td className="p-2">
                                        <div className="flex gap-1">
                                          <Input
                                            placeholder="Description"
                                            value={exercise.description}
                                            onChange={(e) => updateExercise(selectedSession as SessionKey, idx, 'description', e.target.value)}
                                            className="text-sm flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => generateDescription(selectedSession as SessionKey, idx, exercise.name)}
                                            disabled={!exercise.name || aiGenerating}
                                            title="AI generate description"
                                            className="shrink-0"
                                          >
                                            <Sparkles className={`w-4 h-4 ${aiGenerating ? 'animate-pulse' : ''}`} />
                                          </Button>
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Reps"
                                          value={exercise.repetitions}
                                          onChange={(e) => updateExercise(selectedSession as SessionKey, idx, 'repetitions', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Sets"
                                          value={exercise.sets}
                                          onChange={(e) => updateExercise(selectedSession as SessionKey, idx, 'sets', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Load"
                                          value={exercise.load}
                                          onChange={(e) => updateExercise(selectedSession as SessionKey, idx, 'load', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Recovery"
                                          value={exercise.recoveryTime}
                                          onChange={(e) => updateExercise(selectedSession as SessionKey, idx, 'recoveryTime', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          placeholder="Video URL"
                                          value={exercise.videoUrl}
                                          onChange={(e) => updateExercise(selectedSession as SessionKey, idx, 'videoUrl', e.target.value)}
                                          className="text-sm"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeExercise(selectedSession as SessionKey, idx)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              No exercises added yet. Click "Add Exercise" to get started.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          Select a session to manage exercises
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Free Plan Section - staff only, never visible to players */}
                <Card className="border-dashed border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Free Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="What are you working on for this player? e.g. 'Improving first-step acceleration and hip mobility for the next 4 weeks...'"
                      defaultValue={(() => {
                        try { return localStorage.getItem(`freeplan_${playerId}_${selectedProgram?.id}`) || ''; }
                        catch { return ''; }
                      })()}
                      onChange={(e) => {
                        try { localStorage.setItem(`freeplan_${playerId}_${selectedProgram?.id}`, e.target.value); } catch {}
                      }}
                      rows={4}
                      className="text-sm relative z-10"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={aiGenerating}
                        onClick={async () => {
                          const freePlanText = localStorage.getItem(`freeplan_${playerId}_${selectedProgram?.id}`) || '';
                          if (!freePlanText.trim()) {
                            toast.error('Write what you\'re working on first');
                            return;
                          }
                          setAiGenerating(true);
                          try {
                            // Fetch exercises from coaching database for context
                            const { data: exercises } = await supabase
                              .from('coaching_exercises')
                              .select('title, category, description, reps, sets, load')
                              .limit(100);

                            const exerciseContext = exercises?.map(e => 
                              `- ${e.title} | ${e.category || 'General'} | Reps: ${e.reps || 'N/A'} | Sets: ${e.sets || 'N/A'} | Load: ${e.load || 'N/A'}`
                            ).join('\n') || 'No exercises in database yet.';

                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) throw new Error('Not authenticated');

                            const response = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-response`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  prompt: `You are a strength and conditioning coach building session plans. Return ONLY valid JSON, no other text.

My exercise database:
${exerciseContext}

What I'm working on with this player: ${freePlanText}

Return a JSON array of session objects. Each session has a "name" and TWO exercise arrays:
- "pre_exercises": warmup/activation exercises (almost always 1 set each, lighter loads, shorter recovery)
- "exercises": main working exercises (full sets/load/recovery)

Each exercise object has: "name", "reps", "sets", "load", "recovery".

RULES:
- Every session MUST have both pre_exercises and exercises sections
- Pre-session exercises are warmups/activation work - typically 1 set, bodyweight or light band, short recovery
- Use exercises from my database wherever possible, using the EXACT names, reps, sets, and load formats as they appear (e.g. "12 (6 each side)" not "6 per side")
- Do not truncate or cut short. Include all exercises needed for complete sessions
- No markdown formatting, no asterisks, no hashes
- Reps/sets/load must match the style in my database exactly
- Return 3-5 sessions depending on what makes sense
- IMPORTANT: After the database-based sessions, also include 1-2 extra sessions that use ONLY exercises NOT in my database. Label these clearly e.g. "Session 4 - Additional Ideas (Non-Database)". These are for inspiration and should use exercises the database does not contain.

Example format:
[{"name":"Session 1 - Lower Body Power","pre_exercises":[{"name":"Banded Glute Walks","reps":"12","sets":"1","load":"Light Band","recovery":"30s"}],"exercises":[{"name":"Sumo Deadlifts","reps":"12","sets":"3","load":"80% 1RM","recovery":"90s"}]}]`
                                }),
                              }
                            );

                            if (!response.ok) throw new Error('AI request failed');
                            const data = await response.json();
                            const suggestion = data.response || data.content || data.message || 'No suggestions generated.';
                            
                            // Store suggestion
                            localStorage.setItem(`freeplan_suggestion_${playerId}_${selectedProgram?.id}`, suggestion);
                            setHasUnsavedChanges(prev => prev); // force re-render
                            toast.success('Suggestions generated');
                          } catch (error) {
                            console.error('AI suggestion error:', error);
                            toast.error('Failed to generate suggestions');
                          } finally {
                            setAiGenerating(false);
                          }
                        }}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-pulse' : ''}`} />
                        {aiGenerating ? 'Thinking...' : 'Get AI Suggestions'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          localStorage.removeItem(`freeplan_suggestion_${playerId}_${selectedProgram?.id}`);
                          setHasUnsavedChanges(prev => prev);
                        }}
                      >
                        Clear Suggestions
                      </Button>
                    </div>
                    {(() => {
                      const suggestion = (() => {
                        try { return localStorage.getItem(`freeplan_suggestion_${playerId}_${selectedProgram?.id}`) || ''; }
                        catch { return ''; }
                      })();
                      if (!suggestion) return null;

                      // Try to parse as JSON sessions array
                      let parsedSessions: { name: string; pre_exercises?: { name: string; reps: string; sets: string; load: string; recovery: string }[]; exercises: { name: string; reps: string; sets: string; load: string; recovery: string }[] }[] | null = null;
                      try {
                        // Strip any markdown fences or leading text before the JSON
                        let cleaned = suggestion.trim();
                        const jsonStart = cleaned.indexOf('[');
                        const jsonEnd = cleaned.lastIndexOf(']');
                        if (jsonStart !== -1 && jsonEnd !== -1) {
                          cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
                        }
                        const parsed = JSON.parse(cleaned);
                        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].exercises) {
                          parsedSessions = parsed;
                        }
                      } catch {
                        // Not valid JSON, fall through to plain text
                      }

                      if (parsedSessions) {
                        const renderExerciseTable = (exercises: any[], label: string) => (
                          <div className="mt-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-1 bg-muted/20">{label}</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/50 bg-muted/30">
                                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Exercise</th>
                                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-24">Reps</th>
                                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-16">Sets</th>
                                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-24">Load</th>
                                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-20">Recovery</th>
                                  <th className="w-8"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {exercises.map((ex, eIdx) => (
                                  <tr key={eIdx} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                                    <td className="px-3 py-1.5 font-medium">{ex.name}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground">{ex.reps || 'N/A'}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground">{ex.sets || 'N/A'}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground">{ex.load || 'N/A'}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground">{ex.recovery || 'N/A'}</td>
                                    <td className="px-1 py-1.5">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0"
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${ex.name}\t\t${ex.reps || ''}\t${ex.sets || ''}\t${ex.load || ''}\t${ex.recovery || ''}`);
                                          toast.success(`Copied ${ex.name}`);
                                        }}
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );

                        return (
                          <div className="mt-3 space-y-4">
                            <p className="text-[10px] uppercase tracking-wider text-primary/60 font-medium">AI Suggestions</p>
                            {parsedSessions.map((session, sIdx) => (
                              <div key={sIdx} className="rounded-lg border border-primary/20 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-primary/10">
                                  <span className="text-xs font-semibold text-foreground">{session.name}</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] gap-1"
                                    onClick={() => {
                                      const allExercises = [...(session.pre_exercises || []), ...(session.exercises || [])];
                                      const header = 'Exercise\tDescription\tReps\tSets\tLoad\tRecovery';
                                      const rows = allExercises.map(ex =>
                                        `${ex.name}\t\t${ex.reps || 'N/A'}\t${ex.sets || 'N/A'}\t${ex.load || 'N/A'}\t${ex.recovery || 'N/A'}`
                                      ).join('\n');
                                      navigator.clipboard.writeText(`${session.name}\n${header}\n${rows}`);
                                      toast.success(`Copied ${session.name}`);
                                    }}
                                  >
                                    <Copy className="h-3 w-3" /> Copy All
                                  </Button>
                                </div>
                                {session.pre_exercises && session.pre_exercises.length > 0 && renderExerciseTable(session.pre_exercises, 'Pre-Session (Warmup / Activation)')}
                                {session.exercises && session.exercises.length > 0 && renderExerciseTable(session.exercises, 'Main Session')}
                              </div>
                            ))}
                          </div>
                        );
                      }

                      // Fallback: render as plain text with markdown stripped
                      const cleanedText = suggestion.replace(/\*\*/g, '').replace(/###?\s?/g, '').replace(/```json\n?/g, '').replace(/```\n?/g, '');
                      return (
                        <div className="mt-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-[10px] uppercase tracking-wider text-primary/60 mb-2 font-medium">AI Suggestions</p>
                          <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/80">{cleanedText}</div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                {selectedProgram ? (
                  <ProgrammingWeeksEditor
                    playerId={playerId}
                    programmeLink={{ table: "player_programs", programmeId: selectedProgram.id }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a programme to manage its weeks.</p>
                )}
              </TabsContent>

              <TabsContent value="testing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Testing Protocol</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Enter testing protocols and benchmarks..."
                      value={programmingData.testing}
                      onChange={(e) => updateField('testing', e.target.value)}
                      rows={10}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-end gap-2 mt-6">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSaveToDBDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to Coaching DB
                </Button>
                <Button variant="outline" onClick={() => {
                  setSelectedProgram(null);
                  setProgrammingData(initialProgrammingData());
                }} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button onClick={saveProgrammingData} disabled={loading} className="flex-1 sm:flex-none">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </>
  );

  const fixturesAndSelectors = (
    <>
      <datalist id="exercise-titles-list">
        {exerciseTitles.map((title, idx) => (
          <option key={idx} value={title} />
        ))}
      </datalist>

      <ExerciseDatabaseSelector
        isOpen={isExerciseSelectorOpen}
        onClose={() => setIsExerciseSelectorOpen(false)}
        onSelect={(exercise) => {
          if (selectedSession) {
            addExerciseFromDatabase(selectedSession as SessionKey, exercise);
          }
        }}
      />

      <SessionDatabaseSelector
        isOpen={isSessionSelectorOpen}
        onClose={() => setIsSessionSelectorOpen(false)}
        onImport={(exercises, mode) => {
          if (selectedSession) {
            importSessionFromDatabase(selectedSession as SessionKey, exercises, mode);
          }
        }}
      />

      <SaveToCoachingDBDialog
        isOpen={showSaveToDBDialog}
        onClose={() => setShowSaveToDBDialog(false)}
        programmingData={programmingData}
        programName={selectedProgram?.program_name || playerName}
      />

      {/* Paste Exercises Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Paste Exercises</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste exercise data from a spreadsheet. Each line should be: Name, Description, Reps, Sets, Load, Recovery Time, Video URL (comma or tab separated).
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Exercise Name, Description, 10, 3, 50kg, 60s, https://..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPasteDialog(false)}>Cancel</Button>
              <Button onClick={() => {
                if (selectedSession && pasteText.trim()) {
                  parsePastedExercises();
                  setShowPasteDialog(false);
                  setPasteText("");
                }
              }}>Import Exercises</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paste Schedule Dialog */}
      <Dialog open={showPasteScheduleDialog} onOpenChange={setShowPasteScheduleDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Paste Weekly Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste a weekly schedule. Each line should contain a day and its session (e.g., "Monday: A" or "Mon,A").
            </p>
            <Textarea
              value={pasteScheduleText}
              onChange={(e) => setPasteScheduleText(e.target.value)}
              placeholder="Monday: A&#10;Tuesday: B&#10;Wednesday: REST&#10;..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPasteScheduleDialog(false)}>Cancel</Button>
              <Button onClick={() => {
                if (pasteScheduleWeekIndex !== null && pasteScheduleText.trim()) {
                  parsePastedSchedule();
                  setShowPasteScheduleDialog(false);
                  setPasteScheduleText("");
                }
              }}>Import Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fixtures Dialog */}
      <Dialog open={showFixturesDialog} onOpenChange={setShowFixturesDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add Fixtures to Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedFixturePlayer} onValueChange={setSelectedFixturePlayer}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select player's team..." />
                </SelectTrigger>
                <SelectContent>
                  {allPlayers
                    .filter(p => p.club)
                    .reduce((unique: any[], player: any) => {
                      if (!unique.find(u => u.club === player.club)) {
                        unique.push(player);
                      }
                      return unique;
                    }, [])
                    .map(player => (
                      <SelectItem key={player.id} value={player.club}>
                        {player.club} ({player.name})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => fetchFixtures()}
                disabled={!selectedFixturePlayer || fetchingFixtures}
              >
                {fetchingFixtures ? 'Loading...' : 'Fetch Fixtures'}
              </Button>
            </div>

            {availableFixtures.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">{availableFixtures.length} fixtures found</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (selectedFixtures.size === availableFixtures.length) {
                        setSelectedFixtures(new Set());
                      } else {
                        setSelectedFixtures(new Set(availableFixtures.map((_: any, i: number) => i)));
                      }
                    }}
                  >
                    {selectedFixtures.size === availableFixtures.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {availableFixtures.map((fixture: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFixtures.has(idx) ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedFixtures);
                        if (newSelected.has(idx)) {
                          newSelected.delete(idx);
                        } else {
                          newSelected.add(idx);
                        }
                        setSelectedFixtures(newSelected);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">
                            {fixture.home_team} vs {fixture.away_team}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                            {fixture.competition && ` • ${fixture.competition}`}
                          </div>
                        </div>
                        <Checkbox
                          checked={selectedFixtures.has(idx)}
                          onCheckedChange={() => {
                            const newSelected = new Set(selectedFixtures);
                            if (newSelected.has(idx)) {
                              newSelected.delete(idx);
                            } else {
                              newSelected.add(idx);
                            }
                            setSelectedFixtures(newSelected);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowFixturesDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={addFixturesToSchedule}
                    disabled={selectedFixtures.size === 0}
                  >
                    Add {selectedFixtures.size} Fixture{selectedFixtures.size !== 1 ? 's' : ''} to Schedule
                  </Button>
                </div>
              </div>
            )}

            {availableFixtures.length === 0 && selectedFixturePlayer && !fetchingFixtures && (
              <div className="text-center text-muted-foreground py-8">
                Click "Fetch Fixtures" to load fixtures for the selected player's team
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Programming — {playerName}</h3>
        {innerContent}
        {templateDialog}
        {fixturesAndSelectors}
      </div>
    );
  }

  return (
    <>
      {templateDialog}
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && hasUnsavedChanges) {
          if (!confirm('You have unsaved changes. Are you sure you want to close? Your work is backed up locally.')) {
            return;
          }
        }
        onClose?.();
      }}>
        <DialogContent className="w-[98vw] max-w-[1800px] max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Programming Management - {playerName}</DialogTitle>
          </DialogHeader>
          {innerContent}
        </DialogContent>
      </Dialog>
      {fixturesAndSelectors}
    </>
  );
};
