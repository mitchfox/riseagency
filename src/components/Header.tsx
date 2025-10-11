import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { X } from "lucide-react";
import { TbMenu } from "react-icons/tb";
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
            <DrawerContent className="h-full w-[280px] left-0">
              <DrawerHeader className="flex flex-row items-center justify-between">
                <DrawerTitle className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  Menu
                </DrawerTitle>
                <DrawerClose asChild>
                  <button
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </DrawerClose>
              </DrawerHeader>
              <nav className="flex flex-col gap-2 px-4 py-6">
                <DrawerClose asChild>
                  <Link
                    to="/"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-3 px-4 hover:bg-primary/10 rounded"
                  >
                    Home
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/players"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-3 px-4 hover:bg-primary/10 rounded"
                  >
                    Players
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/about"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-3 px-4 hover:bg-primary/10 rounded"
                  >
                    About
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/contact"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-3 px-4 hover:bg-primary/10 rounded"
                  >
                    Contact
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/news"
                    className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider py-3 px-4 hover:bg-primary/10 rounded"
                  >
                    News
                  </Link>
                </DrawerClose>
              </nav>
            </DrawerContent>
          </Drawer>

          {/* Logo - Center */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2">
            <img src={logo} alt="RISE Football Agency" className="h-8 md:h-10" />
          </Link>

          {/* Right spacer */}
          <div className="w-12" />
        </div>
      </div>
    </header>
  );
};
