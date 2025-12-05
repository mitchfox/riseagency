import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, User, Plus, Trash2, Clock } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CalendarEvent {
  id: string;
  staff_id: string;
  event_date: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
}

const MAIN_ADMIN_EMAIL = "jolonlevene98@gmail.com";

export const StaffSchedulesManagement = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [newEvent, setNewEvent] = useState({
    event_date: new Date().toISOString().split('T')[0],
    title: "",
    description: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchEventsForStaff(selectedStaffId);
    }
  }, [selectedStaffId]);

  const fetchStaffMembers = async () => {
    try {
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profileError) throw profileError;

      const staff = profileData || [];
      setStaffMembers(staff);
      
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

  const fetchEventsForStaff = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_calendar_events')
        .select('*')
        .eq('staff_id', staffId)
        .order('event_date')
        .order('start_time');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const addEvent = async () => {
    if (!selectedStaffId || !newEvent.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_calendar_events')
        .insert({
          staff_id: selectedStaffId,
          event_date: newEvent.event_date,
          title: newEvent.title.trim(),
          description: newEvent.description || null,
          start_time: newEvent.start_time || null,
          end_time: newEvent.end_time || null,
        });

      if (error) throw error;
      
      toast.success("Event added");
      fetchEventsForStaff(selectedStaffId);
      setNewEvent({
        event_date: new Date().toISOString().split('T')[0],
        title: "",
        description: "",
        start_time: "",
        end_time: "",
      });
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Event removed");
      if (selectedStaffId) {
        fetchEventsForStaff(selectedStaffId);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const getStaffDisplayName = (staff: StaffMember) => {
    return staff.full_name || staff.email?.split('@')[0] || 'Unknown';
  };

  const isMainAdmin = (staff: StaffMember) => {
    return staff.email === MAIN_ADMIN_EMAIL;
  };

  const generateCalendarWeeks = () => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const offsetWeekStart = addWeeks(currentWeekStart, weekOffset * 6);
    const weeks = [];

    for (let i = 0; i < 6; i++) {
      const weekStart = addDays(offsetWeekStart, i * 7);
      weeks.push(weekStart);
    }

    return weeks;
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter(event => 
      isSameDay(parseISO(event.event_date), date)
    );
  };

  const calendarWeeks = generateCalendarWeeks();

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
                {isMainAdmin(staff) ? (
                  // Main admin sees programs & fixtures calendar
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Programs & Fixtures Schedule
                    </h3>
                    <StaffSchedule isAdmin={true} />
                  </div>
                ) : (
                  // Other staff see personal calendar with events
                  <div className="space-y-6">
                    {/* Add Event Form */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Event for {getStaffDisplayName(staff)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={newEvent.event_date}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, event_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Title *</Label>
                          <Input
                            placeholder="Event title"
                            value={newEvent.title}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, title: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={newEvent.start_time}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, start_time: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={newEvent.end_time}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, end_time: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Input
                            placeholder="Optional notes"
                            value={newEvent.description}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, description: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <Button onClick={addEvent} className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                      </Button>
                    </div>

                    {/* Calendar View */}
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {getStaffDisplayName(staff)}'s Calendar
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => setWeekOffset(weekOffset - 1)} 
                            size="sm" 
                            variant="outline"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {weekOffset === 0 ? 'Current' : weekOffset > 0 ? `+${weekOffset * 6} weeks` : `${weekOffset * 6} weeks`}
                          </span>
                          <Button 
                            onClick={() => setWeekOffset(weekOffset + 1)} 
                            size="sm" 
                            variant="outline"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Calendar Grid */}
                      <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                          {/* Header Row */}
                          <div className="grid grid-cols-8 gap-2 mb-2">
                            <div 
                              className="p-2 text-center font-bebas uppercase text-sm rounded-lg"
                              style={{ 
                                backgroundColor: 'hsl(43, 49%, 61%)',
                                color: 'hsl(0, 0%, 0%)'
                              }}
                            >
                              Week
                            </div>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                              <div 
                                key={day}
                                className="p-2 text-center font-bebas uppercase text-sm rounded-lg"
                                style={{ 
                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                  color: 'hsl(0, 0%, 0%)'
                                }}
                              >
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Week Rows */}
                          <div className="space-y-2">
                            {calendarWeeks.map((weekStart, weekIndex) => {
                              const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
                              
                              return (
                                <div key={weekIndex} className="grid grid-cols-8 gap-2">
                                  {/* Week Start Cell */}
                                  <div 
                                    className="p-2 rounded-lg flex flex-col items-center justify-center border"
                                    style={{ 
                                      backgroundColor: isCurrentWeek ? 'hsl(43, 49%, 61%)' : 'hsl(0, 0%, 95%)',
                                      color: 'hsl(0, 0%, 0%)',
                                      borderColor: 'rgba(0, 0, 0, 0.1)'
                                    }}
                                  >
                                    <div className="text-lg font-bold">
                                      {format(weekStart, 'd')}
                                    </div>
                                    <div className="text-xs font-medium italic">
                                      {format(weekStart, 'MMM')}
                                    </div>
                                  </div>

                                  {/* Day Cells */}
                                  {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                                    const currentDate = addDays(weekStart, dayOffset);
                                    const dayEvents = getEventsForDay(currentDate);
                                    const isToday = isSameDay(currentDate, new Date());

                                    return (
                                      <div 
                                        key={dayOffset}
                                        className="p-2 rounded-lg min-h-[70px] relative border transition-all"
                                        style={{ 
                                          backgroundColor: dayEvents.length > 0 ? 'hsl(43, 49%, 25%)' : 'hsl(0, 0%, 10%)',
                                          borderColor: isToday ? 'hsl(43, 49%, 61%)' : 'rgba(255, 255, 255, 0.1)',
                                          borderWidth: isToday ? '2px' : '1px'
                                        }}
                                      >
                                        {/* Day number */}
                                        <span 
                                          className="absolute top-0.5 right-1 text-xs opacity-40"
                                          style={{ color: 'hsl(0, 0%, 100%)' }}
                                        >
                                          {format(currentDate, 'd')}
                                        </span>

                                        {/* Events */}
                                        {dayEvents.length > 0 && (
                                          <div className="flex flex-col gap-1 mt-4">
                                            {dayEvents.slice(0, 2).map((event) => (
                                              <div 
                                                key={event.id}
                                                className="text-xs p-1 rounded group relative"
                                                style={{ 
                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                  color: 'hsl(0, 0%, 0%)'
                                                }}
                                                title={`${event.title}${event.start_time ? ` at ${event.start_time}` : ''}`}
                                              >
                                                <div className="font-bold truncate pr-4">{event.title}</div>
                                                {event.start_time && (
                                                  <div className="text-[10px] opacity-75 flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {event.start_time}{event.end_time && ` - ${event.end_time}`}
                                                  </div>
                                                )}
                                                <button
                                                  onClick={() => deleteEvent(event.id)}
                                                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  <Trash2 className="h-3 w-3 text-destructive" />
                                                </button>
                                              </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                              <div className="text-[10px] text-center opacity-60 text-white">
                                                +{dayEvents.length - 2} more
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Event List */}
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Upcoming Events
                      </h3>
                      {events.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No events scheduled for {getStaffDisplayName(staff)}. Add events above.
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {events.slice(0, 10).map((event) => {
                            const date = new Date(event.event_date);
                            const formattedDate = date.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            });

                            return (
                              <div 
                                key={event.id} 
                                className="flex items-center justify-between p-3 border rounded-lg bg-background"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{event.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formattedDate}
                                    {event.start_time && ` • ${event.start_time}`}
                                    {event.end_time && ` - ${event.end_time}`}
                                    {event.description && ` • ${event.description}`}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteEvent(event.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
