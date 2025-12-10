import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Sparkles } from "lucide-react";
import { ScriptCard } from "@/components/script-card";
import { GenerateDialog } from "@/components/generate-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Script, Platform, ScriptType, ScriptStatus } from "@shared/schema";

export default function Scripts() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: scripts, isLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts"],
  });

  const filteredScripts = scripts?.filter((script) => {
    const matchesSearch =
      search === "" ||
      script.hook.toLowerCase().includes(search.toLowerCase()) ||
      script.body.toLowerCase().includes(search.toLowerCase()) ||
      script.cta.toLowerCase().includes(search.toLowerCase());

    const matchesPlatform =
      platformFilter === "all" || script.platform === platformFilter;
    const matchesType = typeFilter === "all" || script.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || script.status === statusFilter;

    return matchesSearch && matchesPlatform && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Scripts Library</h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage all generated scripts
          </p>
        </div>
        <GenerateDialog />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search scripts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-platform">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="product-demo">Product Demo</SelectItem>
              <SelectItem value="founder-story">Founder Story</SelectItem>
              <SelectItem value="skeptic-to-believer">Skeptic to Believer</SelectItem>
              <SelectItem value="feature-highlight">Feature Highlight</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredScripts && filteredScripts.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground" data-testid="text-result-count">
            Showing {filteredScripts.length} of {scripts?.length} scripts
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No scripts found</h3>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            {scripts?.length === 0
              ? "Generate your first batch of scripts to get started"
              : "Try adjusting your filters or search terms"}
          </p>
          {scripts?.length === 0 && <GenerateDialog />}
        </div>
      )}
    </div>
  );
}
