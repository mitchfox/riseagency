import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { Resend } from "https://esm.sh/resend@4.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const NOTIFICATION_EMAIL = "jolon.levene@risefootballagency.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisitorData {
  id: string;
  visitor_id: string;
  page_path: string;
  referrer: string | null;
  visited_at: string;
  duration: number | null;
  location: {
    city?: string;
    country?: string;
    region?: string;
  } | null;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return 'N/A';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatLocation = (location: VisitorData['location']): string => {
  if (!location) return 'Unknown';
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting weekly Instagram visitors report...");

    // Get date range for the past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Query visitors from Instagram
    const { data: visitors, error } = await supabase
      .from('site_visits')
      .select('*')
      .gte('visited_at', startDate.toISOString())
      .lte('visited_at', endDate.toISOString())
      .or('referrer.ilike.%instagram%,referrer.ilike.%ig.%,referrer.ilike.%l.instagram%')
      .order('visited_at', { ascending: false });

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log(`Found ${visitors?.length || 0} Instagram visitors in the past week`);

    // Group by visitor_id to get unique visitors
    const uniqueVisitors = new Map<string, VisitorData[]>();
    (visitors || []).forEach((visit: VisitorData) => {
      const existing = uniqueVisitors.get(visit.visitor_id) || [];
      existing.push(visit);
      uniqueVisitors.set(visit.visitor_id, existing);
    });

    const totalVisits = visitors?.length || 0;
    const uniqueVisitorCount = uniqueVisitors.size;

    // Calculate total duration
    const totalDuration = (visitors || []).reduce((sum: number, v: VisitorData) => sum + (v.duration || 0), 0);
    const avgDuration = totalVisits > 0 ? Math.round(totalDuration / totalVisits) : 0;

    // Get page visit counts
    const pageCounts: Record<string, number> = {};
    (visitors || []).forEach((v: VisitorData) => {
      pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
    });

    // Sort pages by visit count
    const sortedPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Build visitor table rows
    const visitorRows = (visitors || []).slice(0, 50).map((v: VisitorData) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">
          ${new Date(v.visited_at).toLocaleString('en-GB', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
          })}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${v.page_path}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${formatDuration(v.duration)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${formatLocation(v.location)}</td>
      </tr>
    `).join('');

    // Build top pages rows
    const topPagesRows = sortedPages.map(([path, count]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${path}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${count}</td>
      </tr>
    `).join('');

    // Send the report email
    const emailResponse = await resend.emails.send({
      from: "RISE Football <onboarding@resend.dev>",
      to: [NOTIFICATION_EMAIL],
      subject: `Weekly Instagram Visitors Report - ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 20px; text-align: center;">
            <h1 style="color: #B8A574; margin: 0; font-size: 28px; letter-spacing: 2px;">RISE FOOTBALL</h1>
            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">Weekly Instagram Visitors Report</p>
          </div>
          
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 2px solid #B8A574; padding-bottom: 10px;">
              Report Period: ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}
            </h2>
            
            <div style="display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #B8A574;">${totalVisits}</div>
                <div style="color: #666; font-size: 14px;">Total Visits</div>
              </div>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #B8A574;">${uniqueVisitorCount}</div>
                <div style="color: #666; font-size: 14px;">Unique Visitors</div>
              </div>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #B8A574;">${formatDuration(avgDuration)}</div>
                <div style="color: #666; font-size: 14px;">Avg. Duration</div>
              </div>
            </div>
            
            ${sortedPages.length > 0 ? `
              <h3 style="color: #1a1a1a; margin-bottom: 15px;">Top Pages Visited</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #B8A574;">Page</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #B8A574;">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  ${topPagesRows}
                </tbody>
              </table>
            ` : ''}
            
            ${totalVisits > 0 ? `
              <h3 style="color: #1a1a1a; margin-bottom: 15px;">Recent Visitor Details ${totalVisits > 50 ? '(Showing first 50)' : ''}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #B8A574; font-size: 12px;">Date/Time</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #B8A574; font-size: 12px;">Page</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #B8A574; font-size: 12px;">Duration</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #B8A574; font-size: 12px;">Location</th>
                  </tr>
                </thead>
                <tbody>
                  ${visitorRows}
                </tbody>
              </table>
            ` : '<p style="color: #666; text-align: center; padding: 30px;">No Instagram visitors recorded this week.</p>'}
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} RISE Football. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Weekly report email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalVisits,
        uniqueVisitors: uniqueVisitorCount,
        emailResponse 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in weekly-instagram-report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
