import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Search, MoreHorizontal, Check, Clock, Archive as ArchiveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Script, ScriptStatus } from "@shared/schema";

const typeLabels: Record<string, string> = {
  "product-demo": "Product Demo",
  "founder-story": "Founder Story",
  "skeptic-to-believer": "Skeptic to Believer",
  "feature-highlight": "Feature Highlight",
};

const statusConfig: Record<ScriptStatus, { icon: typeof Check; className: string }> = {
  pending: { icon: Clock, className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  used: { icon: Check, className: "bg-green-500/10 text-green-400 border-green-500/20" },
  archived: { icon: ArchiveIcon, className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

export default function Tracking() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scripts, isLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ScriptStatus }) => {
      return apiRequest("PATCH", `/api/scripts/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Status Updated",
        description: "Script status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update script status.",
        variant: "destructive",
      });
    },
  });

  const handleExportCSV = async () => {
    try {
      const response = await fetch("/api/scripts/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scripts-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Export Complete",
        description: "Scripts have been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export scripts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredScripts = scripts?.filter(
    (script) =>
      search === "" ||
      script.hook.toLowerCase().includes(search.toLowerCase()) ||
      script.type.toLowerCase().includes(search.toLowerCase()) ||
      script.platform.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Tracking Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track script status and export history
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by hook, type, or platform..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-tracking"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead className="min-w-[200px]">Hook Preview</TableHead>
              <TableHead className="w-[140px]">Type</TableHead>
              <TableHead className="w-[100px]">Platform</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredScripts && filteredScripts.length > 0 ? (
              filteredScripts.map((script) => {
                const StatusIcon = statusConfig[script.status].icon;
                return (
                  <TableRow key={script.id} data-testid={`row-script-${script.id}`}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(script.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-sm" data-testid={`text-hook-preview-${script.id}`}>
                        {script.hook}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{typeLabels[script.type]}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{script.platform}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border ${statusConfig[script.status].className}`}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {script.status.charAt(0).toUpperCase() + script.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${script.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatusMutation.mutate({ id: script.id, status: "pending" })
                            }
                            data-testid={`action-pending-${script.id}`}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Mark Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatusMutation.mutate({ id: script.id, status: "used" })
                            }
                            data-testid={`action-used-${script.id}`}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Mark Used
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatusMutation.mutate({ id: script.id, status: "archived" })
                            }
                            data-testid={`action-archived-${script.id}`}
                          >
                            <ArchiveIcon className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <p className="text-sm text-muted-foreground">
                    {scripts?.length === 0
                      ? "No scripts generated yet"
                      : "No scripts match your search"}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredScripts && filteredScripts.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p data-testid="text-tracking-count">
            Showing {filteredScripts.length} of {scripts?.length} scripts
          </p>
        </div>
      )}
    </div>
  );
}
