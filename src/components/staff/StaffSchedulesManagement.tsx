import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Clock, Calendar, User } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AvailabilitySlot {
  id: string;
  staff_id: string;
  availability_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export const StaffSchedulesManagement = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [newSlot, setNewSlot] = useState({
    availability_date: getDefaultDate(),
    start_time: "09:00",
    end_time: "17:00",
    notes: "",
  });

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchAvailabilityForStaff(selectedStaffId);
    }
  }, [selectedStaffId]);

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

  const fetchAvailabilityForStaff = async (staffId: string) => {
    setAvailabilityLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_availability")
        .select("*")
        .eq("staff_id", staffId)
        .order("availability_date")
        .order("start_time");

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const addAvailability = async () => {
    if (!selectedStaffId) return;

    try {
      const { error } = await supabase
        .from("staff_availability")
        .insert({
          staff_id: selectedStaffId,
          availability_date: newSlot.availability_date,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          notes: newSlot.notes || null,
        });

      if (error) throw error;
      
      toast.success("Availability added");
      fetchAvailabilityForStaff(selectedStaffId);
      setNewSlot({
        availability_date: getDefaultDate(),
        start_time: "09:00",
        end_time: "17:00",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding availability:", error);
      toast.error("Failed to add availability");
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from("staff_availability")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Availability removed");
      if (selectedStaffId) {
        fetchAvailabilityForStaff(selectedStaffId);
      }
    } catch (error) {
      console.error("Error deleting availability:", error);
      toast.error("Failed to delete availability");
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

  const selectedStaff = staffMembers.find(s => s.id === selectedStaffId);

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
                {/* Add New Availability */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Availability for {getStaffDisplayName(staff)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newSlot.availability_date}
                        onChange={(e) =>
                          setNewSlot({ ...newSlot, availability_date: e.target.value })
                        }
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newSlot.start_time}
                        onChange={(e) =>
                          setNewSlot({ ...newSlot, start_time: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newSlot.end_time}
                        onChange={(e) =>
                          setNewSlot({ ...newSlot, end_time: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Input
                        placeholder="e.g., Remote only"
                        value={newSlot.notes}
                        onChange={(e) =>
                          setNewSlot({ ...newSlot, notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <Button onClick={addAvailability} className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Availability
                  </Button>
                </div>

                {/* Current Availability */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Current Availability
                  </h3>
                  
                  {availabilityLoading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                  ) : availability.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No availability set for {getStaffDisplayName(staff)}. Add slots above.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {availability.map((slot) => {
                        const date = new Date(slot.availability_date);
                        const formattedDate = date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        });

                        return (
                          <div 
                            key={slot.id} 
                            className="flex items-center justify-between p-3 border rounded-lg bg-background"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{formattedDate}</div>
                              <div className="text-sm text-muted-foreground">
                                {slot.start_time} - {slot.end_time}
                                {slot.notes && ` • ${slot.notes}`}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAvailability(slot.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
