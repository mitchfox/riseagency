import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, User, Plus, Trash2, Clock, CalendarDays, CalendarRange, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffSchedule } from "./StaffSchedule";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, startOfMonth, endOfMonth, getDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CalendarEvent {
  id: string;
  staff_id: string;
  event_date: string;
  end_date: string | null;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  is_ongoing: boolean | null;
  category: string | null;
  day_of_week: number | null;
}

const EVENT_CATEGORIES = [
  { value: 'work', label: 'Work', color: 'hsl(43, 49%, 61%)' },
  { value: 'personal', label: 'Personal', color: 'hsl(200, 70%, 50%)' },
  { value: 'meeting', label: 'Meeting', color: 'hsl(280, 60%, 55%)' },
  { value: 'training', label: 'Training', color: 'hsl(140, 60%, 45%)' },
];

const MAIN_ADMIN_EMAIL = "jolonlevene98@gmail.com";

export const StaffSchedulesManagement = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [newEvent, setNewEvent] = useState({
    event_date: new Date().toISOString().split('T')[0],
    end_date: "",
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    is_ongoing: false,
    category: "work",
  });
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
          end_date: newEvent.end_date || null,
          title: newEvent.title.trim(),
          description: newEvent.description || null,
          start_time: newEvent.start_time || null,
          end_time: newEvent.end_time || null,
          is_ongoing: newEvent.is_ongoing,
          category: newEvent.category,
        });

      if (error) throw error;
      
      toast.success("Event added");
      fetchEventsForStaff(selectedStaffId);
      setNewEvent({
        event_date: new Date().toISOString().split('T')[0],
        end_date: "",
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        is_ongoing: false,
        category: "work",
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

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const updateEvent = async () => {
    if (!editingEvent || !selectedStaffId) return;

    try {
      const { error } = await supabase
        .from('staff_calendar_events')
        .update({
          event_date: editingEvent.event_date,
          end_date: editingEvent.end_date || null,
          title: editingEvent.title,
          description: editingEvent.description || null,
          start_time: editingEvent.start_time || null,
          end_time: editingEvent.end_time || null,
          is_ongoing: editingEvent.is_ongoing,
          category: editingEvent.category,
        })
        .eq('id', editingEvent.id);

      if (error) throw error;
      
      toast.success("Event updated");
      setEditDialogOpen(false);
      setEditingEvent(null);
      fetchEventsForStaff(selectedStaffId);
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const getStaffDisplayName = (staff: StaffMember) => {
    return staff.full_name || staff.email?.split('@')[0] || 'Unknown';
  };

  const isMainAdmin = (staff: StaffMember) => {
    return staff.email === MAIN_ADMIN_EMAIL;
  };

  // Generate days for weekly view (7 days from today)
  const generateWeeklyDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(today, i));
    }
    return days;
  };

  // Generate weeks for monthly view (full month starting from current week)
  const generateMonthlyWeeks = () => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const offsetWeekStart = addWeeks(currentWeekStart, weekOffset * 5);
    const weeks = [];

    for (let i = 0; i < 5; i++) {
      const weekStart = addDays(offsetWeekStart, i * 7);
      weeks.push(weekStart);
    }

    return weeks;
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const currentDayOfWeek = date.getDay();
    return events.filter(event => {
      if (event.is_ongoing && event.day_of_week !== null) {
        return event.day_of_week === currentDayOfWeek;
      }
      if (event.is_ongoing && event.day_of_week === null) {
        return true;
      }
      // Check if date falls within event range (start_date to end_date)
      const eventStart = parseISO(event.event_date);
      if (event.end_date) {
        const eventEnd = parseISO(event.end_date);
        return date >= eventStart && date <= eventEnd;
      }
      return isSameDay(eventStart, date);
    });
  };

  const getCategoryColor = (category: string | null): string => {
    const cat = EVENT_CATEGORIES.find(c => c.value === category);
    return cat?.color || 'hsl(43, 49%, 61%)';
  };

  const weeklyDays = generateWeeklyDays();
  const monthlyWeeks = generateMonthlyWeeks();

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

  const EventCard = ({ event, showDelete = true }: { event: CalendarEvent; showDelete?: boolean }) => (
    <div 
      className="text-xs p-2 rounded group relative cursor-pointer hover:opacity-90 transition-opacity"
      style={{ 
        backgroundColor: getCategoryColor(event.category),
        color: 'hsl(0, 0%, 0%)'
      }}
      onClick={() => openEditDialog(event)}
    >
      <div className="font-bold truncate pr-10 flex items-center gap-1">
        {event.is_ongoing && <span className="text-[8px]">🔄</span>}
        {event.title}
      </div>
      {event.start_time && (
        <div className="text-[10px] opacity-75 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {event.start_time}{event.end_time && ` - ${event.end_time}`}
        </div>
      )}
      {event.end_date && (
        <div className="text-[10px] opacity-75 flex items-center gap-1">
          <CalendarRange className="h-2.5 w-2.5" />
          Until {format(parseISO(event.end_date), 'MMM d')}
        </div>
      )}
      {event.description && (
        <div className="text-[10px] opacity-60 truncate mt-0.5">{event.description}</div>
      )}
      {showDelete && (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(event);
            }}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteEvent(event.id);
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
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
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Programs & Fixtures Schedule
                    </h3>
                    <StaffSchedule isAdmin={true} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Add Event Form */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Event for {getStaffDisplayName(staff)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          <Label>Category</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={newEvent.category}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, category: e.target.value })
                            }
                          >
                            {EVENT_CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={newEvent.event_date}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, event_date: e.target.value })
                            }
                            disabled={newEvent.is_ongoing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date (optional)</Label>
                          <Input
                            type="date"
                            value={newEvent.end_date}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, end_date: e.target.value })
                            }
                            disabled={newEvent.is_ongoing}
                            min={newEvent.event_date}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id="is_ongoing"
                            checked={newEvent.is_ongoing}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, is_ongoing: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-input"
                          />
                          <Label htmlFor="is_ongoing" className="cursor-pointer">
                            Ongoing task (shows every day)
                          </Label>
                        </div>
                      </div>
                      <Button onClick={addEvent} className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                      </Button>
                    </div>

                    {/* View Toggle & Calendar */}
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {getStaffDisplayName(staff)}'s Calendar
                        </h3>
                        
                        <div className="flex items-center gap-3">
                          {/* View Mode Toggle */}
                          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                            <Button
                              size="sm"
                              variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                              onClick={() => setViewMode('weekly')}
                              className="h-8 px-3"
                            >
                              <CalendarDays className="h-4 w-4 mr-1" />
                              Weekly
                            </Button>
                            <Button
                              size="sm"
                              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                              onClick={() => setViewMode('monthly')}
                              className="h-8 px-3"
                            >
                              <CalendarRange className="h-4 w-4 mr-1" />
                              Monthly
                            </Button>
                          </div>

                          {/* Navigation (monthly only) */}
                          {viewMode === 'monthly' && (
                            <div className="flex items-center gap-2">
                              <Button 
                                onClick={() => setWeekOffset(weekOffset - 1)} 
                                size="sm" 
                                variant="outline"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                                {weekOffset === 0 ? 'Current' : weekOffset > 0 ? `+${weekOffset * 5}w` : `${weekOffset * 5}w`}
                              </span>
                              <Button 
                                onClick={() => setWeekOffset(weekOffset + 1)} 
                                size="sm" 
                                variant="outline"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Weekly View */}
                      {viewMode === 'weekly' && (
                        <div className="space-y-3">
                          {weeklyDays.map((date, index) => {
                            const dayEvents = getEventsForDay(date);
                            const isToday = isSameDay(date, new Date());

                            return (
                              <div 
                                key={index}
                                className="p-4 rounded-lg border transition-all"
                                style={{ 
                                  backgroundColor: isToday ? 'hsl(43, 49%, 25%)' : 'hsl(0, 0%, 10%)',
                                  borderColor: isToday ? 'hsl(43, 49%, 61%)' : 'rgba(255, 255, 255, 0.1)',
                                  borderWidth: isToday ? '2px' : '1px'
                                }}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="text-lg font-bold px-3 py-1 rounded"
                                      style={{ 
                                        backgroundColor: isToday ? 'hsl(43, 49%, 61%)' : 'rgba(255,255,255,0.1)',
                                        color: isToday ? 'hsl(0, 0%, 0%)' : 'hsl(0, 0%, 100%)'
                                      }}
                                    >
                                      {format(date, 'EEE')}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-white">{format(date, 'MMMM d, yyyy')}</div>
                                      {isToday && <span className="text-xs text-primary">Today</span>}
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                                  </div>
                                </div>

                                {dayEvents.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">No events scheduled</p>
                                ) : (
                                  <div className="grid gap-2">
                                    {dayEvents.map((event) => (
                                      <EventCard key={event.id} event={event} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Monthly View */}
                      {viewMode === 'monthly' && (
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
                              {monthlyWeeks.map((weekStart, weekIndex) => {
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
                                      const hasMoreEvents = dayEvents.length > 2;

                                      return (
                                        <div 
                                          key={dayOffset}
                                          className="p-2 rounded-lg min-h-[90px] relative border transition-all"
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
                                                    backgroundColor: getCategoryColor(event.category),
                                                    color: 'hsl(0, 0%, 0%)'
                                                  }}
                                                  title={`${event.title}${event.start_time ? ` at ${event.start_time}` : ''}${event.is_ongoing ? ' (ongoing)' : ''}`}
                                                >
                                                  <div className="font-bold truncate pr-4 flex items-center gap-1">
                                                    {event.is_ongoing && <span className="text-[8px]">🔄</span>}
                                                    {event.title}
                                                  </div>
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
                                              
                                              {/* See More Popover */}
                                              {hasMoreEvents && (
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <button className="text-[10px] text-center opacity-80 text-white hover:opacity-100 hover:text-primary transition-all cursor-pointer bg-black/30 rounded px-1 py-0.5">
                                                      +{dayEvents.length - 2} more
                                                    </button>
                                                  </PopoverTrigger>
                                                  <PopoverContent 
                                                    className="w-64 p-3" 
                                                    align="center"
                                                    side="top"
                                                  >
                                                    <div className="space-y-2">
                                                      <div className="font-semibold text-sm border-b pb-2 mb-2">
                                                        {format(currentDate, 'EEEE, MMMM d')}
                                                      </div>
                                                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                        {dayEvents.map((event) => (
                                                          <EventCard key={event.id} event={event} />
                                                        ))}
                                                      </div>
                                                    </div>
                                                  </PopoverContent>
                                                </Popover>
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
                      )}
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
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: getCategoryColor(event.category) }}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium flex items-center gap-2">
                                      {event.title}
                                      {event.is_ongoing && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                          Ongoing
                                        </span>
                                      )}
                                      <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: getCategoryColor(event.category), color: 'black' }}>
                                        {event.category}
                                      </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {event.is_ongoing ? 'Every day' : formattedDate}
                                      {event.start_time && ` • ${event.start_time}`}
                                      {event.end_time && ` - ${event.end_time}`}
                                      {event.description && ` • ${event.description}`}
                                    </div>
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

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit Event
            </DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingEvent.title}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editingEvent.category || 'work'}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, category: e.target.value })
                  }
                >
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editingEvent.event_date}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, event_date: e.target.value })
                    }
                    disabled={editingEvent.is_ongoing || false}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={editingEvent.end_date || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, end_date: e.target.value || null })
                    }
                    disabled={editingEvent.is_ongoing || false}
                    min={editingEvent.event_date}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={editingEvent.start_time || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, start_time: e.target.value || null })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={editingEvent.end_time || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, end_time: e.target.value || null })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editingEvent.description || ''}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, description: e.target.value || null })
                  }
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_ongoing"
                  checked={editingEvent.is_ongoing || false}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, is_ongoing: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="edit_is_ongoing" className="cursor-pointer">
                  Ongoing task (shows every day)
                </Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={updateEvent} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
