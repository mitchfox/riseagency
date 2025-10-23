import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { X } from "lucide-react";
import { TbMenu } from "react-icons/tb";
import workingTogether from "@/assets/menu-working-together.jpg";
import playerPortalImage from "@/assets/menu-player-portal.png";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export const Header = () => {
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
            <DrawerContent className="h-full w-[280px] left-0 flex flex-col rounded-r-none">
              <div className="flex justify-end p-4">
                <DrawerClose asChild>
                  <button
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
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
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-primary/10 rounded"
                  >
                    Home
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/players"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-primary/10 rounded"
                  >
                    Players
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/about"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-primary/10 rounded"
                  >
                    About
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/performance"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-primary/10 rounded"
                  >
                    Performance
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/contact"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-primary/10 rounded"
                  >
                    Contact
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/news"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-1.5 px-4 hover:bg-primary/10 rounded"
                  >
                    News
                  </Link>
                </DrawerClose>
              </nav>
              
              {/* Player Portal Box */}
              <div className="px-4 pb-3">
                <div className="relative overflow-hidden rounded-lg h-24">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${playerPortalImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/40 to-black/70" />
                  <div className="relative h-full flex flex-col items-start justify-between p-4">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-white drop-shadow-lg">
                      Player<br/>Portal
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
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/40 to-black/70" />
                  <div className="relative h-full flex flex-col items-start justify-between p-4">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-white drop-shadow-lg">
                      REALISE YOUR POTENTIAL
                    </h3>
                    <DrawerClose asChild>
                      <Button
                        asChild
                        className="btn-shine w-full font-bebas uppercase tracking-wider h-6 text-xs"
                      >
                        <Link to="/contact">REQUEST REPRESENTATION</Link>
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
          <Button
            asChild
            size="sm"
            className="btn-shine font-bebas uppercase tracking-wider"
          >
            <Link to="/contact">Work With Us</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
