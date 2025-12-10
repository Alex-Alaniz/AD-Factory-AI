import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Mail, Zap, Clock, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Settings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const [formData, setFormData] = useState({
    adminEmail: "",
    dailyScriptCount: 8,
    autoGenerateEnabled: true,
    productFeatures: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        adminEmail: settings.adminEmail || "",
        dailyScriptCount: settings.dailyScriptCount || 8,
        autoGenerateEnabled: settings.autoGenerateEnabled ?? true,
        productFeatures: settings.productFeatures || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test-email", {});
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "A test email has been sent to your admin email address.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send test email. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your script generation preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Email Notifications</CardTitle>
                <CardDescription>Configure daily summary emails</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email Address</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, adminEmail: e.target.value }))
                }
                placeholder="admin@example.com"
                data-testid="input-admin-email"
              />
              <p className="text-xs text-muted-foreground">
                Summary emails will be sent to this address every 3 hours
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => testEmailMutation.mutate()}
              disabled={testEmailMutation.isPending || !formData.adminEmail}
              data-testid="button-test-email"
            >
              {testEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Auto Generation</CardTitle>
                <CardDescription>Automatic script generation every 3 hours</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Enable Auto Generation</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically generate scripts every 3 hours
                </p>
              </div>
              <Switch
                checked={formData.autoGenerateEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, autoGenerateEnabled: checked }))
                }
                data-testid="switch-auto-generate"
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label>Daily Script Count</Label>
                <span className="text-sm font-medium" data-testid="text-daily-count">{formData.dailyScriptCount}</span>
              </div>
              <Slider
                value={[formData.dailyScriptCount]}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, dailyScriptCount: value[0] }))
                }
                min={1}
                max={15}
                step={1}
                disabled={!formData.autoGenerateEnabled}
                data-testid="slider-daily-count"
              />
              <p className="text-xs text-muted-foreground">
                Number of scripts to generate every 3 hours (1-15)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Default Product Features</CardTitle>
                <CardDescription>
                  These features will be used as defaults for script generation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productFeatures">Product Features & Angles</Label>
              <Textarea
                id="productFeatures"
                value={formData.productFeatures}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, productFeatures: e.target.value }))
                }
                placeholder="Enter your product's key features, unique selling points, and marketing angles..."
                className="min-h-[160px] resize-none"
                data-testid="textarea-features"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Include specific features, benefits, and target audience pain points for better script quality
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
