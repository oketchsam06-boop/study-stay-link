import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const hostelSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  plot_number: z.string().min(3, "Plot number is required"),
  location: z.string().min(5, "Location must be at least 5 characters"),
  rent_per_month: z.number().positive("Rent must be a positive number"),
  total_rooms: z.number().int().positive("Total rooms must be a positive number"),
  distance_from_gate: z.number().positive("Distance must be a positive number").optional(),
  description: z.string().optional(),
});

export default function AddHostel() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [plotVerified, setPlotVerified] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    plot_number: "",
    location: "",
    rent_per_month: "",
    total_rooms: "",
    distance_from_gate: "",
    description: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (profile?.role !== "landlord") {
      toast.error("Only landlords can add hostels");
      navigate("/");
    }
  }, [user, profile]);

  const verifyPlotNumber = async () => {
    if (!formData.plot_number.trim()) {
      toast.error("Please enter a plot number");
      return;
    }

    setVerifying(true);
    setPlotVerified(null);

    const { data, error } = await supabase
      .from("verified_plots")
      .select("*")
      .eq("plot_number", formData.plot_number.trim().toUpperCase())
      .maybeSingle();

    setVerifying(false);

    if (data && !error) {
      setPlotVerified(true);
      toast.success("Plot number verified successfully!");
    } else {
      setPlotVerified(false);
      toast.error("Plot number not found in County Lands records. Please verify and try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (plotVerified !== true) {
      toast.error("Please verify your plot number first");
      return;
    }

    setLoading(true);

    try {
      const validated = hostelSchema.parse({
        name: formData.name,
        plot_number: formData.plot_number.trim().toUpperCase(),
        location: formData.location,
        rent_per_month: parseFloat(formData.rent_per_month),
        total_rooms: parseInt(formData.total_rooms),
        distance_from_gate: formData.distance_from_gate
          ? parseFloat(formData.distance_from_gate)
          : undefined,
        description: formData.description || undefined,
      });

      const { error } = await supabase.from("hostels").insert([{
        landlord_id: user!.id,
        name: validated.name,
        plot_number: validated.plot_number,
        location: validated.location,
        rent_per_month: validated.rent_per_month,
        total_rooms: validated.total_rooms,
        distance_from_gate: validated.distance_from_gate,
        description: validated.description,
        is_verified: true,
      }]);

      if (error) throw error;

      toast.success("Hostel added successfully!");
      navigate("/landlord/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to add hostel. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/landlord/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-3xl font-bold mb-2">Add New Hostel</h1>
          <p className="text-muted-foreground mb-8">
            Fill in the details to list your hostel
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Hostel Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Sunshine Hostel"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plot_number">Plot Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="plot_number"
                  value={formData.plot_number}
                  onChange={(e) => {
                    setFormData({ ...formData, plot_number: e.target.value });
                    setPlotVerified(null);
                  }}
                  placeholder="e.g., LR209/4523"
                  required
                />
                <Button
                  type="button"
                  onClick={verifyPlotNumber}
                  disabled={verifying || !formData.plot_number}
                  variant="outline"
                >
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
              {plotVerified === true && (
                <p className="text-sm text-primary flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Plot verified with County Lands
                </p>
              )}
              {plotVerified === false && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Plot not found. Please check and try again.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="e.g., Westlands, Nairobi"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent">Rent per Month (KSh) *</Label>
                <Input
                  id="rent"
                  type="number"
                  value={formData.rent_per_month}
                  onChange={(e) =>
                    setFormData({ ...formData, rent_per_month: e.target.value })
                  }
                  placeholder="e.g., 8000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rooms">Total Rooms *</Label>
                <Input
                  id="rooms"
                  type="number"
                  value={formData.total_rooms}
                  onChange={(e) =>
                    setFormData({ ...formData, total_rooms: e.target.value })
                  }
                  placeholder="e.g., 20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance">Distance from Main Gate (km)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                value={formData.distance_from_gate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    distance_from_gate: e.target.value,
                  })
                }
                placeholder="e.g., 1.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your hostel, amenities, etc."
                rows={4}
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={loading || plotVerified !== true}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Hostel
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
