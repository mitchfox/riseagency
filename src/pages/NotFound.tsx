import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    console.log("404 Error: Page not found:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <SEO 
        title="Page Not Found | RISE Football Agency"
        description="The page you're looking for doesn't exist. Return to RISE Football Agency homepage."
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-lg">
          {/* 404 Display */}
          <div className="space-y-4">
            <h1 className="text-[120px] md:text-[180px] font-bebas leading-none text-primary tracking-tight">
              404
            </h1>
            <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground">
              Page Not Found
            </h2>
            <p className="text-muted-foreground text-lg">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Countdown */}
          <p className="text-sm text-muted-foreground">
            Redirecting to homepage in{" "}
            <span className="text-primary font-bold">{countdown}</span> seconds
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/">
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="font-bebas uppercase tracking-wider"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go Back
            </Button>
          </div>

          {/* Quick Links */}
          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Or try these popular pages:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/players" className="text-primary hover:underline text-sm">
                Players
              </Link>
              <Link to="/about" className="text-primary hover:underline text-sm">
                About Us
              </Link>
              <Link to="/news" className="text-primary hover:underline text-sm">
                News
              </Link>
              <Link to="/contact" className="text-primary hover:underline text-sm">
                Contact
              </Link>
              <Link to="/portal" className="text-primary hover:underline text-sm">
                Portal
              </Link>
              <Link to="/staff" className="text-primary hover:underline text-sm">
                Staff
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
