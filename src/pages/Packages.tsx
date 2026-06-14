import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { LocalizedLink } from "@/components/LocalizedLink";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  ChevronRight,
  Check, 
  Plus,
  Send, 
  ArrowLeft,
  X,
  Search,
  Target,
  Users,
  Video,
  BarChart3,
  Megaphone,
  Globe,
  Handshake,
  Sparkles,
  Briefcase,
  LineChart,
  PenTool,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  description: string;
}

// Service categories aligned with Sales Deck
const SERVICE_CATEGORIES = [
  { 
    id: "commercial-strategy", 
    label: "Commercial Strategy",
    icon: Target,
    description: "Business growth audits, KPI definition & sponsorship strategy"
  },
  { 
    id: "talent-access", 
    label: "Talent Access",
    icon: Users,
    description: "Professional footballer access & brand matching"
  },
  { 
    id: "club-connections", 
    label: "Club Connections",
    icon: Handshake,
    description: "Club partnerships, sponsorship introductions & matchday access"
  },
  { 
    id: "campaign-activation", 
    label: "Campaign Activation",
    icon: Megaphone,
    description: "End-to-end campaign development & product launches"
  },
  { 
    id: "content-creative", 
    label: "Content & Creative",
    icon: Video,
    description: "Video production, photography & branded content"
  },
  { 
    id: "paid-media", 
    label: "Paid Media",
    icon: BarChart3,
    description: "Social campaign management & performance marketing"
  },
  { 
    id: "digital-assets", 
    label: "Digital Assets",
    icon: Globe,
    description: "Landing pages, microsites & conversion optimization"
  },
  { 
    id: "sponsorship-activation", 
    label: "Sponsorship Activation",
    icon: Sparkles,
    description: "Rights packaging, brand visibility & post-activation analysis"
  },
  { 
    id: "market-intelligence", 
    label: "Market Intelligence",
    icon: LineChart,
    description: "Campaign reporting, ROI analysis & insights"
  },
  { 
    id: "ongoing-support", 
    label: "Ongoing Support",
    icon: Settings,
    description: "Account management, strategy refinement & advisory"
  },
  { 
    id: "premium-addons", 
    label: "Premium Add-Ons",
    icon: Briefcase,
    description: "Exclusive access, international & white-label campaigns"
  },
];

// Full service catalog
const SERVICES: ServiceOption[] = [
  // Commercial Strategy
  { id: "business-growth-audit", name: "Business Growth Audit", category: "commercial-strategy", description: "Comprehensive analysis of your brand's football partnership potential" },
  { id: "campaign-kpi", name: "Campaign Objectives & KPI Definition", category: "commercial-strategy", description: "Define measurable goals and success metrics" },
  { id: "partnership-strategy", name: "Football Partnership Strategy", category: "commercial-strategy", description: "Bespoke strategy for football market entry" },
  { id: "sponsorship-strategy", name: "Sponsorship Strategy", category: "commercial-strategy", description: "Strategic approach to football sponsorship" },
  { id: "brand-positioning", name: "Brand Positioning via Football", category: "commercial-strategy", description: "Position your brand authentically in football culture" },
  { id: "market-analysis", name: "Market & Audience Analysis", category: "commercial-strategy", description: "Deep dive into target demographics and market opportunity" },
  { id: "activation-planning", name: "Campaign & Activation Planning", category: "commercial-strategy", description: "Detailed roadmap for campaign execution" },
  { id: "opportunity-mapping", name: "Commercial Opportunity Mapping", category: "commercial-strategy", description: "Identify and prioritize partnership opportunities" },
  
  // Talent Access
  { id: "footballer-access", name: "Access to Professional Footballers", category: "talent-access", description: "Direct connections to our elite talent roster" },
  { id: "player-shortlisting", name: "Player Shortlisting for Brand Campaigns", category: "talent-access", description: "Curated talent recommendations for your brand" },
  { id: "talent-brand-matching", name: "Talent–Brand Matching", category: "talent-access", description: "Strategic alignment of athlete and brand values" },
  { id: "availability-assessment", name: "Player Availability & Suitability Assessment", category: "talent-access", description: "Evaluate player fit for your campaign needs" },
  { id: "contract-negotiation", name: "Contract & Rights Negotiation", category: "talent-access", description: "Professional negotiation of partnership terms" },
  { id: "image-rights", name: "Image Rights Management", category: "talent-access", description: "Handle all aspects of image rights usage" },
  { id: "player-coordination", name: "Player Scheduling & Coordination", category: "talent-access", description: "Seamless logistics and talent management" },
  { id: "ambassador-deals", name: "Long-Term Brand Ambassador Deals", category: "talent-access", description: "Build lasting athlete-brand relationships" },
  
  // Club Connections
  { id: "club-introductions", name: "Club Sponsorship Introductions", category: "club-connections", description: "Connect with clubs at all levels" },
  { id: "club-partnership-strategy", name: "Club Partnership Strategy", category: "club-connections", description: "Strategic approach to club relationships" },
  { id: "rights-assessment", name: "Rights Assessment", category: "club-connections", description: "Understand what your brand can and cannot do" },
  { id: "club-activation", name: "Campaign Activation with Clubs", category: "club-connections", description: "Execute campaigns within club environments" },
  { id: "matchday-access", name: "Matchday & Event Access", category: "club-connections", description: "VIP access and hospitality arrangements" },
  { id: "club-content", name: "Club-Led Content Opportunities", category: "club-connections", description: "Content creation in partnership with clubs" },
  
  // Campaign Activation
  { id: "concept-development", name: "Campaign Concept Development", category: "campaign-activation", description: "Creative ideation for impactful campaigns" },
  { id: "brand-activations", name: "Football-Led Brand Activations", category: "campaign-activation", description: "Bring your brand to life through football" },
  { id: "product-launches", name: "Product Launches Using Football Talent", category: "campaign-activation", description: "Launch products with athlete endorsement" },
  { id: "tournament-campaigns", name: "Seasonal / Tournament Campaigns", category: "campaign-activation", description: "Capitalize on major football events" },
  { id: "event-campaigns", name: "Event-Based Campaigns", category: "campaign-activation", description: "Activate around key football moments" },
  { id: "digital-physical", name: "Digital & Physical Activations", category: "campaign-activation", description: "Multi-channel campaign execution" },
  { id: "campaign-management", name: "End-to-End Campaign Management", category: "campaign-activation", description: "Full-service campaign delivery" },
  
  // Content & Creative
  { id: "content-strategy", name: "Football Content Strategy", category: "content-creative", description: "Strategic approach to football content" },
  { id: "short-form-video", name: "Short-Form Video Production", category: "content-creative", description: "Engaging social-first video content" },
  { id: "social-content", name: "Social Media Content Creation", category: "content-creative", description: "Platform-optimized content production" },
  { id: "branded-content", name: "Branded Player Content", category: "content-creative", description: "Authentic athlete-fronted content" },
  { id: "interview-documentary", name: "Interview & Documentary-Style Content", category: "content-creative", description: "In-depth storytelling with athletes" },
  { id: "matchday-content", name: "Matchday Content", category: "content-creative", description: "Real-time matchday content capture" },
  { id: "photography", name: "Photography", category: "content-creative", description: "Professional athlete and brand photography" },
  { id: "graphic-design", name: "Graphic Design", category: "content-creative", description: "Visual design for campaigns and assets" },
  { id: "copywriting", name: "Campaign Copywriting", category: "content-creative", description: "Compelling campaign messaging" },
  
  // Paid Media
  { id: "paid-social", name: "Paid Social Campaign Management", category: "paid-media", description: "Managed social advertising campaigns" },
  { id: "ad-creative", name: "Ad Creative Development", category: "paid-media", description: "High-performing ad creative production" },
  { id: "funnel-strategy", name: "Funnel Strategy & Build", category: "paid-media", description: "End-to-end conversion funnel design" },
  { id: "retargeting", name: "Retargeting Campaigns", category: "paid-media", description: "Strategic audience remarketing" },
  { id: "budget-management", name: "Budget Management & Scaling", category: "paid-media", description: "Optimize spend for maximum ROI" },
  { id: "performance-testing", name: "Performance Testing & Optimisation", category: "paid-media", description: "Continuous campaign improvement" },
  { id: "conversion-tracking", name: "Conversion Tracking Setup", category: "paid-media", description: "Accurate measurement infrastructure" },
  
  // Digital Assets
  { id: "landing-pages", name: "Campaign Landing Pages", category: "digital-assets", description: "High-converting campaign destinations" },
  { id: "microsites", name: "Microsite Creation", category: "digital-assets", description: "Standalone campaign websites" },
  { id: "website-optimization", name: "Website Optimisation for Campaigns", category: "digital-assets", description: "Improve site performance for campaigns" },
  { id: "conversion-copy", name: "Conversion Copywriting", category: "digital-assets", description: "Copy that drives action" },
  { id: "lead-capture", name: "Lead Capture Systems", category: "digital-assets", description: "Capture and qualify leads effectively" },
  { id: "crm-integration", name: "CRM & Email Integration", category: "digital-assets", description: "Connect campaigns to your marketing stack" },
  
  // Sponsorship Activation
  { id: "sponsorship-planning", name: "Sponsorship Planning & Valuation", category: "sponsorship-activation", description: "Strategic sponsorship assessment" },
  { id: "rights-packaging", name: "Rights Packaging & Negotiation", category: "sponsorship-activation", description: "Structure and negotiate sponsorship deals" },
  { id: "activation-ideas", name: "Sponsor Activation Ideas", category: "sponsorship-activation", description: "Creative activation concepts" },
  { id: "visibility-planning", name: "Brand Visibility Planning", category: "sponsorship-activation", description: "Maximize brand exposure" },
  { id: "asset-utilisation", name: "Asset Utilisation Strategy", category: "sponsorship-activation", description: "Get the most from sponsorship rights" },
  { id: "post-activation", name: "Post-Activation Analysis", category: "sponsorship-activation", description: "Measure and report on sponsorship impact" },
  
  // Market Intelligence
  { id: "performance-reporting", name: "Campaign Performance Reporting", category: "market-intelligence", description: "Comprehensive campaign analytics" },
  { id: "audience-reporting", name: "Audience Reach & Engagement Reporting", category: "market-intelligence", description: "Understand your audience impact" },
  { id: "roi-analysis", name: "ROI & Commercial Impact Analysis", category: "market-intelligence", description: "Measure commercial return" },
  { id: "content-performance", name: "Content Performance Analysis", category: "market-intelligence", description: "Optimize content based on data" },
  { id: "partnership-reviews", name: "Partnership Effectiveness Reviews", category: "market-intelligence", description: "Evaluate partnership success" },
  { id: "insights-recommendations", name: "Insights & Optimisation Recommendations", category: "market-intelligence", description: "Data-driven improvement suggestions" },
  
  // Ongoing Support
  { id: "ongoing-management", name: "Ongoing Campaign Management", category: "ongoing-support", description: "Continuous campaign oversight" },
  { id: "monthly-reviews", name: "Monthly Performance Reviews", category: "ongoing-support", description: "Regular strategy check-ins" },
  { id: "strategy-refinement", name: "Strategy Refinement", category: "ongoing-support", description: "Evolve strategy based on results" },
  { id: "account-management", name: "Account Management", category: "ongoing-support", description: "Dedicated account support" },
  { id: "partnership-oversight", name: "Long-Term Partnership Oversight", category: "ongoing-support", description: "Manage ongoing relationships" },
  { id: "advisory-consultancy", name: "Advisory & Consultancy Support", category: "ongoing-support", description: "Expert guidance when you need it" },
  
  // Premium Add-Ons
  { id: "exclusive-access", name: "Exclusive Player Access Campaigns", category: "premium-addons", description: "Premium access to top-tier talent" },
  { id: "international-support", name: "International Campaign Support", category: "premium-addons", description: "Multi-market campaign execution" },
  { id: "multi-market", name: "Multi-Market Activations", category: "premium-addons", description: "Coordinated global campaigns" },
  { id: "white-label", name: "White-Label Campaign Execution", category: "premium-addons", description: "Branded campaign delivery for agencies" },
  { id: "confidential-projects", name: "Confidential Brand–Talent Projects", category: "premium-addons", description: "Discrete high-profile partnerships" },
];

// Package templates for quick selection
const PACKAGE_TEMPLATES = [
  {
    name: "Starter",
    description: "Perfect for first-time football partnerships",
    services: ["business-growth-audit", "talent-brand-matching", "branded-content", "performance-reporting"]
  },
  {
    name: "Growth",
    description: "Scale your football marketing presence",
    services: ["partnership-strategy", "footballer-access", "campaign-management", "paid-social", "roi-analysis", "monthly-reviews"]
  },
  {
    name: "Enterprise",
    description: "Full-service football partnership solution",
    services: ["sponsorship-strategy", "footballer-access", "ambassador-deals", "club-introductions", "concept-development", "campaign-management", "content-strategy", "short-form-video", "paid-social", "landing-pages", "performance-reporting", "account-management"]
  }
];

const Packages = () => {
  const { t } = useLanguage();
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, ServiceOption[]> = {};
    SERVICES.forEach(service => {
      if (!grouped[service.category]) {
        grouped[service.category] = [];
      }
      grouped[service.category].push(service);
    });
    return grouped;
  }, []);

  // Filter services based on search
  const filteredServicesByCategory = useMemo(() => {
    if (!searchQuery) return servicesByCategory;
    
    const filtered: Record<string, ServiceOption[]> = {};
    Object.entries(servicesByCategory).forEach(([category, categoryServices]) => {
      const matchingServices = categoryServices.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingServices.length > 0) {
        filtered[category] = matchingServices;
      }
    });
    return filtered;
  }, [servicesByCategory, searchQuery]);

  // Get selected services list
  const selectedList = useMemo(() => {
    return SERVICES.filter(s => selectedServices.has(s.id));
  }, [selectedServices]);

  const toggleService = (service: ServiceOption) => {
    const newSelected = new Set(selectedServices);
    
    if (newSelected.has(service.id)) {
      newSelected.delete(service.id);
    } else {
      newSelected.add(service.id);
    }
    
    setSelectedServices(newSelected);
  };

  const applyTemplate = (template: typeof PACKAGE_TEMPLATES[0]) => {
    const newSelected = new Set<string>(template.services);
    setSelectedServices(newSelected);
    toast.success(`${template.name} Package applied`, {
      description: `${template.services.length} services selected`
    });
  };

  const handleSubmitRequest = async () => {
    if (!companyName || !contactEmail) {
      toast.error("Please fill in company name and email");
      return;
    }
    if (selectedServices.size === 0) {
      toast.error("Please select at least one service");
      return;
    }

    setIsSubmitting(true);
    
    // Build request details
    const servicesList = selectedList
      .map((service) => `• ${service.name}`)
      .join('\n');
    
    const emailBody = encodeURIComponent(
      `Company: ${companyName}\nEmail: ${contactEmail}\n\nProject Description:\n${projectDescription}\n\nSelected Services:\n${servicesList}`
    );
    
    // Open email client
    window.location.href = `mailto:jolon.levene@risefootballagency.com?subject=Partnership%20Request%20from%20${encodeURIComponent(companyName)}&body=${emailBody}`;
    
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Request prepared!", {
        description: "Your email client should open with the request details"
      });
    }, 1000);
  };

  // Get selected category services
  const selectedCategoryServices = selectedCategory 
    ? filteredServicesByCategory[selectedCategory] || []
    : [];

  const getCategoryIcon = (categoryId: string) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return Target;
    return category.icon;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={t('packages.build_your_package_football_marketing_solutions_', 'Build Your Package - Football Marketing Solutions | RISE Agency')}
        description={t('packages.create_a_customised_football_marketing_package_s', 'Create a customised football marketing package. Select from our comprehensive range of commercial services, talent access, and campaign solutions.')}
        url="/packages"
      />
      <Header />
      
      <main className="pt-24 md:pt-20">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
          
          {/* Left Sidebar */}
          <div className="w-full lg:w-80 xl:w-96 lg:border-r border-border bg-card/50 flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-border">
              <h1 className="text-3xl font-bebas uppercase tracking-wider text-foreground">
                
                {t('packages.build_your_package', 'Build Your Package')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 italic">
                
                {t('packages.select_all_services_that_could_benefit_your_bran', 'Select all services that could benefit your brand or business. Build your ideal partnership and we\'ll create a tailored proposal.')}
              </p>
            </div>

            {/* Quick Templates */}
            <div className="p-4 border-b border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">{t('packages.quick_start_templates', 'Quick Start Templates')}</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {PACKAGE_TEMPLATES.map((template) => (
                  <TooltipProvider key={template.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => applyTemplate(template)}
                          className="flex-shrink-0 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-sm font-medium transition-all"
                        >
                          {template.name}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{template.description}</p>
                        <p className="text-xs text-muted-foreground">{template.services.length} services</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('packages.search_services', 'Search services...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {SERVICE_CATEGORIES.map((category) => {
                  const categoryServices = filteredServicesByCategory[category.id] || [];
                  const selectedInCategory = categoryServices.filter(s => selectedServices.has(s.id)).length;
                  const CategoryIcon = category.icon;
                  
                  if (categoryServices.length === 0 && !searchQuery) return null;

                  return (
                    <motion.div key={category.id} layout>
                      <button
                        onClick={() => setSelectedCategory(
                          selectedCategory === category.id ? null : category.id
                        )}
                        className={cn(
                          "w-full flex items-center gap-3 py-3 px-4 text-left transition-all duration-200 rounded-lg",
                          selectedCategory === category.id
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <CategoryIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-sm">{category.label}</span>
                        <div className="flex items-center gap-2">
                          {selectedInCategory > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                              {selectedInCategory}
                            </span>
                          )}
                          <ChevronRight className={cn(
                            "w-4 h-4 transition-transform",
                            selectedCategory === category.id && "rotate-90"
                          )} />
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer - Summary */}
            <div className="p-6 border-t border-border bg-card">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('packages.services_selected', 'Services Selected')}</span>
                <span className="text-2xl font-bebas text-primary">{selectedServices.size}</span>
              </div>
            </div>

              <Button 
                onClick={() => setShowSummary(true)}
                className="w-full font-bebas uppercase tracking-wider"
                size="lg"
                disabled={selectedServices.size === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                
                {t('packages.submit_request', 'Submit Request')}
              </Button>

              <LocalizedLink to="/business" className="block mt-3">
                <Button variant="ghost" className="w-full text-muted-foreground" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  
                  {t('packages.back_to_business', 'Back to Business')}
                </Button>
              </LocalizedLink>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col lg:flex-row">
            
            {/* Services Panel */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {selectedCategory ? (
                  <motion.div
                    key={selectedCategory}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const CategoryIcon = getCategoryIcon(selectedCategory);
                          return <CategoryIcon className="w-6 h-6 text-primary" />;
                        })()}
                        <h2 className="text-2xl font-bebas uppercase tracking-wider">
                          {SERVICE_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                        </h2>
                      </div>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {selectedCategoryServices.map((service) => {
                        const isSelected = selectedServices.has(service.id);
                        
                        return (
                          <motion.div
                            key={service.id}
                            layout
                            onClick={() => toggleService(service)}
                            className={cn(
                              "relative rounded-xl border-2 transition-all duration-300 overflow-hidden cursor-pointer",
                              isSelected 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/30 bg-card"
                            )}
                          >
                            <div className="p-4 flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-foreground">
                                  {service.name}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {service.description}
                                </p>
                              </div>

                              {isSelected ? (
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center ml-4">
                                  <Check className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center ml-4">
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex items-center justify-center p-12"
                  >
                    <div className="text-center max-w-md">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <PenTool className="w-10 h-10 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bebas uppercase tracking-wider mb-3">
                        
                        {t('packages.select_a_category', 'Select a Category')}
                      </h2>
                      <p className="text-muted-foreground italic">
                        
                        {t('packages.browse_our_comprehensive_range_of_football_marke', 'Browse our comprehensive range of football marketing services. Select everything that interests your brand - we\'ll tailor a proposal to match your needs and budget.')}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Selected Services Preview (Desktop) */}
            <div className="hidden xl:block w-80 border-l border-border bg-card/30 overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-bebas uppercase tracking-wider mb-4">{t('packages.your_package', 'Your Package')}</h3>
                
                {selectedList.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t('packages.no_services_selected_yet_browse_categories_on_th', 'No services selected yet. Browse categories on the left to add services to your package.')}</p>
                ) : (
                  <div className="space-y-3">
                    {selectedList.map((service) => (
                      <div key={service.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {SERVICE_CATEGORIES.find(c => c.id === service.category)?.label}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleService(service)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Summary/Submit Drawer */}
      <AnimatePresence>
        {showSummary && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowSummary(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bebas uppercase tracking-wider">{t('packages.submit_request_2', 'Submit Request')}</h2>
                  <button onClick={() => setShowSummary(false)}>
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Contact Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">{t('packages.company_name', 'Company Name *')}</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={t('packages.your_company_name', 'Your company name')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">{t('packages.contact_email', 'Contact Email *')}</label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder={t('packages.your_email_com', 'your@email.com')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">{t('packages.project_description', 'Project Description')}</label>
                    <Textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder={t('packages.tell_us_about_your_project_and_goals', 'Tell us about your project and goals...')}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Selected Services */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">{t('packages.selected_services', 'Selected Services (')}{selectedServices.size})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedList.map((service) => (
                      <div key={service.id} className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-sm text-foreground">{service.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSubmitRequest}
                  className="w-full font-bebas uppercase tracking-wider"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Preparing..." : "Send Request"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  
                  {t('packages.your_email_client_will_open_with_the_request_det', 'Your email client will open with the request details. Our team will respond within 24-48 hours.')}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Packages;
