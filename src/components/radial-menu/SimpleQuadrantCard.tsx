import { TrendingUp, BookOpen, MessageCircle, Route, Search, HelpCircle, Target, Briefcase, Users, Handshake, Star, Calendar, Newspaper, Heart, Package } from "lucide-react";
import { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SimpleQuadrantCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  stat?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxWidth?: number;
  maxHeight?: number;
  align?: 'left' | 'right' | 'center';
}

export const SimpleQuadrantCard = ({
  icon,
  title,
  description,
  stat,
  position,
  maxWidth,
  maxHeight,
  align = 'center',
}: SimpleQuadrantCardProps) => {
  const textAlignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  const flexAlignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

  return (
    <div
      className={`animate-[fade-in_0.3s_ease-out_forwards] flex flex-col ${flexAlignClass} w-full overflow-hidden`}
      style={{
        maxWidth: maxWidth ?? 200,
        maxHeight: maxHeight ?? undefined,
      }}
    >
      {/* Label with icon */}
      <div className="inline-flex items-center gap-1.5 bg-primary px-2 py-0.5 mb-2 flex-shrink-0">
        <div className="text-black">{icon}</div>
        <span className="text-xs font-bebas uppercase tracking-wider text-black whitespace-nowrap">{title}</span>
      </div>
      
      {/* Stat if provided */}
      {stat && (
        <div className={`text-3xl font-bebas text-primary leading-none mb-1 ${textAlignClass} w-full`}>{stat}</div>
      )}
      
      {/* Description - smaller text that wraps inside wedge */}
      <p className={`text-white/80 text-xs leading-tight break-words hyphens-auto w-full ${textAlignClass}`}>
        {description}
      </p>
    </div>
  );
};

// Pre-configured cards for different menu items
type QuadrantCardProps = Pick<SimpleQuadrantCardProps, "maxWidth" | "maxHeight" | "align">;
 
export const PerformanceQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<TrendingUp className="w-4 h-4" />}
      title={t('menu.ext_performance_title', 'Performance')}
      stat="R90"
      description={t('menu.ext_performance_desc', 'Our proprietary analysis system tracks every action to maximise player potential.')}
      position="top-right"
      {...props}
    />
  );
};

export const InsightsQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<BookOpen className="w-4 h-4" />}
      title={t('menu.ext_insights_title', 'Insights')}
      description={t('menu.ext_insights_desc', 'Expert tactical analysis and exclusive content from inside the game.')}
      position="top-left"
      {...props}
    />
  );
};

export const ContactQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<MessageCircle className="w-4 h-4" />}
      title={t('menu.ext_contact_title', 'Get In Touch')}
      description={t('menu.ext_contact_desc', 'Ready to elevate your career? Connect with our team today.')}
      position="bottom-right"
      {...props}
    />
  );
};

export const YouthQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<TrendingUp className="w-4 h-4" />}
      title={t('menu.ext_youth_title', 'Youth Players')}
      description={t('menu.ext_youth_desc', 'Pathways and support designed specifically for ambitious young players.')}
      position="bottom-right"
      {...props}
    />
  );
};

export const HowWeRiseQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<TrendingUp className="w-4 h-4" />}
      title={t('menu.ext_howwerise_title', 'How We Rise')}
      description={t('menu.ext_howwerise_desc', 'Comprehensive player development and career support to realise your potential.')}
      position="bottom-left"
      {...props}
    />
  );
};

export const JourneyQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Route className="w-4 h-4" />}
      title={t('menu.ext_journey_title', 'The Journey')}
      description={t('menu.ext_journey_desc', 'Step-by-step guidance through each stage of your professional pathway.')}
      position="bottom-left"
      {...props}
    />
  );
};

export const WhatWeLookForQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Search className="w-4 h-4" />}
      title={t('menu.ext_whatweseek_title', 'What We Look For')}
      description={t('menu.ext_whatweseek_desc', 'Key traits and behaviours we value when evaluating players for RISE.')}
      position="top-left"
      {...props}
    />
  );
};

export const FAQQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<HelpCircle className="w-4 h-4" />}
      title={t('menu.ext_faq_title', 'FAQ')}
      description={t('menu.ext_faq_desc', 'Answers to common questions about representation, services, and how we work.')}
      position="bottom-right"
      {...props}
    />
  );
};

// NEW extension cards for menu items that were missing them

export const RequestsQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Target className="w-4 h-4" />}
      title={t('menu.ext_requests_title', 'Requests')}
      description={t('menu.ext_requests_desc', 'Submit player requests and let us find the right talent for your needs.')}
      position="top-right"
      {...props}
    />
  );
};

export const PartnerQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Handshake className="w-4 h-4" />}
      title={t('menu.ext_partner_title', 'Partner')}
      description={t('menu.ext_partner_desc', 'Explore partnership opportunities and collaborative working with RISE.')}
      position="bottom-left"
      {...props}
    />
  );
};

export const PortalQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Users className="w-4 h-4" />}
      title={t('menu.ext_portal_title', 'Portal')}
      description={t('menu.ext_portal_desc', 'Access your personal dashboard for updates, analysis and development tools.')}
      position="top-right"
      {...props}
    />
  );
};

export const OpportunitiesQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Briefcase className="w-4 h-4" />}
      title={t('menu.ext_opportunities_title', 'Opportunities')}
      description={t('menu.ext_opportunities_desc', 'Current scouting and career opportunities within the RISE network.')}
      position="bottom-left"
      {...props}
    />
  );
};

export const CoachingQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Target className="w-4 h-4" />}
      title={t('menu.ext_coaching_title', 'Coaching')}
      description={t('menu.ext_coaching_desc', 'Our coaching methodology and development programmes for player growth.')}
      position="top-left"
      {...props}
    />
  );
};

export const PackagesQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Package className="w-4 h-4" />}
      title={t('menu.ext_packages_title', 'Packages')}
      description={t('menu.ext_packages_desc', 'Tailored commercial packages to align your brand with elite football talent.')}
      position="top-right"
      {...props}
    />
  );
};

export const ClubSupportQuadrantCard = (props: QuadrantCardProps) => {
  const { t } = useLanguage();
  return (
    <SimpleQuadrantCard
      icon={<Target className="w-4 h-4" />}
      title={t('menu.ext_clubsupport_title', 'Club Support')}
      description={t('menu.ext_clubsupport_desc', 'Strategic consultancy to help clubs recruit, optimise and grow sustainably.')}
      position="top-right"
      {...props}
    />
  );
};
