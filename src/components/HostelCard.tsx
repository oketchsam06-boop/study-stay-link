import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DoorOpen, DoorClosed } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Hostel = Database["public"]["Tables"]["hostels"]["Row"];

interface HostelCardProps {
  hostel: Hostel;
}

export default function HostelCard({ hostel }: HostelCardProps) {
  const availableRooms = hostel.total_rooms - hostel.occupied_rooms;
  const isFull = availableRooms === 0;

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
            {isFull ? (
              <Badge variant="destructive" className="shrink-0">
                <DoorClosed className="mr-1 h-3 w-3" />
                Full
              </Badge>
            ) : (
              <Badge className="shrink-0 bg-primary">
                {availableRooms} Available
              </Badge>
            )}
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

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-2xl font-bold text-primary">
              KSh {hostel.rent_per_month.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
