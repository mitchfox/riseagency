import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ScoutingWidgetData {
  totalReports: number;
  pendingReviews: number;
  recentReports: Array<{
    id: string;
    player_name: string;
    status: string;
    created_at: string;
  }>;
}

export const useScoutingWidget = () => {
  const [data, setData] = useState<ScoutingWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: reports, error } = await supabase
        .from("scouting_reports")
        .select("id, player_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && reports) {
        const pending = reports.filter(r => r.status === 'pending' || r.status === 'review').length;
        setData({
          totalReports: reports.length,
          pendingReviews: pending,
          recentReports: reports
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useProspectsWidget = () => {
  const [data, setData] = useState<{ total: number; byStage: Record<string, number>; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: prospects, error } = await supabase
        .from("prospects")
        .select("id, name, stage, priority, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && prospects) {
        const byStage: Record<string, number> = {};
        prospects.forEach(p => {
          byStage[p.stage] = (byStage[p.stage] || 0) + 1;
        });
        setData({
          total: prospects.length,
          byStage,
          recent: prospects.slice(0, 3)
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useInvoicesWidget = () => {
  const [data, setData] = useState<{ pending: number; total: number; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, status, due_date, player_id")
        .order("due_date", { ascending: true })
        .limit(10);

      if (!error && invoices) {
        const pending = invoices.filter(i => i.status === 'pending');
        const totalAmount = pending.reduce((sum, i) => sum + Number(i.amount), 0);
        setData({
          pending: pending.length,
          total: totalAmount,
          recent: pending.slice(0, 3)
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useReportsWidget = () => {
  const [data, setData] = useState<{ total: number; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: analyses, error } = await supabase
        .from("player_analysis")
        .select("id, analysis_date, opponent, player_id, r90_score")
        .order("analysis_date", { ascending: false })
        .limit(5);

      if (!error && analyses) {
        setData({
          total: analyses.length,
          recent: analyses
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useSiteVisitsWidget = () => {
  const [data, setData] = useState<{ today: number; week: number; recentPaths: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: visits, error } = await supabase
        .from("site_visits")
        .select("id, page_path, visited_at")
        .gte("visited_at", weekAgo.toISOString())
        .order("visited_at", { ascending: false })
        .limit(50);

      if (!error && visits) {
        const todayVisits = visits.filter(v => new Date(v.visited_at) >= today).length;
        const recentPaths = [...new Set(visits.slice(0, 5).map(v => v.page_path))];
        setData({
          today: todayVisits,
          week: visits.length,
          recentPaths
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useMarketingWidget = () => {
  const [data, setData] = useState<{ active: number; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: campaigns, error } = await supabase
        .from("marketing_campaigns")
        .select("id, title, status, start_date, end_date")
        .order("start_date", { ascending: false })
        .limit(5);

      if (!error && campaigns) {
        const active = campaigns.filter(c => c.status === 'active').length;
        setData({
          active,
          recent: campaigns.slice(0, 3)
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useOutreachWidget = () => {
  const [data, setData] = useState<{ total: number; byStatus: Record<string, number>; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: outreach, error } = await supabase
        .from("club_outreach")
        .select("id, club_name, status, latest_update_date")
        .order("latest_update_date", { ascending: false })
        .limit(10);

      if (!error && outreach) {
        const byStatus: Record<string, number> = {};
        outreach.forEach(o => {
          byStatus[o.status] = (byStatus[o.status] || 0) + 1;
        });
        setData({
          total: outreach.length,
          byStatus,
          recent: outreach.slice(0, 3)
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useNewPlayersWidget = () => {
  const [data, setData] = useState<{ total: number; thisMonth: number; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const { data: players, error } = await supabase
        .from("players")
        .select("id, name, position, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && players) {
        const thisMonth = players.filter(p => new Date(p.created_at!) >= monthAgo).length;
        setData({
          total: players.length,
          thisMonth,
          recent: players.slice(0, 3)
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useFormSubmissionsWidget = () => {
  const [data, setData] = useState<{ total: number; byType: Record<string, number>; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: submissions, error } = await supabase
        .from("form_submissions")
        .select("id, form_type, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && submissions) {
        const byType: Record<string, number> = {};
        submissions.forEach(s => {
          byType[s.form_type] = (byType[s.form_type] || 0) + 1;
        });
        setData({
          total: submissions.length,
          byType,
          recent: submissions.slice(0, 3)
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export const useCoachingWidget = () => {
  const [data, setData] = useState<{ sessions: number; exercises: number; programmes: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [sessionsRes, exercisesRes, programmesRes] = await Promise.all([
        supabase.from("coaching_sessions").select("id", { count: 'exact', head: true }),
        supabase.from("coaching_exercises").select("id", { count: 'exact', head: true }),
        supabase.from("coaching_programmes").select("id", { count: 'exact', head: true })
      ]);

      setData({
        sessions: sessionsRes.count || 0,
        exercises: exercisesRes.count || 0,
        programmes: programmesRes.count || 0
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  return { data, loading };
};
