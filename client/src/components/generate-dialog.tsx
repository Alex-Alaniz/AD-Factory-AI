import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Platform } from "@shared/schema";

interface GenerateDialogProps {
  defaultFeatures?: string;
  trigger?: React.ReactNode;
}

export function GenerateDialog({ defaultFeatures = "", trigger }: GenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState(defaultFeatures || 
    "instant payments, HONEY stablecoin currency, zero fees, $BEARCO memecoin integration"
  );
  const [count, setCount] = useState([8]);
  const [platforms, setPlatforms] = useState<Platform[]>(["twitter", "tiktok", "instagram"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/scripts/generate", {
        productFeatures: features,
        count: count[0],
        platforms,
      });
      return response as { scripts?: { length: number } };
    },
    onSuccess: (data) => {
      toast({
        title: "Scripts Generated",
        description: `Successfully generated ${data.scripts?.length || count[0]} new scripts!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate scripts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const togglePlatform = (platform: Platform) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="lg" data-testid="button-generate-scripts">
            <Sparkles className="h-4 w-4" />
            Generate Scripts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Generate UGC Scripts</DialogTitle>
          <DialogDescription>
            Configure the script generation settings for your Bearo fintech app
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="features">Product Features & Angles</Label>
            <Textarea
              id="features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="Enter product features, unique selling points, and marketing angles..."
              className="min-h-[120px] resize-none"
              data-testid="input-features"
            />
            <p className="text-xs text-muted-foreground">
              These features will be incorporated into the generated scripts
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label>Number of Scripts</Label>
              <span className="text-sm font-medium" data-testid="text-script-count">{count[0]}</span>
            </div>
            <Slider
              value={count}
              onValueChange={setCount}
              min={1}
              max={15}
              step={1}
              className="w-full"
              data-testid="slider-count"
            />
            <p className="text-xs text-muted-foreground">
              Generate between 1 and 15 scripts per batch
            </p>
          </div>
          <div className="space-y-3">
            <Label>Target Platforms</Label>
            <div className="flex flex-wrap gap-4">
              {(["twitter", "tiktok", "instagram"] as Platform[]).map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform}
                    checked={platforms.includes(platform)}
                    onCheckedChange={() => togglePlatform(platform)}
                    data-testid={`checkbox-${platform}`}
                  />
                  <label
                    htmlFor={platform}
                    className="text-sm font-medium capitalize leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {platform}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || platforms.length === 0}
            data-testid="button-confirm-generate"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate {count[0]} Scripts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
