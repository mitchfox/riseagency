import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollReveal } from '@/components/ScrollReveal';
import { BarChart3, TrendingUp, Users, Globe, Building2, Briefcase, Star } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  club_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  image_url: string | null;
  notes: string | null;
  contact_strength?: number;
  pinned_note?: string | null;
  last_contacted_at?: string | null;
}

interface NetworkAnalyticsProps {
  contacts: Contact[];
}

const panelStyle = {
  background: 'linear-gradient(145deg, hsl(var(--card) / 0.92), hsl(var(--muted) / 0.42))',
  boxShadow: '0 24px 70px -36px hsl(var(--foreground) / 0.55), inset 0 1px 0 hsl(var(--background) / 0.26)',
};

const softPanelStyle = {
  background: 'linear-gradient(145deg, hsl(var(--card) / 0.84), hsl(var(--muted) / 0.3))',
  boxShadow: '0 20px 54px -34px hsl(var(--foreground) / 0.38), inset 0 1px 0 hsl(var(--background) / 0.18)',
};

/** Compute a 0-100 strength score from data completeness */
export const computeContactStrength = (contact: Contact): number => {
  let score = 0;
  if (contact.name && contact.name !== 'Unknown') score += 15;
  if (contact.email) score += 15;
  if (contact.phone) score += 15;
  if (contact.club_name) score += 10;
  if (contact.position) score += 10;
  if (contact.country) score += 10;
  if (contact.city) score += 5;
  if (contact.image_url) score += 5;
  if (contact.notes && contact.notes.length > 10) score += 10;
  if (contact.pinned_note) score += 5;
  return Math.min(score, 100);
};

const strengthColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-primary';
  if (score >= 40) return 'text-amber-400';
  return 'text-destructive';
};

const strengthBg = (score: number) => {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-primary';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-destructive';
};

const StatCard = ({ label, value, icon: Icon, accent = false }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; accent?: boolean }) => (
  <div className="relative overflow-hidden rounded-[1.5rem] border border-border/50 p-4 backdrop-blur-2xl" style={softPanelStyle}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_40%)] opacity-80" />
    <div className="relative z-[1] flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accent ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/50 bg-muted/50 text-muted-foreground'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </div>
);

export const NetworkAnalytics: React.FC<NetworkAnalyticsProps> = ({ contacts }) => {
  const stats = useMemo(() => {
    const countries = new Set<string>();
    const clubs = new Set<string>();
    const roles = new Map<string, number>();
    let withEmail = 0;
    let withPhone = 0;
    let totalStrength = 0;

    contacts.forEach((c) => {
      if (c.country) countries.add(c.country.toLowerCase());
      if (c.club_name) clubs.add(c.club_name.toLowerCase());
      if (c.position) {
        const key = c.position.toLowerCase();
        roles.set(key, (roles.get(key) || 0) + 1);
      }
      if (c.email) withEmail++;
      if (c.phone) withPhone++;
      totalStrength += computeContactStrength(c);
    });

    const topRoles = [...roles.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([role, count]) => ({
        role: role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count,
        pct: Math.round((count / contacts.length) * 100),
      }));

    const avgStrength = contacts.length > 0 ? Math.round(totalStrength / contacts.length) : 0;
    const emailPct = contacts.length > 0 ? Math.round((withEmail / contacts.length) * 100) : 0;
    const phonePct = contacts.length > 0 ? Math.round((withPhone / contacts.length) * 100) : 0;

    // Strength distribution
    const strengthBuckets = { high: 0, medium: 0, low: 0, weak: 0 };
    contacts.forEach((c) => {
      const s = computeContactStrength(c);
      if (s >= 80) strengthBuckets.high++;
      else if (s >= 60) strengthBuckets.medium++;
      else if (s >= 40) strengthBuckets.low++;
      else strengthBuckets.weak++;
    });

    return { countries: countries.size, clubs: clubs.size, topRoles, avgStrength, emailPct, phonePct, withEmail, withPhone, strengthBuckets };
  }, [contacts]);

  return (
    <div className="space-y-5">
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-5 backdrop-blur-2xl" style={panelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_38%)] opacity-85" />
          <div className="relative z-[1] flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <ScrollReveal>
                <h3 className="font-bebas text-xl tracking-[0.26em] text-foreground uppercase">Network Analytics</h3>
              </ScrollReveal>
              <p className="text-sm text-muted-foreground">Overview of your network's composition and data quality.</p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total contacts" value={contacts.length} icon={Users} accent />
        <StatCard label="Countries" value={stats.countries} icon={Globe} />
        <StatCard label="Organisations" value={stats.clubs} icon={Building2} />
        <StatCard label="Avg. strength" value={`${stats.avgStrength}%`} icon={Star} accent />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Role breakdown */}
        <div className="relative overflow-hidden rounded-[1.5rem] border border-border/50 p-5 backdrop-blur-2xl" style={softPanelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%)] opacity-80" />
          <div className="relative z-[1] space-y-4">
            <ScrollReveal>
              <h4 className="font-bebas text-sm tracking-[0.28em] text-primary uppercase">Role Breakdown</h4>
            </ScrollReveal>
            <div className="space-y-2.5">
              {stats.topRoles.map((r) => (
                <div key={r.role} className="flex items-center gap-3">
                  <span className="w-28 truncate text-sm text-foreground">{r.role}</span>
                  <div className="relative flex-1 h-5 overflow-hidden rounded-full bg-muted/50">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary/60" style={{ width: `${r.pct}%` }} />
                  </div>
                  <Badge variant="outline" className="border-border/50 text-muted-foreground text-xs min-w-[3rem] justify-center">{r.count}</Badge>
                </div>
              ))}
              {stats.topRoles.length === 0 && <p className="text-sm text-muted-foreground">No roles assigned yet.</p>}
            </div>
          </div>
        </div>

        {/* Data quality */}
        <div className="relative overflow-hidden rounded-[1.5rem] border border-border/50 p-5 backdrop-blur-2xl" style={softPanelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.1),transparent_36%)] opacity-80" />
          <div className="relative z-[1] space-y-4">
            <ScrollReveal>
              <h4 className="font-bebas text-sm tracking-[0.28em] text-primary uppercase">Data Quality</h4>
            </ScrollReveal>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/50 bg-background/30 p-3 text-center">
                <p className="text-xl font-bold text-foreground">{stats.emailPct}%</p>
                <p className="text-xs text-muted-foreground">Have email</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/30 p-3 text-center">
                <p className="text-xl font-bold text-foreground">{stats.phonePct}%</p>
                <p className="text-xs text-muted-foreground">Have phone</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Strength Distribution</p>
              {[
                { label: 'Strong (80-100)', count: stats.strengthBuckets.high, color: 'bg-emerald-400' },
                { label: 'Good (60-79)', count: stats.strengthBuckets.medium, color: 'bg-primary' },
                { label: 'Fair (40-59)', count: stats.strengthBuckets.low, color: 'bg-amber-400' },
                { label: 'Weak (0-39)', count: stats.strengthBuckets.weak, color: 'bg-destructive' },
              ].map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${bucket.color}`} />
                  <span className="flex-1 text-xs text-muted-foreground">{bucket.label}</span>
                  <span className="text-xs font-medium text-foreground">{bucket.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { strengthColor, strengthBg };
