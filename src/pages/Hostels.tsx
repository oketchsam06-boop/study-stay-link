import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import HostelCard from "@/components/HostelCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
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
      // Fetch vacant room counts
      const { data: rooms } = await supabase
        .from("rooms")
        .select("hostel_id, is_vacant")
        .eq("is_vacant", true);

      const counts: Record<string, number> = {};
      rooms?.forEach((r: any) => {
        counts[r.hostel_id] = (counts[r.hostel_id] || 0) + 1;
      });
      setVacantCounts(counts);
    }
    setLoading(false);
  };

  const filteredHostels = hostels.filter((hostel) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      hostel.name.toLowerCase().includes(query) ||
      hostel.location.toLowerCase().includes(query)
    );
  });

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

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
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

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="distance">Nearest to Gate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[350px] rounded-lg" />
            ))}
          </div>
        ) : filteredHostels.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No hostels found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHostels.map((hostel) => (
              <HostelCard
                key={hostel.id}
                hostel={hostel}
                vacantRoomCount={vacantCounts[hostel.id] || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
