import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DoorOpen } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Hostel = Database["public"]["Tables"]["hostels"]["Row"];

interface HostelCardProps {
  hostel: Hostel;
  vacantRoomCount?: number;
}

export default function HostelCard({ hostel, vacantRoomCount = 0 }: HostelCardProps) {
  return (
    <Link to={`/hostels/${hostel.id}`}>
      <Card className="group overflow-hidden border-border bg-gradient-to-b from-card to-muted/20 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-[var(--transition-smooth)] cursor-pointer">
        <div className="aspect-video overflow-hidden bg-muted">
          {hostel.images && hostel.images.length > 0 ? (
            <img
              src={hostel.images[0]}
              alt={hostel.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <DoorOpen className="h-16 w-16 text-primary/40" />
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-1">{hostel.name}</h3>
            <Badge className={`shrink-0 ${vacantRoomCount > 0 ? "bg-primary" : "bg-destructive"}`}>
              {vacantRoomCount > 0 ? `${vacantRoomCount} Vacant` : "Fully Booked"}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{hostel.location}</span>
          </div>

          {hostel.distance_from_gate && (
            <p className="text-sm text-muted-foreground">
              {hostel.distance_from_gate}km from main gate
            </p>
          )}

          <div className="pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">
              View rooms →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
