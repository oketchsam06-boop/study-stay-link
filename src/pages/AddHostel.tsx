import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, Upload, ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const hostelSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  location: z.string().min(5, "Location must be at least 5 characters"),
  distance_from_gate: z.number().positive("Distance must be a positive number").optional(),
  description: z.string().optional(),
});

export default function AddHostel() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [titleDeedPreview, setTitleDeedPreview] = useState<string | null>(null);
  const [titleDeedFile, setTitleDeedFile] = useState<File | null>(null);
  const [hostelImages, setHostelImages] = useState<File[]>([]);
  const [hostelImagePreviews, setHostelImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    distance_from_gate: "",
    description: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "landlord") {
      toast.error("Only landlords can add hostels");
      navigate("/");
    }
  }, [user, role]);

  const handleTitleDeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be less than 5MB");
      return;
    }
    setTitleDeedFile(file);
    setTitleDeedPreview(URL.createObjectURL(file));
  };

  const handleHostelImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }
    setHostelImages(files);
    setHostelImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("hostel-images")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("hostel-images")
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titleDeedFile) {
      toast.error("Please upload your title deed image");
      return;
    }

    setLoading(true);

    try {
      const validated = hostelSchema.parse({
        name: formData.name,
        location: formData.location,
        distance_from_gate: formData.distance_from_gate
          ? parseFloat(formData.distance_from_gate)
          : undefined,
        description: formData.description || undefined,
      });

      setUploading(true);

      // Upload title deed
      const titleDeedUrl = await uploadFile(
        titleDeedFile,
        `${user!.id}/title-deeds/${Date.now()}-${titleDeedFile.name}`
      );

      // Upload hostel images
      const imageUrls: string[] = [];
      for (const img of hostelImages) {
        const url = await uploadFile(
          img,
          `${user!.id}/hostels/${Date.now()}-${img.name}`
        );
        imageUrls.push(url);
      }

      setUploading(false);

      const { error } = await supabase.from("hostels").insert([
        {
          landlord_id: user!.id,
          name: validated.name,
          location: validated.location,
          distance_from_gate: validated.distance_from_gate,
          description: validated.description,
          title_deed_image: titleDeedUrl,
          images: imageUrls,
          plot_number: "N/A",
          rent_per_month: 0,
          total_rooms: 0,
        },
      ]);

      if (error) throw error;

      toast.success("Hostel added! Now add rooms to your hostel.");
      navigate("/landlord/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to add hostel. Please try again.");
      }
    } finally {
      setLoading(false);
      setUploading(false);
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
            Upload your title deed and hostel details to get started
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

            {/* Title Deed Upload */}
            <div className="space-y-2">
              <Label>Title Deed Image *</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() =>
                  document.getElementById("title-deed-input")?.click()
                }
              >
                {titleDeedPreview ? (
                  <img
                    src={titleDeedPreview}
                    alt="Title deed preview"
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload your title deed image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                )}
              </div>
              <input
                id="title-deed-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTitleDeedChange}
              />
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

            {/* Hostel Images */}
            <div className="space-y-2">
              <Label>Hostel Images (up to 4)</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() =>
                  document.getElementById("hostel-images-input")?.click()
                }
              >
                {hostelImagePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {hostelImagePreviews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Hostel preview ${i + 1}`}
                        className="h-24 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload hostel photos
                    </p>
                  </div>
                )}
              </div>
              <input
                id="hostel-images-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleHostelImagesChange}
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={loading || !titleDeedFile}
            >
              {(loading || uploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {uploading ? "Uploading..." : "Add Hostel"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
