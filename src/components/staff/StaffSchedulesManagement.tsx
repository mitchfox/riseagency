import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, User } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

export const StaffSchedulesManagement = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      // Get all users with staff or admin roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['staff', 'admin']);

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setStaffMembers([]);
        setLoading(false);
        return;
      }

      const userIds = roleData.map(r => r.user_id);

      // Get profile info for these users
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profileError) throw profileError;

      const staff = profileData || [];
      setStaffMembers(staff);
      
      // Select first staff member by default
      if (staff.length > 0 && !selectedStaffId) {
        setSelectedStaffId(staff[0].id);
      }
    } catch (error) {
      console.error("Error fetching staff members:", error);
      toast.error("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  const getStaffDisplayName = (staff: StaffMember) => {
    return staff.full_name || staff.email?.split('@')[0] || 'Unknown';
  };

  if (loading) {
    return <div className="text-center py-8">Loading staff members...</div>;
  }

  if (staffMembers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No staff members found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Staff Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStaffId || undefined} onValueChange={setSelectedStaffId}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
              {staffMembers.map((staff) => (
                <TabsTrigger 
                  key={staff.id} 
                  value={staff.id}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  {getStaffDisplayName(staff)}
                </TabsTrigger>
              ))}
            </TabsList>

            {staffMembers.map((staff) => (
              <TabsContent key={staff.id} value={staff.id} className="space-y-6">
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {getStaffDisplayName(staff)}'s Schedule Calendar
                  </h3>
                  <StaffSchedule isAdmin={true} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
