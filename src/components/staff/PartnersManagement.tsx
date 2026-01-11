import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ExternalLink, Image as ImageIcon, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  is_featured: boolean;
  display_order: number;
  category: string;
  case_study_title: string | null;
  case_study_content: string | null;
  case_study_image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PartnersManagementProps {
  isAdmin: boolean;
}

const CATEGORIES = [
  { value: "partner", label: "Partner" },
  { value: "sponsor", label: "Sponsor" },
  { value: "case-study", label: "Case Study" },
];

export const PartnersManagement = ({ isAdmin }: PartnersManagementProps) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    description: "",
    website_url: "",
    is_featured: false,
    display_order: 0,
    category: "partner",
    case_study_title: "",
    case_study_content: "",
    case_study_image_url: "",
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("display_order", { ascending: true });
    
    if (error) {
      toast.error("Failed to fetch partners");
    } else {
      setPartners(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      logo_url: "",
      description: "",
      website_url: "",
      is_featured: false,
      display_order: 0,
      category: "partner",
      case_study_title: "",
      case_study_content: "",
      case_study_image_url: "",
    });
    setEditingPartner(null);
  };

  const openEditDialog = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      logo_url: partner.logo_url || "",
      description: partner.description || "",
      website_url: partner.website_url || "",
      is_featured: partner.is_featured,
      display_order: partner.display_order,
      category: partner.category,
      case_study_title: partner.case_study_title || "",
      case_study_content: partner.case_study_content || "",
      case_study_image_url: partner.case_study_image_url || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'case_study_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    
    const { error } = await supabase.storage
      .from("marketing-gallery")
      .upload(fileName, file);

    if (error) {
      toast.error("Failed to upload image");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("marketing-gallery")
      .getPublicUrl(fileName);

    setFormData(prev => ({ ...prev, [field]: urlData.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Partner name is required");
      return;
    }

    const partnerData = {
      name: formData.name,
      logo_url: formData.logo_url || null,
      description: formData.description || null,
      website_url: formData.website_url || null,
      is_featured: formData.is_featured,
      display_order: formData.display_order,
      category: formData.category,
      case_study_title: formData.case_study_title || null,
      case_study_content: formData.case_study_content || null,
      case_study_image_url: formData.case_study_image_url || null,
    };

    if (editingPartner) {
      const { error } = await supabase
        .from("partners")
        .update(partnerData)
        .eq("id", editingPartner.id);

      if (error) {
        toast.error("Failed to update partner");
      } else {
        toast.success("Partner updated successfully");
        setDialogOpen(false);
        resetForm();
        fetchPartners();
      }
    } else {
      const { error } = await supabase
        .from("partners")
        .insert(partnerData);

      if (error) {
        toast.error("Failed to create partner");
      } else {
        toast.success("Partner created successfully");
        setDialogOpen(false);
        resetForm();
        fetchPartners();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this partner?")) return;

    const { error } = await supabase
      .from("partners")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete partner");
    } else {
      toast.success("Partner deleted");
      fetchPartners();
    }
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading partners...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Business Partners & Case Studies</h3>
          <p className="text-sm text-muted-foreground">Manage partners displayed on the Business page</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPartner ? "Edit Partner" : "Add New Partner"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Partner Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.logo_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="Logo URL or upload"
                      className="flex-1"
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo_url')}
                      className="w-40"
                      disabled={uploading}
                    />
                  </div>
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo preview" className="h-16 object-contain mt-2 bg-muted rounded p-2" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the partnership"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <Input
                      value={formData.website_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label>Featured (displays larger on Business page)</Label>
                </div>

                {formData.category === "case-study" && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-4">Case Study Details</h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Case Study Title</Label>
                          <Input
                            value={formData.case_study_title}
                            onChange={(e) => setFormData(prev => ({ ...prev, case_study_title: e.target.value }))}
                            placeholder="Title of the case study"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Case Study Content</Label>
                          <Textarea
                            value={formData.case_study_content}
                            onChange={(e) => setFormData(prev => ({ ...prev, case_study_content: e.target.value }))}
                            placeholder="Detailed case study description..."
                            rows={5}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Case Study Image</Label>
                          <div className="flex gap-2">
                            <Input
                              value={formData.case_study_image_url}
                              onChange={(e) => setFormData(prev => ({ ...prev, case_study_image_url: e.target.value }))}
                              placeholder="Image URL or upload"
                              className="flex-1"
                            />
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'case_study_image_url')}
                              className="w-40"
                              disabled={uploading}
                            />
                          </div>
                          {formData.case_study_image_url && (
                            <img src={formData.case_study_image_url} alt="Case study preview" className="h-32 object-cover mt-2 rounded" />
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={uploading}>
                    {editingPartner ? "Update Partner" : "Create Partner"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {partners.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No partners yet. Add your first partner!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {partners.map((partner) => (
            <Card key={partner.id} className={partner.is_featured ? "border-primary/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {partner.logo_url ? (
                    <img src={partner.logo_url} alt={partner.name} className="w-16 h-16 object-contain bg-muted rounded p-2" />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{partner.name}</h4>
                      {partner.is_featured && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Featured</span>
                      )}
                      <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{partner.category}</span>
                    </div>
                    {partner.description && (
                      <p className="text-sm text-muted-foreground truncate">{partner.description}</p>
                    )}
                    {partner.case_study_title && (
                      <p className="text-xs text-primary mt-1">Case Study: {partner.case_study_title}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {partner.website_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(partner)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(partner.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
