import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, LogOut, Home, LayoutDashboard, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export default function Navigation() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const navItems = user ? (
    <>
      <Link to="/hostels" onClick={() => setOpen(false)}>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Home className="mr-2 h-4 w-4" />
          Browse Hostels
        </Button>
      </Link>
      <Link to={role === "landlord" ? "/landlord/dashboard" : "/student/dashboard"} onClick={() => setOpen(false)}>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start">
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </>
  ) : (
    <>
      <Link to="/auth" onClick={() => setOpen(false)}>
        <Button variant="ghost" size="sm" className="w-full justify-start">Sign In</Button>
      </Link>
      <Link to="/auth?signup=true" onClick={() => setOpen(false)}>
        <Button variant="hero" size="sm" className="w-full">Get Started</Button>
      </Link>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            HostelLink
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          {navItems}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 pt-12">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col gap-2">
                {navItems}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
