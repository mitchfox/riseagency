import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setUser(session.user);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <p className="text-muted-foreground p-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-bebas uppercase tracking-wider text-foreground mb-2">
                Player Portal
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="font-bebas uppercase tracking-wider"
            >
              Log Out
            </Button>
          </div>

          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-8">
              <TabsTrigger value="analysis" className="font-bebas uppercase">
                Performance Analysis
              </TabsTrigger>
              <TabsTrigger value="physical" className="font-bebas uppercase">
                Physical Programming
              </TabsTrigger>
              <TabsTrigger value="profile" className="font-bebas uppercase">
                My Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-6">
              <Card className="bg-marble">
                <CardHeader>
                  <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                    Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Your personalized performance analysis will appear here. This section will include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Match performance reviews</li>
                    <li>Technical skill assessments</li>
                    <li>Tactical positioning analysis</li>
                    <li>Areas for improvement</li>
                    <li>Strengths to leverage</li>
                  </ul>
                  <div className="mt-6 p-6 border border-primary/20 rounded-lg">
                    <p className="text-center text-muted-foreground italic">
                      Content coming soon - your coach will upload analysis reports here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="physical" className="space-y-6">
              <Card className="bg-marble">
                <CardHeader>
                  <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                    Physical Programming
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Your personalized physical training program will appear here. This section will include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Weekly training schedules</li>
                    <li>Strength & conditioning workouts</li>
                    <li>Recovery protocols</li>
                    <li>Nutrition guidelines</li>
                    <li>Injury prevention exercises</li>
                  </ul>
                  <div className="mt-6 p-6 border border-primary/20 rounded-lg">
                    <p className="text-center text-muted-foreground italic">
                      Content coming soon - your strength coach will upload programs here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-marble">
                <CardHeader>
                  <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                    My Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="border-b border-border pb-3">
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-lg">{user?.user_metadata?.full_name || "Not set"}</p>
                    </div>
                    <div className="border-b border-border pb-3">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-lg">{user?.email}</p>
                    </div>
                    <div className="border-b border-border pb-3">
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="text-lg">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
