import { useEffect } from "react";
import ClubNetworkManagement from "@/components/staff/ClubNetworkManagement";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const ClubNetwork = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO
        title="Club Network - RISE Football Agency"
        description="Access our extensive network of football clubs and contacts across Europe. Connect with scouts, directors, and key decision-makers."
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bebas mb-4">CLUB NETWORK</h1>
                <p className="text-muted-foreground text-lg">
                  Explore our extensive network of football clubs, scouts, and key decision-makers across Europe.
                </p>
              </div>
              <ClubNetworkManagement />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ClubNetwork;
