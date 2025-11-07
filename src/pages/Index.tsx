import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Shield, Zap, Clock } from "lucide-react";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import heroImage from "@/assets/hero-hostel.jpg";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        
        <div className="container relative px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Find Your Perfect{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Student Hostel
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover verified, affordable hostels near your university. Book with confidence, pay securely.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by location or hostel name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Link to={`/hostels${searchQuery ? `?search=${searchQuery}` : ""}`}>
                <Button variant="hero" size="lg" className="w-full sm:w-auto h-12">
                  Search Hostels
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-6 rounded-lg bg-gradient-to-b from-card to-muted/20 shadow-[var(--shadow-card)]">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-xl">Verified Listings</h3>
            <p className="text-muted-foreground">
              All hostels verified against County Lands records. No fake listings.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-gradient-to-b from-card to-muted/20 shadow-[var(--shadow-card)]">
            <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
              <Zap className="h-7 w-7 text-secondary" />
            </div>
            <h3 className="font-semibold text-xl">Quick Booking</h3>
            <p className="text-muted-foreground">
              Book in seconds with KSh 50 via Mpesa. Instant confirmation.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-gradient-to-b from-card to-muted/20 shadow-[var(--shadow-card)]">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-xl">Near Campus</h3>
            <p className="text-muted-foreground">
              Find hostels by distance from your university's main gate.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-20">
        <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 md:p-12 text-center text-primary-foreground shadow-[var(--shadow-elegant)]">
          <Clock className="h-12 w-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Your Search Today
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join hundreds of students who've found their perfect hostel through HostelLink.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?signup=true">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Sign Up as Student
              </Button>
            </Link>
            <Link to="/auth?signup=true&role=landlord">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                List Your Hostel
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 HostelLink. Connecting students with verified hostels.</p>
        </div>
      </footer>
    </div>
  );
}
