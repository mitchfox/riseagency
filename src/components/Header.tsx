import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { X } from "lucide-react";
import { TbMenu } from "react-icons/tb";
import workingTogether from "@/assets/menu-working-together.jpg";
import playerPortalImage from "@/assets/menu-player-portal.png";
import blackMarbleBg from "@/assets/black-marble-menu.png";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { RepresentationDialog } from "@/components/RepresentationDialog";

export const Header = () => {
  const [representationOpen, setRepresentationOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Drawer Menu - Left */}
          <Drawer direction="left">
            <DrawerTrigger asChild>
              <button
                className="group relative w-12 h-12 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Toggle menu"
              >
                <TbMenu className="w-7 h-7 text-primary group-hover:text-foreground transition-colors" />
              </button>
            </DrawerTrigger>
            <DrawerContent 
              className="h-full w-[240px] left-0 flex flex-col rounded-r-none bg-cover bg-center"
              style={{ 
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${blackMarbleBg})` 
              }}
            >
              <div className="flex justify-end p-4">
                <DrawerClose asChild>
                  <button
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none text-white"
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </DrawerClose>
              </div>
              <nav className="flex flex-col gap-1 px-4 flex-1">
                <DrawerClose asChild>
                  <Link
                    to="/"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Home
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/stars"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Stars
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/players"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Players
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/clubs"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Clubs
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/coaches"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Coaches
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/scouts"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Scouts
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/performance"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Performance
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/about"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    About
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/contact"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    Contact
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/news"
                    className="text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-white/10 rounded"
                  >
                    News
                  </Link>
                </DrawerClose>
              </nav>
              
              {/* Player Portal Box */}
              <div className="px-4 pb-3">
                <div className="relative overflow-hidden rounded-lg h-24">
                  <div 
                    className="absolute inset-0 bg-cover bg-top"
                    style={{ backgroundImage: `url(${playerPortalImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
                  <div className="relative h-full flex flex-col items-center justify-between p-4">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-white drop-shadow-lg text-center">
                      Player Portal
                    </h3>
                    <DrawerClose asChild>
                      <Button
                        asChild
                        className="btn-shine w-full font-bebas uppercase tracking-wider h-6 text-xs"
                      >
                        <Link to="/login">Login</Link>
                      </Button>
                    </DrawerClose>
                  </div>
                </div>
              </div>

              {/* Working Together Box */}
              <div className="px-4 pb-4">
                <div className="relative overflow-hidden rounded-lg h-24">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${workingTogether})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
                  <div className="relative h-full flex flex-col items-center justify-between p-4">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-white drop-shadow-lg text-center">
                      REALISE POTENTIAL
                    </h3>
                    <DrawerClose asChild>
                      <Button
                        onClick={() => setRepresentationOpen(true)}
                        className="btn-shine w-full font-bebas uppercase tracking-wider h-6 text-xs"
                      >
                        REQUEST REPRESENTATION
                      </Button>
                    </DrawerClose>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Logo - Center */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2">
            <img src={logo} alt="RISE Football Agency" className="h-8 md:h-10" />
          </Link>

          {/* Work With Us Button - Right */}
          <WorkWithUsDialog>
            <Button
              size="lg"
              className="btn-shine font-bebas uppercase tracking-wider text-base px-6"
            >
              Work With Us
            </Button>
          </WorkWithUsDialog>
        </div>
      </div>

      <RepresentationDialog 
        open={representationOpen} 
        onOpenChange={setRepresentationOpen} 
      />
    </header>
  );
};
