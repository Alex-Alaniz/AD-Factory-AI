import { Copy, Check, Clock, FileText, Video, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Script, ScriptType, Platform } from "@shared/schema";

interface ScriptCardProps {
  script: Script;
  onStatusChange?: (id: string, status: Script["status"]) => void;
}

const typeLabels: Record<ScriptType, string> = {
  "product-demo": "Product Demo",
  "founder-story": "Founder Story",
  "skeptic-to-believer": "Skeptic to Believer",
  "feature-highlight": "Feature Highlight",
};

const platformColors: Record<Platform, string> = {
  twitter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  tiktok: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  instagram: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function ScriptCard({ script, onStatusChange }: ScriptCardProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: arcadsStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/arcads/status"],
  });

  const { data: wav2lipStatus } = useQuery<{ configured: boolean; enabled: boolean }>({
    queryKey: ["/api/wav2lip/status"],
  });

  const generateArcadsVideo = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/scripts/${script.id}/generate-video`);
    },
    onSuccess: () => {
      toast({ title: "Video generation started (Arcads)" });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate video", description: error.message, variant: "destructive" });
    },
  });

  const generateWav2LipVideo = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/wav2lip/generate-video", { scriptId: script.id });
    },
    onSuccess: () => {
      toast({ title: "Video generation started (Wav2Lip)" });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate video", description: error.message, variant: "destructive" });
    },
  });

  const handleCopy = async () => {
    const fullScript = `${script.hook}\n\n${script.body}\n\n${script.cta}`;
    await navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVideoProcessing = script.videoStatus === "pending" || script.videoStatus === "generating";
  const hasVideo = script.videoStatus === "complete" && script.videoUrl;
  const videoFailed = script.videoStatus === "failed";

  const fullText = `${script.hook} ${script.body} ${script.cta}`;

  return (
    <Card className="flex flex-col" data-testid={`card-script-${script.id}`}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {typeLabels[script.type]}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs border ${platformColors[script.platform]}`}
          >
            {script.platform.charAt(0).toUpperCase() + script.platform.slice(1)}
          </Badge>
        </div>
        <Badge
          variant={
            script.status === "used"
              ? "default"
              : script.status === "archived"
              ? "secondary"
              : "outline"
          }
          className="text-xs"
        >
          {script.status.charAt(0).toUpperCase() + script.status.slice(1)}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Hook</p>
          <p className="text-base font-semibold leading-relaxed" data-testid={`text-hook-${script.id}`}>
            {script.hook}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
          <p className="text-sm leading-relaxed text-muted-foreground" data-testid={`text-body-${script.id}`}>
            {script.body}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">CTA</p>
          <p className="text-sm font-medium" data-testid={`text-cta-${script.id}`}>
            {script.cta}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{script.metadata.estimatedDuration}s</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{script.metadata.characterCount} chars</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            data-testid={`button-copy-${script.id}`}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full">
          {hasVideo ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              data-testid={`button-view-video-${script.id}`}
            >
              <a href={script.videoUrl!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                View Video
              </a>
            </Button>
          ) : isVideoProcessing ? (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              {script.videoStatus === "pending" ? "Queued" : "Generating"}
            </Badge>
          ) : videoFailed ? (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
          ) : null}
          
          {!hasVideo && !isVideoProcessing && (
            <>
              {wav2lipStatus?.configured && wav2lipStatus?.enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateWav2LipVideo.mutate()}
                  disabled={generateWav2LipVideo.isPending}
                  data-testid={`button-generate-wav2lip-${script.id}`}
                >
                  {generateWav2LipVideo.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Video className="h-3 w-3" />
                  )}
                  Wav2Lip
                </Button>
              )}
              {arcadsStatus?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateArcadsVideo.mutate()}
                  disabled={generateArcadsVideo.isPending}
                  data-testid={`button-generate-arcads-${script.id}`}
                >
                  {generateArcadsVideo.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Video className="h-3 w-3" />
                  )}
                  Arcads
                </Button>
              )}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
