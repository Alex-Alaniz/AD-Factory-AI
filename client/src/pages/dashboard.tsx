import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, CheckCircle, Archive, Calendar, Sparkles } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { ScriptCard } from "@/components/script-card";
import { GenerateDialog } from "@/components/generate-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Script, DashboardStats } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentScripts, isLoading: scriptsLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts/recent"],
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your UGC script generation
          </p>
        </div>
        <GenerateDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Scripts"
          value={stats?.totalScripts ?? 0}
          icon={FileText}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Pending"
          value={stats?.pendingScripts ?? 0}
          icon={Clock}
          description="Ready to use"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Used"
          value={stats?.usedScripts ?? 0}
          icon={CheckCircle}
          description="Already published"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Today"
          value={stats?.scriptsToday ?? 0}
          icon={Calendar}
          description="Generated today"
          isLoading={statsLoading}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold" data-testid="text-recent-scripts">Recent Scripts</h2>
          {stats?.lastGeneration && (
            <p className="text-xs text-muted-foreground">
              Last generated: {new Date(stats.lastGeneration).toLocaleString()}
            </p>
          )}
        </div>

        {scriptsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
        ) : recentScripts && recentScripts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentScripts.slice(0, 6).map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No scripts yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Generate your first batch of UGC scripts to start creating content for Bearo
            </p>
            <GenerateDialog />
          </div>
        )}
      </div>
    </div>
  );
}
