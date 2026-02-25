import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImageLightbox({ images, initialIndex = 0, open, onOpenChange }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const handleNext = () => setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  const handleDownload = async () => {
    try {
      const response = await fetch(images[currentIndex]);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(images[currentIndex], "_blank");
    }
  };

  if (!images.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 bg-background/95 backdrop-blur border-border">
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>
        <div className="relative flex flex-col items-center">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDownload} className="bg-background/80">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative w-full flex items-center justify-center min-h-[300px] max-h-[80vh]">
            {images.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="absolute left-2 z-10 bg-background/80">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <img
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {images.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleNext} className="absolute right-2 z-10 bg-background/80">
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>

          {images.length > 1 && (
            <p className="text-sm text-muted-foreground py-2">
              {currentIndex + 1} / {images.length}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
