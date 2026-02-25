import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import HostelCard from "@/components/HostelCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

type Hostel = Database["public"]["Tables"]["hostels"]["Row"];

export default function Hostels() {
  const [searchParams] = useSearchParams();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [vacantCounts, setVacantCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("all");

  useEffect(() => {
    fetchHostels();
  }, [sortBy]);

  const fetchHostels = async () => {
    setLoading(true);
    let query = supabase.from("hostels").select("*");

    if (sortBy === "distance") {
      query = query.order("distance_from_gate", { ascending: true, nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (data && !error) {
      setHostels(data);

      // Extract unique locations
      const uniqueLocations = [...new Set(data.map((h) => h.location))].sort();
      setLocations(uniqueLocations);

      // Determine max price from rooms
      const { data: allRooms } = await supabase.from("rooms").select("hostel_id, is_vacant, price_per_month");

      if (allRooms && allRooms.length > 0) {
        const highest = Math.max(...allRooms.map((r: any) => r.price_per_month));
        setMaxPrice(highest);
        setPriceRange([0, highest]);
      }

      // Fetch vacant room counts
      const counts: Record<string, number> = {};
      allRooms?.forEach((r: any) => {
        if (r.is_vacant) {
          counts[r.hostel_id] = (counts[r.hostel_id] || 0) + 1;
        }
      });
      setVacantCounts(counts);
    }
    setLoading(false);
  };

  const filteredHostels = hostels.filter((hostel) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!hostel.name.toLowerCase().includes(query) && !hostel.location.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Location filter
    if (selectedLocation !== "all" && hostel.location !== selectedLocation) {
      return false;
    }

    // Price range filter (uses hostel rent_per_month)
    if (hostel.rent_per_month < priceRange[0] || hostel.rent_per_month > priceRange[1]) {
      return false;
    }

    // Vacancy filter
    if (showVacantOnly && (vacantCounts[hostel.id] || 0) === 0) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSelectedLocation("all");
    setPriceRange([0, maxPrice]);
    setShowVacantOnly(false);
    setSearchQuery("");
  };

  const hasActiveFilters = selectedLocation !== "all" || priceRange[0] > 0 || priceRange[1] < maxPrice || showVacantOnly;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Hostels</h1>
          <p className="text-muted-foreground">
            Find the perfect accommodation near your university
          </p>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs font-bold">
                  !
                </span>
              )}
            </Button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="distance">Nearest to Gate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 rounded-lg border border-border bg-card space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" /> Clear all
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Location */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Price: KSh {priceRange[0].toLocaleString()} – {priceRange[1].toLocaleString()}
                </Label>
                <Slider
                  min={0}
                  max={maxPrice}
                  step={500}
                  value={priceRange}
                  onValueChange={(val) => setPriceRange(val as [number, number])}
                  className="mt-2"
                />
              </div>

              {/* Vacancy */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Availability</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    id="vacantOnly"
                    checked={showVacantOnly}
                    onCheckedChange={(checked) => setShowVacantOnly(checked === true)}
                  />
                  <Label htmlFor="vacantOnly" className="text-sm cursor-pointer">
                    Show only hostels with vacant rooms
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[350px] rounded-lg" />
            ))}
          </div>
        ) : filteredHostels.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No hostels found matching your criteria.</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">Clear filters</Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filteredHostels.length} hostel{filteredHostels.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHostels.map((hostel) => (
                <HostelCard
                  key={hostel.id}
                  hostel={hostel}
                  vacantRoomCount={vacantCounts[hostel.id] || 0}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
