import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  FileText, 
  Copy, 
  Download, 
  Check, 
  Plus, 
  X, 
  Building2, 
  Users, 
  Trophy,
  Megaphone,
  Camera,
  TrendingUp,
  Globe,
  Handshake,
  BarChart3,
  HeadphonesIcon,
  Sparkles,
  Target,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";

// Service categories with their items
const SERVICE_CATEGORIES = [
  {
    id: 'strategy',
    title: 'Commercial Strategy & Planning',
    description: 'Entry point for many businesses',
    icon: Target,
    services: [
      { id: 'business-audit', name: 'Business Growth Audit' },
      { id: 'campaign-kpi', name: 'Campaign Objectives & KPI Definition' },
      { id: 'football-strategy', name: 'Football Partnership Strategy' },
      { id: 'sponsorship-strategy', name: 'Sponsorship Strategy' },
      { id: 'brand-positioning', name: 'Brand Positioning via Football' },
      { id: 'market-analysis', name: 'Market & Audience Analysis' },
      { id: 'campaign-planning', name: 'Campaign & Activation Planning' },
      { id: 'opportunity-mapping', name: 'Commercial Opportunity Mapping' },
    ]
  },
  {
    id: 'talent',
    title: 'Football Talent Access & Management',
    description: 'Core differentiator — built on your footballer scouting network',
    icon: Users,
    services: [
      { id: 'talent-access', name: 'Access to Professional Footballers' },
      { id: 'player-shortlisting', name: 'Player Shortlisting for Brand Campaigns' },
      { id: 'talent-matching', name: 'Talent–Brand Matching' },
      { id: 'availability-assessment', name: 'Player Availability & Suitability Assessment' },
      { id: 'contract-negotiation', name: 'Contract & Rights Negotiation' },
      { id: 'image-rights', name: 'Image Rights Management' },
      { id: 'player-scheduling', name: 'Player Scheduling & Coordination' },
      { id: 'ambassador-deals', name: 'Long-Term Brand Ambassador Deals' },
    ]
  },
  {
    id: 'clubs',
    title: 'Club & Football Property Connections',
    description: 'Only where it serves business objectives',
    icon: Trophy,
    services: [
      { id: 'club-intro', name: 'Club Sponsorship Introductions' },
      { id: 'club-strategy', name: 'Club Partnership Strategy' },
      { id: 'rights-assessment', name: 'Rights Assessment (what brands can/can\'t do)' },
      { id: 'club-activation', name: 'Campaign Activation with Clubs' },
      { id: 'matchday-access', name: 'Matchday & Event Access' },
      { id: 'club-content', name: 'Club-Led Content Opportunities' },
    ]
  },
  {
    id: 'campaign',
    title: 'Campaign Development & Activation',
    description: 'End-to-end campaign execution',
    icon: Megaphone,
    services: [
      { id: 'concept-dev', name: 'Campaign Concept Development' },
      { id: 'brand-activations', name: 'Football-Led Brand Activations' },
      { id: 'product-launches', name: 'Product Launches Using Football Talent' },
      { id: 'tournament-campaigns', name: 'Seasonal / Tournament Campaigns' },
      { id: 'event-campaigns', name: 'Event-Based Campaigns' },
      { id: 'digital-physical', name: 'Digital & Physical Activations' },
      { id: 'campaign-management', name: 'End-to-End Campaign Management' },
    ]
  },
  {
    id: 'content',
    title: 'Content & Creative Production',
    description: 'Full creative services',
    icon: Camera,
    services: [
      { id: 'content-strategy', name: 'Football Content Strategy' },
      { id: 'video-production', name: 'Short-Form Video Production' },
      { id: 'social-content', name: 'Social Media Content Creation' },
      { id: 'branded-content', name: 'Branded Player Content' },
      { id: 'documentary-content', name: 'Interview & Documentary-Style Content' },
      { id: 'matchday-content', name: 'Matchday Content' },
      { id: 'photography', name: 'Photography' },
      { id: 'graphic-design', name: 'Graphic Design' },
      { id: 'copywriting', name: 'Campaign Copywriting' },
    ]
  },
  {
    id: 'paid-media',
    title: 'Paid Media & Performance Marketing',
    description: 'Paid advertising management',
    icon: TrendingUp,
    services: [
      { id: 'paid-social', name: 'Paid Social Campaign Management' },
      { id: 'ad-creative', name: 'Ad Creative Development' },
      { id: 'funnel-strategy', name: 'Funnel Strategy & Build' },
      { id: 'retargeting', name: 'Retargeting Campaigns' },
      { id: 'budget-management', name: 'Budget Management & Scaling' },
      { id: 'performance-testing', name: 'Performance Testing & Optimisation' },
      { id: 'conversion-tracking', name: 'Conversion Tracking Setup' },
    ]
  },
  {
    id: 'digital',
    title: 'Digital & Conversion Assets',
    description: 'Landing pages and conversion tools',
    icon: Globe,
    services: [
      { id: 'landing-pages', name: 'Campaign Landing Pages' },
      { id: 'microsite', name: 'Microsite Creation' },
      { id: 'website-optimisation', name: 'Website Optimisation for Campaigns' },
      { id: 'conversion-copy', name: 'Conversion Copywriting' },
      { id: 'lead-capture', name: 'Lead Capture Systems' },
      { id: 'crm-integration', name: 'CRM & Email Integration (where relevant)' },
    ]
  },
  {
    id: 'sponsorship',
    title: 'Sponsorship & Commercial Activation',
    description: 'Sponsorship planning and execution',
    icon: Handshake,
    services: [
      { id: 'sponsorship-planning', name: 'Sponsorship Planning & Valuation' },
      { id: 'rights-packaging', name: 'Rights Packaging & Negotiation' },
      { id: 'sponsor-ideas', name: 'Sponsor Activation Ideas' },
      { id: 'brand-visibility', name: 'Brand Visibility Planning' },
      { id: 'asset-utilisation', name: 'Asset Utilisation Strategy' },
      { id: 'post-activation', name: 'Post-Activation Analysis' },
    ]
  },
  {
    id: 'analytics',
    title: 'Market Intelligence & Analytics',
    description: 'Performance tracking and insights',
    icon: BarChart3,
    services: [
      { id: 'campaign-reporting', name: 'Campaign Performance Reporting' },
      { id: 'audience-reporting', name: 'Audience Reach & Engagement Reporting' },
      { id: 'roi-analysis', name: 'ROI & Commercial Impact Analysis' },
      { id: 'content-analysis', name: 'Content Performance Analysis' },
      { id: 'partnership-reviews', name: 'Partnership Effectiveness Reviews' },
      { id: 'insights-recs', name: 'Insights & Optimisation Recommendations' },
    ]
  },
  {
    id: 'ongoing',
    title: 'Ongoing Management & Support',
    description: 'Long-term partnership support',
    icon: HeadphonesIcon,
    services: [
      { id: 'ongoing-management', name: 'Ongoing Campaign Management' },
      { id: 'monthly-reviews', name: 'Monthly Performance Reviews' },
      { id: 'strategy-refinement', name: 'Strategy Refinement' },
      { id: 'account-management', name: 'Account Management' },
      { id: 'partnership-oversight', name: 'Long-Term Partnership Oversight' },
      { id: 'advisory-support', name: 'Advisory & Consultancy Support' },
    ]
  },
  {
    id: 'premium',
    title: 'Optional / Premium Add-Ons',
    description: 'Exclusive services',
    icon: Sparkles,
    services: [
      { id: 'exclusive-access', name: 'Exclusive Player Access Campaigns' },
      { id: 'international', name: 'International Campaign Support' },
      { id: 'multi-market', name: 'Multi-Market Activations' },
      { id: 'white-label', name: 'White-Label Campaign Execution' },
      { id: 'confidential', name: 'Confidential Brand–Talent Projects' },
    ]
  },
];

// Pre-defined package templates
const PACKAGE_TEMPLATES = [
  {
    name: 'Starter Package',
    description: 'Entry-level partnership for businesses new to football marketing',
    services: ['business-audit', 'market-analysis', 'player-shortlisting', 'talent-matching', 'social-content', 'campaign-reporting']
  },
  {
    name: 'Growth Package',
    description: 'Comprehensive campaign support with talent access',
    services: ['football-strategy', 'campaign-planning', 'talent-access', 'player-shortlisting', 'talent-matching', 'image-rights', 'concept-dev', 'video-production', 'social-content', 'campaign-reporting', 'monthly-reviews']
  },
  {
    name: 'Enterprise Package',
    description: 'Full-service partnership with premium support',
    services: ['business-audit', 'campaign-kpi', 'football-strategy', 'sponsorship-strategy', 'talent-access', 'player-shortlisting', 'talent-matching', 'image-rights', 'ambassador-deals', 'club-intro', 'concept-dev', 'brand-activations', 'video-production', 'social-content', 'photography', 'paid-social', 'landing-pages', 'campaign-reporting', 'roi-analysis', 'ongoing-management', 'account-management']
  },
];

interface ProposalData {
  clientName: string;
  projectName: string;
  selectedServices: string[];
  customNotes: string;
  packageName: string;
}

export const SalesDeck = () => {
  const [activeTab, setActiveTab] = useState('builder');
  const [proposal, setProposal] = useState<ProposalData>({
    clientName: '',
    projectName: '',
    selectedServices: [],
    customNotes: '',
    packageName: '',
  });
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const proposalRef = useRef<HTMLDivElement>(null);

  const toggleService = (serviceId: string) => {
    setProposal(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const selectCategory = (categoryId: string, select: boolean) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const serviceIds = category.services.map(s => s.id);
    
    setProposal(prev => ({
      ...prev,
      selectedServices: select
        ? [...new Set([...prev.selectedServices, ...serviceIds])]
        : prev.selectedServices.filter(id => !serviceIds.includes(id))
    }));
  };

  const applyTemplate = (template: typeof PACKAGE_TEMPLATES[0]) => {
    setProposal(prev => ({
      ...prev,
      selectedServices: template.services,
      packageName: template.name,
    }));
    toast.success(`Applied "${template.name}" template`);
  };

  const getServiceName = (serviceId: string): string => {
    for (const category of SERVICE_CATEGORIES) {
      const service = category.services.find(s => s.id === serviceId);
      if (service) return service.name;
    }
    return serviceId;
  };

  const getCategoryForService = (serviceId: string): typeof SERVICE_CATEGORIES[0] | undefined => {
    return SERVICE_CATEGORIES.find(c => c.services.some(s => s.id === serviceId));
  };

  const groupedSelectedServices = () => {
    const grouped: Record<string, string[]> = {};
    proposal.selectedServices.forEach(serviceId => {
      const category = getCategoryForService(serviceId);
      if (category) {
        if (!grouped[category.id]) grouped[category.id] = [];
        grouped[category.id].push(serviceId);
      }
    });
    return grouped;
  };

  const generateProposalText = () => {
    const grouped = groupedSelectedServices();
    let text = '';
    
    if (proposal.clientName) {
      text += `PROPOSAL FOR: ${proposal.clientName.toUpperCase()}\n`;
    }
    if (proposal.projectName) {
      text += `PROJECT: ${proposal.projectName}\n`;
    }
    if (proposal.packageName) {
      text += `PACKAGE: ${proposal.packageName}\n`;
    }
    text += '\n---\n\n';
    text += 'SERVICES INCLUDED:\n\n';
    
    Object.entries(grouped).forEach(([categoryId, serviceIds]) => {
      const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
      if (category) {
        text += `${category.title}\n`;
        serviceIds.forEach(id => {
          text += `  • ${getServiceName(id)}\n`;
        });
        text += '\n';
      }
    });
    
    if (proposal.customNotes) {
      text += '---\n\nADDITIONAL NOTES:\n' + proposal.customNotes + '\n';
    }
    
    return text;
  };

  const copyToClipboard = async () => {
    const text = generateProposalText();
    await navigator.clipboard.writeText(text);
    setCopiedToClipboard(true);
    toast.success('Proposal copied to clipboard');
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  const clearProposal = () => {
    setProposal({
      clientName: '',
      projectName: '',
      selectedServices: [],
      customNotes: '',
      packageName: '',
    });
    toast.success('Proposal cleared');
  };

  const isCategoryFullySelected = (categoryId: string) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return false;
    return category.services.every(s => proposal.selectedServices.includes(s.id));
  };

  const isCategoryPartiallySelected = (categoryId: string) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return false;
    const selected = category.services.filter(s => proposal.selectedServices.includes(s.id));
    return selected.length > 0 && selected.length < category.services.length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Sales Deck Builder
              </CardTitle>
              <CardDescription>
                Build proposals for business partnerships by selecting services and packages
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-primary">
              {proposal.selectedServices.length} services selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-auto flex-wrap p-1">
              <TabsTrigger value="builder" className="flex-1 text-xs sm:text-sm">Builder</TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 text-xs sm:text-sm">Templates</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 text-xs sm:text-sm">Preview</TabsTrigger>
            </TabsList>

            {/* Service Builder Tab */}
            <TabsContent value="builder" className="space-y-4 mt-4">
              {/* Client Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g. Nike, Red Bull, etc."
                    value={proposal.clientName}
                    onChange={(e) => setProposal(prev => ({ ...prev, clientName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g. Summer 2025 Campaign"
                    value={proposal.projectName}
                    onChange={(e) => setProposal(prev => ({ ...prev, projectName: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Service Categories */}
              <div>
                <h3 className="font-semibold mb-3">Select Services</h3>
                <ScrollArea className="h-[500px] pr-4">
                  <Accordion type="multiple" className="space-y-2">
                    {SERVICE_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      const isFullySelected = isCategoryFullySelected(category.id);
                      const isPartiallySelected = isCategoryPartiallySelected(category.id);
                      
                      return (
                        <AccordionItem 
                          key={category.id} 
                          value={category.id}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${isFullySelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="text-left flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{category.title}</span>
                                  {isFullySelected && (
                                    <Badge className="bg-primary/20 text-primary text-xs">All selected</Badge>
                                  )}
                                  {isPartiallySelected && (
                                    <Badge variant="outline" className="text-xs">
                                      {category.services.filter(s => proposal.selectedServices.includes(s.id)).length}/{category.services.length}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{category.description}</p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => selectCategory(category.id, true)}
                                  disabled={isFullySelected}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Select All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => selectCategory(category.id, false)}
                                  disabled={!isFullySelected && !isPartiallySelected}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Clear All
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {category.services.map((service) => (
                                  <div
                                    key={service.id}
                                    className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                      proposal.selectedServices.includes(service.id)
                                        ? 'bg-primary/10 border-primary'
                                        : 'hover:bg-muted'
                                    }`}
                                    onClick={() => toggleService(service.id)}
                                  >
                                    <Checkbox
                                      checked={proposal.selectedServices.includes(service.id)}
                                      onCheckedChange={() => toggleService(service.id)}
                                    />
                                    <span className="text-sm">{service.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Package Templates Tab */}
            <TabsContent value="templates" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Quick-start with a pre-defined package template. You can customise the services after applying.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PACKAGE_TEMPLATES.map((template) => (
                  <Card 
                    key={template.name}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium text-foreground">{template.services.length}</span> services included
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Apply Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="customPackageName">Custom Package Name</Label>
                <Input
                  id="customPackageName"
                  placeholder="e.g. Custom Enterprise Solution"
                  value={proposal.packageName}
                  onChange={(e) => setProposal(prev => ({ ...prev, packageName: e.target.value }))}
                />
              </div>
            </TabsContent>

            {/* Preview & Export Tab */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Proposal Preview</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearProposal}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copiedToClipboard ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedToClipboard ? 'Copied!' : 'Copy to Clipboard'}
                  </Button>
                </div>
              </div>

              {proposal.selectedServices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No services selected yet</p>
                  <p className="text-sm">Go to Service Builder to add services</p>
                </div>
              ) : (
                <div ref={proposalRef} className="border rounded-lg p-6 bg-card space-y-4">
                  {/* Header */}
                  <div className="border-b pb-4">
                    {proposal.clientName && (
                      <h2 className="text-xl font-bold text-primary">
                        PROPOSAL FOR: {proposal.clientName.toUpperCase()}
                      </h2>
                    )}
                    {proposal.projectName && (
                      <p className="text-muted-foreground">Project: {proposal.projectName}</p>
                    )}
                    {proposal.packageName && (
                      <Badge className="mt-2">{proposal.packageName}</Badge>
                    )}
                  </div>

                  {/* Services by Category */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Services Included</h3>
                    {Object.entries(groupedSelectedServices()).map(([categoryId, serviceIds]) => {
                      const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
                      if (!category) return null;
                      const Icon = category.icon;
                      
                      return (
                        <div key={categoryId} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{category.title}</span>
                          </div>
                          <ul className="ml-6 space-y-1">
                            {serviceIds.map(id => (
                              <li key={id} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {getServiceName(id)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Notes */}
                  {proposal.customNotes && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Additional Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.customNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Notes Input */}
              <div className="space-y-2">
                <Label htmlFor="customNotes">Additional Notes</Label>
                <Textarea
                  id="customNotes"
                  placeholder="Add any custom notes, pricing, timeline, or special requirements..."
                  value={proposal.customNotes}
                  onChange={(e) => setProposal(prev => ({ ...prev, customNotes: e.target.value }))}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p><strong>Public site:</strong> Show 6–8 core services only</p>
          <p><strong>Sales decks / proposals:</strong> Pull from the full service list</p>
          <p><strong>Packages:</strong> Bundle 5–10 services per tier</p>
          <p><strong>Outbound:</strong> Lead with outcome, not the service name</p>
        </CardContent>
      </Card>
    </div>
  );
};
