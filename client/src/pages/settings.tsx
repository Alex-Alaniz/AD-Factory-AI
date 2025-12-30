import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Mail, Zap, Clock, TestTube, Video, CheckCircle, XCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Settings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: arcadsStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/arcads/status"],
  });

  const [formData, setFormData] = useState({
    adminEmail: "",
    dailyScriptCount: 8,
    autoGenerateEnabled: true,
    productFeatures: "",
    arcadsAvatarId: "",
    autoGenerateVideos: false,
    wav2lipApiUrl: "",
    wav2lipAvatarImageUrl: "",
    wav2lipEnabled: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        adminEmail: settings.adminEmail || "",
        dailyScriptCount: settings.dailyScriptCount || 8,
        autoGenerateEnabled: settings.autoGenerateEnabled ?? true,
        productFeatures: settings.productFeatures || "",
        arcadsAvatarId: settings.arcadsAvatarId || "",
        autoGenerateVideos: settings.autoGenerateVideos ?? false,
        wav2lipApiUrl: settings.wav2lipApiUrl || "",
        wav2lipAvatarImageUrl: settings.wav2lipAvatarImageUrl || "",
        wav2lipEnabled: settings.wav2lipEnabled ?? false,
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
                <Label>Script Count</Label>
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Arcads.ai Integration</CardTitle>
                  {arcadsStatus?.configured ? (
                    <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-400">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                <CardDescription>Generate AI UGC videos from scripts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="arcadsAvatarId">Avatar ID</Label>
              <Input
                id="arcadsAvatarId"
                value={formData.arcadsAvatarId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, arcadsAvatarId: e.target.value }))
                }
                placeholder="default"
                data-testid="input-arcads-avatar"
              />
              <p className="text-xs text-muted-foreground">
                The AI avatar to use for video generation (leave empty for default)
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Auto-Generate Videos</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically create videos for new scripts
                </p>
              </div>
              <Switch
                checked={formData.autoGenerateVideos}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, autoGenerateVideos: checked }))
                }
                disabled={!arcadsStatus?.configured}
                data-testid="switch-auto-videos"
              />
            </div>
            {!arcadsStatus?.configured && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                <p className="text-xs text-yellow-400">
                  To enable video generation, add your Arcads API key as a secret named ARCADS_API_KEY in your environment settings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Wav2Lip Integration</CardTitle>
                  {formData.wav2lipEnabled && formData.wav2lipApiUrl ? (
                    <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-400">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-muted-foreground/20 bg-muted/10 text-muted-foreground">
                      <XCircle className="mr-1 h-3 w-3" />
                      Disabled
                    </Badge>
                  )}
                </div>
                <CardDescription>Self-hosted lip-sync video generation (open-source)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="wav2lipApiUrl">Wav2Lip API URL</Label>
              <Input
                id="wav2lipApiUrl"
                value={formData.wav2lipApiUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, wav2lipApiUrl: e.target.value }))
                }
                placeholder="https://your-wav2lip-api.railway.app"
                data-testid="input-wav2lip-url"
              />
              <p className="text-xs text-muted-foreground">
                URL of your self-hosted Wav2Lip API (e.g., on Railway)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wav2lipAvatarImageUrl">Avatar Image URL</Label>
              <Input
                id="wav2lipAvatarImageUrl"
                value={formData.wav2lipAvatarImageUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, wav2lipAvatarImageUrl: e.target.value }))
                }
                placeholder="https://example.com/avatar.jpg"
                data-testid="input-wav2lip-avatar"
              />
              <p className="text-xs text-muted-foreground">
                URL to the avatar image for lip-sync video generation
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Enable Wav2Lip</Label>
                <p className="text-xs text-muted-foreground">
                  Show Wav2Lip video generation option on scripts
                </p>
              </div>
              <Switch
                checked={formData.wav2lipEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, wav2lipEnabled: checked }))
                }
                disabled={!formData.wav2lipApiUrl}
                data-testid="switch-wav2lip-enabled"
              />
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-400">
                Wav2Lip is open-source and free. Deploy on Railway with GPU support for best performance.
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
                  Features used for script generation
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
                className="min-h-[120px] resize-none"
                data-testid="textarea-features"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Include specific features and benefits for better script quality
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
