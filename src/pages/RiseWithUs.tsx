import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, TrendingUp, Users, Shield, BarChart3, Dumbbell, Video, BookOpen } from "lucide-react";
import NotFound from "./NotFound";

interface ProspectPlayer {
  id: string;
  name: string;
  position: string;
  image_url: string | null;
  club: string | null;
  nationality: string | null;
}

const RiseWithUs = () => {
  const { slug } = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<ProspectPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }
      
      // Convert slug back to name: "firstname-lastname" -> search
      const searchName = slug.replace(/-/g, " ");
      
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, image_url, club, nationality")
        .eq("representation_status", "prospect")
        .ilike("name", searchName)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPlayer(data);
      }
      setLoading(false);
    };
    fetchPlayer();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (notFound || !player) return <NotFound />;

  const firstName = player.name.split(" ")[0];

  const services = [
    { icon: BarChart3, title: "Performance Analysis", description: "Every match broken down with expert tactical insights, key moments and areas for growth. We help you understand your game better than anyone." },
    { icon: TrendingUp, title: "Development Tracking", description: "Monitor your progress with benchmarks, R90 scores, and detailed statistics that show exactly how you're improving over time." },
    { icon: Dumbbell, title: "Physical Programming", description: "Strength, power and speed programmes built specifically for your position and development needs. Nutrition guidance included." },
    { icon: Video, title: "Video Analysis", description: "Professional clip editing and analysis of your performances. Highlight reels, tactical breakdowns and improvement sequences." },
    { icon: Users, title: "Network & Exposure", description: "Connections across European football. Clubs, scouts, coaches and decision-makers who need to know about you." },
    { icon: Shield, title: "Career Management", description: "Contract guidance, club negotiations, and strategic career planning. We protect your interests and maximise your potential." },
    { icon: BookOpen, title: "Education & Mentoring", description: "Off-pitch development through our coaching resources, mental performance support and professional guidance." },
    { icon: Star, title: "Personal Portal", description: "Your own dedicated portal with all your analysis, programmes, stats, and development materials in one place." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm uppercase tracking-[0.3em] text-primary mb-4 font-bebas">
              An invitation to
            </p>
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground mb-6">
              Rise With Us
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-2">
              {firstName}, we've been watching your development closely.
            </p>
            <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto">
              Here's what working with RISE looks like.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider mb-6">
              Who We Are
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
              RISE is a football agency built differently. We combine elite-level performance analysis, 
              physical programming, and career management into one integrated service. Every player we 
              work with gets a dedicated portal, personalised development plans, and direct access to 
              our network across European football.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-center mb-12">
            What You Get
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
              >
                <service.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-base mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Portal */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider mb-6">
              Your Portal
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-8">
              Every RISE player gets their own personal portal, accessible from any device. It's where 
              all your match analysis, performance reports, training programmes, and development materials 
              live. Everything in one place, designed around you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider mb-4">
              Let's Talk
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              If you're interested in learning more about how RISE can support your development and career, 
              we'd love to have a conversation.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Get In Touch
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          This page is a private invitation and is not indexed by search engines.
        </p>
      </footer>
    </div>
  );
};

export default RiseWithUs;
