import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, ImageIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditRoom() {
  const { hostelId, roomId } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [hostelName, setHostelName] = useState("");
  const [roomImages, setRoomImages] = useState<File[]>([]);
  const [roomImagePreviews, setRoomImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    room_number: "",
    price_per_month: "",
    deposit_amount: "",
    pricing_period: "per_month",
    description: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "landlord") {
      toast.error("Only landlords can edit rooms");
      navigate("/");
      return;
    }
    if (hostelId && roomId) {
      fetchData();
    }
  }, [user, role, hostelId, roomId]);

  const fetchData = async () => {
    const [hostelRes, roomRes] = await Promise.all([
      supabase.from("hostels").select("name, landlord_id").eq("id", hostelId).maybeSingle(),
      supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
    ]);

    if (!hostelRes.data || hostelRes.data.landlord_id !== user?.id) {
      toast.error("Access denied");
      navigate("/landlord/dashboard");
      return;
    }

    if (!roomRes.data || roomRes.data.hostel_id !== hostelId) {
      toast.error("Room not found");
      navigate(`/hostels/${hostelId}`);
      return;
    }

    setHostelName(hostelRes.data.name);
    setFormData({
      room_number: roomRes.data.room_number,
      price_per_month: String(roomRes.data.price_per_month),
      deposit_amount: String(roomRes.data.deposit_amount || 0),
      pricing_period: roomRes.data.pricing_period || "per_month",
      description: roomRes.data.description || "",
    });
    setExistingImages(roomRes.data.images || []);
    setPageLoading(false);
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }
    setRoomImages(files);
    setRoomImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.room_number || !formData.price_per_month) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      let imageUrls = existingImages;

      // Upload new images if selected
      if (roomImages.length > 0) {
        imageUrls = [];
        for (const img of roomImages) {
          const path = `${user!.id}/rooms/${hostelId}/${Date.now()}-${img.name}`;
          const { data, error } = await supabase.storage
            .from("hostel-images")
            .upload(path, img, { upsert: true });
          if (error) throw error;
          const { data: urlData } = supabase.storage
            .from("hostel-images")
            .getPublicUrl(data.path);
          imageUrls.push(urlData.publicUrl);
        }
      }

      const { error } = await supabase
        .from("rooms")
        .update({
          room_number: formData.room_number,
          price_per_month: parseFloat(formData.price_per_month),
          deposit_amount: parseFloat(formData.deposit_amount),
          pricing_period: formData.pricing_period,
          description: formData.description || null,
          images: imageUrls,
        })
        .eq("id", roomId);

      if (error) throw error;

      toast.success("Room updated successfully!");
      navigate(`/hostels/${hostelId}`);
    } catch (error) {
      toast.error("Failed to update room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container px-4 py-8 max-w-2xl">
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/hostels/${hostelId}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hostel
        </Button>

        <Card className="p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-3xl font-bold mb-1">Edit Room</h1>
          <p className="text-muted-foreground mb-8">
            Update room in <span className="font-medium text-foreground">{hostelName}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="room_number">Room Number / Name *</Label>
              <Input
                id="room_number"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g., Room 101 or Block A-3"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Pricing Period *</Label>
              <RadioGroup
                value={formData.pricing_period}
                onValueChange={(v) => setFormData({ ...formData, pricing_period: v })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per_month" id="edit_per_month" />
                  <Label htmlFor="edit_per_month" className="font-normal cursor-pointer">Per Month</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per_semester" id="edit_per_semester" />
                  <Label htmlFor="edit_per_semester" className="font-normal cursor-pointer">Per Semester</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                Rent {formData.pricing_period === "per_month" ? "(KSh / Month)" : "(KSh / Semester)"} *
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price_per_month}
                onChange={(e) => setFormData({ ...formData, price_per_month: e.target.value })}
                placeholder="e.g., 8000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit Amount (KSh) *</Label>
              <Input
                id="deposit"
                type="number"
                value={formData.deposit_amount}
                onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                placeholder="e.g., 5000"
                required
              />
              <p className="text-xs text-muted-foreground">
                This is the amount students will pay upfront to secure the room.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Room Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the room (size, amenities, features...)"
                rows={3}
              />
            </div>

            {/* Room Images */}
            <div className="space-y-2">
              <Label>Room Images (up to 4)</Label>
              {existingImages.length > 0 && roomImages.length === 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {existingImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Current ${i + 1}`}
                      className="h-24 w-full rounded-lg object-cover border border-border"
                    />
                  ))}
                </div>
              )}
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("room-images-input")?.click()}
              >
                {roomImagePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {roomImagePreviews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`New preview ${i + 1}`}
                        className="h-24 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to replace images
                    </p>
                  </div>
                )}
              </div>
              <input
                id="room-images-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImagesChange}
              />
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
