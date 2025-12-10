import { Copy, Check, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const handleCopy = async () => {
    const fullScript = `${script.hook}\n\n${script.body}\n\n${script.cta}`;
    await navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <CardFooter className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
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
      </CardFooter>
    </Card>
  );
}
