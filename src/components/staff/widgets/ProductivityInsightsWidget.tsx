import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Activity, CheckCircle2, Clock, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface InsightsData {
  tasksCompleted: number;
  tasksTotal: number;
  reportsThisWeek: number;
  reportsLastWeek: number;
  activeOutreach: number;
  pendingInvoices: number;
  formSubmissions: number;
}

export const ProductivityInsightsWidget = () => {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const [tasksRes, reportsThisWeekRes, reportsLastWeekRes, outreachRes, invoicesRes, formsRes] = await Promise.all([
        supabase.from("staff_tasks").select("id, completed"),
        supabase.from("player_analysis").select("id").gte("created_at", weekAgo.toISOString()),
        supabase.from("player_analysis").select("id").gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
        supabase.from("club_outreach").select("id").eq("status", "contacted"),
        supabase.from("invoices").select("id").eq("status", "pending"),
        supabase.from("form_submissions").select("id").gte("created_at", weekAgo.toISOString())
      ]);

      const tasks = tasksRes.data || [];
      const completedTasks = tasks.filter((t: any) => t.completed).length;

      setData({
        tasksCompleted: completedTasks,
        tasksTotal: tasks.length,
        reportsThisWeek: reportsThisWeekRes.data?.length || 0,
        reportsLastWeek: reportsLastWeekRes.data?.length || 0,
        activeOutreach: outreachRes.data?.length || 0,
        pendingInvoices: invoicesRes.data?.length || 0,
        formSubmissions: formsRes.data?.length || 0
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-xs text-muted-foreground py-4">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Unable to load insights
      </div>
    );
  }

  const taskCompletion = data.tasksTotal > 0 ? Math.round((data.tasksCompleted / data.tasksTotal) * 100) : 0;
  const reportsTrend = data.reportsThisWeek - data.reportsLastWeek;
  const reportsTrendPercent = data.reportsLastWeek > 0 
    ? Math.round((reportsTrend / data.reportsLastWeek) * 100) 
    : data.reportsThisWeek > 0 ? 100 : 0;

  return (
    <div className="space-y-3 px-1">
      {/* Task Completion */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium">Task Completion</span>
          </div>
          <span className="text-xs font-bold">{taskCompletion}%</span>
        </div>
        <Progress value={taskCompletion} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground">
          {data.tasksCompleted} of {data.tasksTotal} tasks complete
        </p>
      </div>

      {/* Reports Trend */}
      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${reportsTrend >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {reportsTrend >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium">Reports This Week</p>
            <p className="text-[10px] text-muted-foreground">
              {reportsTrend >= 0 ? '+' : ''}{reportsTrendPercent}% vs last week
            </p>
          </div>
        </div>
        <span className="text-lg font-bold">{data.reportsThisWeek}</span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-md bg-muted/50">
          <Target className="h-3 w-3 mx-auto mb-1 text-blue-500" />
          <p className="text-sm font-bold">{data.activeOutreach}</p>
          <p className="text-[9px] text-muted-foreground">Active Outreach</p>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/50">
          <Clock className="h-3 w-3 mx-auto mb-1 text-amber-500" />
          <p className="text-sm font-bold">{data.pendingInvoices}</p>
          <p className="text-[9px] text-muted-foreground">Pending Invoices</p>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/50">
          <Activity className="h-3 w-3 mx-auto mb-1 text-purple-500" />
          <p className="text-sm font-bold">{data.formSubmissions}</p>
          <p className="text-[9px] text-muted-foreground">New Submissions</p>
        </div>
      </div>
    </div>
  );
};
