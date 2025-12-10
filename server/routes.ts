import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateScripts } from "./openai";
import { sendDailySummaryEmail, sendTestEmail } from "./resend";
import { startCronJobs } from "./cron";
import { createArcadsService } from "./arcads";
import { createWav2LipService, getOpenAIClient } from "./wav2lip";
import type { Platform, GenerationRequest, Script } from "@shared/schema";
import { insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

// Helper function to trigger video generation for scripts
async function triggerVideoGeneration(scripts: Script[]): Promise<void> {
  const settings = await storage.getSettings();
  const apiKey = process.env.ARCADS_API_KEY;
  
  if (!apiKey || !settings.autoGenerateVideos) {
    return;
  }
  
  const arcads = createArcadsService(apiKey, settings.arcadsAvatarId || "default");
  if (!arcads) return;
  
  for (const script of scripts) {
    // Skip if video already being processed
    if (script.videoStatus !== "none" && script.videoStatus !== undefined) {
      continue;
    }
    
    try {
      // Mark as pending
      await storage.updateScriptVideo(script.id, "pending", null, null);
      
      // Start generation (non-blocking)
      arcads.generateVideo(script)
        .then(async (response) => {
          await storage.updateScriptVideo(script.id, "generating", null, response.jobId);
          
          // Poll for completion in background
          arcads.pollVideoCompletion(response.jobId)
            .then(async (result) => {
              await storage.updateScriptVideo(script.id, "complete", result.videoUrl || null, result.jobId);
              console.log(`Video complete for script ${script.id}: ${result.videoUrl}`);
            })
            .catch(async (err) => {
              console.error(`Video generation failed for script ${script.id}:`, err);
              await storage.updateScriptVideo(script.id, "failed", null, response.jobId);
            });
        })
        .catch(async (err) => {
          console.error(`Failed to start video generation for script ${script.id}:`, err);
          await storage.updateScriptVideo(script.id, "failed", null, null);
        });
    } catch (error) {
      console.error(`Error triggering video for script ${script.id}:`, error);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Start cron jobs for scheduled generation
  startCronJobs();
  
  // Get all scripts
  app.get("/api/scripts", async (req, res) => {
    try {
      const scripts = await storage.getAllScripts();
      res.json(scripts);
    } catch (error) {
      console.error("Error fetching scripts:", error);
      res.status(500).json({ error: "Failed to fetch scripts" });
    }
  });
  
  // Get recent scripts
  app.get("/api/scripts/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const scripts = await storage.getRecentScripts(limit);
      res.json(scripts);
    } catch (error) {
      console.error("Error fetching recent scripts:", error);
      res.status(500).json({ error: "Failed to fetch recent scripts" });
    }
  });
  
  // Generate new scripts
  app.post("/api/scripts/generate", async (req, res) => {
    try {
      const { productFeatures, count, platforms } = req.body as GenerationRequest;
      
      if (!productFeatures || !count || !platforms || platforms.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const insertScripts = await generateScripts(productFeatures, count, platforms);
      const scripts = await storage.createManyScripts(insertScripts);
      
      // Trigger video generation if enabled
      triggerVideoGeneration(scripts).catch(console.error);
      
      res.json({
        success: true,
        scripts,
        batchId: scripts[0]?.generatedBatch || "",
        message: `Generated ${scripts.length} scripts successfully`,
      });
    } catch (error) {
      console.error("Error generating scripts:", error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate scripts" 
      });
    }
  });
  
  // Generate video for a specific script
  app.post("/api/scripts/:id/generate-video", async (req, res) => {
    try {
      const { id } = req.params;
      const script = await storage.getScriptById(id);
      
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      
      const apiKey = process.env.ARCADS_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Arcads API key not configured" });
      }
      
      const settings = await storage.getSettings();
      const arcads = createArcadsService(apiKey, settings.arcadsAvatarId || "default");
      
      if (!arcads) {
        return res.status(500).json({ error: "Failed to initialize Arcads service" });
      }
      
      // Start generation
      await storage.updateScriptVideo(id, "pending", null, null);
      
      const response = await arcads.generateVideo(script);
      await storage.updateScriptVideo(id, "generating", null, response.jobId);
      
      res.json({
        success: true,
        message: "Video generation started",
        jobId: response.jobId,
      });
      
      // Poll in background
      arcads.pollVideoCompletion(response.jobId)
        .then(async (result) => {
          await storage.updateScriptVideo(id, "complete", result.videoUrl || null, result.jobId);
        })
        .catch(async (err) => {
          console.error(`Video generation failed:`, err);
          await storage.updateScriptVideo(id, "failed", null, response.jobId);
        });
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Failed to generate video" });
    }
  });
  
  // Check Arcads API key status
  app.get("/api/arcads/status", async (req, res) => {
    const apiKey = process.env.ARCADS_API_KEY;
    res.json({
      configured: !!apiKey,
    });
  });
  
  // Generate video using Wav2Lip (self-hosted)
  app.post("/api/wav2lip/generate-video", async (req, res) => {
    try {
      const { scriptId, avatarImageUrl } = req.body;
      
      if (!scriptId) {
        return res.status(400).json({ error: "Script ID is required" });
      }
      
      const script = await storage.getScriptById(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      
      // Check if video already being processed
      if (script.videoStatus === "pending" || script.videoStatus === "generating") {
        return res.status(400).json({ error: "Video is already being processed" });
      }
      
      const settings = await storage.getSettings();
      
      if (!settings.wav2lipApiUrl) {
        return res.status(400).json({ error: "Wav2Lip API URL not configured in settings" });
      }
      
      const imageUrl = avatarImageUrl || settings.wav2lipAvatarImageUrl;
      if (!imageUrl) {
        return res.status(400).json({ error: "Avatar image URL is required" });
      }
      
      const openaiClient = getOpenAIClient();
      const wav2lip = createWav2LipService(settings.wav2lipApiUrl, openaiClient || undefined);
      
      if (!wav2lip) {
        return res.status(500).json({ error: "Failed to initialize Wav2Lip service" });
      }
      
      // Mark as pending
      await storage.updateScriptVideo(scriptId, "pending", null, null);
      
      // Start generation
      wav2lip.generateVideo(script, imageUrl)
        .then(async (response) => {
          await storage.updateScriptVideo(scriptId, "generating", null, response.jobId);
          console.log(`Wav2Lip video generation started for script ${scriptId}, job: ${response.jobId}`);
          
          // Poll for completion in background
          wav2lip.pollVideoCompletion(response.jobId)
            .then(async (result) => {
              await storage.updateScriptVideo(scriptId, "complete", result.videoUrl || null, result.jobId);
              console.log(`Wav2Lip video complete for script ${scriptId}: ${result.videoUrl}`);
            })
            .catch(async (err) => {
              console.error(`Wav2Lip video generation failed for script ${scriptId}:`, err);
              await storage.updateScriptVideo(scriptId, "failed", null, response.jobId);
            });
        })
        .catch(async (err) => {
          console.error(`Failed to start Wav2Lip video generation for script ${scriptId}:`, err);
          await storage.updateScriptVideo(scriptId, "failed", null, null);
        });
      
      res.json({
        success: true,
        message: "Wav2Lip video generation started",
        scriptId,
      });
    } catch (error) {
      console.error("Error generating Wav2Lip video:", error);
      res.status(500).json({ error: "Failed to generate video" });
    }
  });
  
  // Check Wav2Lip status
  app.get("/api/wav2lip/status", async (req, res) => {
    const settings = await storage.getSettings();
    res.json({
      configured: !!settings.wav2lipApiUrl,
      apiUrl: settings.wav2lipApiUrl || null,
      avatarImageUrl: settings.wav2lipAvatarImageUrl || null,
      enabled: settings.wav2lipEnabled,
    });
  });
  
  // Update script status
  app.patch("/api/scripts/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !["pending", "used", "archived"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const script = await storage.updateScriptStatus(id, status);
      
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      
      res.json(script);
    } catch (error) {
      console.error("Error updating script status:", error);
      res.status(500).json({ error: "Failed to update script status" });
    }
  });
  
  // Export scripts to CSV
  app.get("/api/scripts/export", async (req, res) => {
    try {
      const csv = await storage.exportScriptsToCSV();
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=scripts-export-${new Date().toISOString().split("T")[0]}.csv`
      );
      res.send(csv);
    } catch (error) {
      console.error("Error exporting scripts:", error);
      res.status(500).json({ error: "Failed to export scripts" });
    }
  });
  
  // Get dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  
  // Get settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });
  
  // Update settings
  app.put("/api/settings", async (req, res) => {
    try {
      // Use partial validation - all fields are optional for updates
      const partialSettingsSchema = insertSettingsSchema.partial();
      const validatedData = partialSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  
  // Send test email
  app.post("/api/test-email", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      
      if (!settings.adminEmail) {
        return res.status(400).json({ error: "Admin email not configured" });
      }
      
      const success = await sendTestEmail(settings.adminEmail);
      
      if (success) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });
  
  // Manual trigger for daily generation (for testing)
  app.post("/api/trigger-daily-generation", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const platforms: Platform[] = ["twitter", "tiktok", "instagram"];
      
      const productFeatures = settings.productFeatures || 
        "instant payments, HONEY stablecoin currency, zero fees, $BEARCO memecoin integration";
      
      const insertScripts = await generateScripts(
        productFeatures,
        settings.dailyScriptCount,
        platforms
      );
      
      const scripts = await storage.createManyScripts(insertScripts);
      
      // Send email if configured
      if (settings.adminEmail) {
        const topHooks = scripts.slice(0, 3).map((s) => s.hook);
        
        await sendDailySummaryEmail(settings.adminEmail, {
          scriptsGenerated: scripts.length,
          topHooks,
          dashboardUrl: process.env.REPLIT_DEPLOYMENT_URL || "http://localhost:5000",
          generatedAt: new Date().toISOString(),
        });
      }
      
      res.json({
        success: true,
        scriptsGenerated: scripts.length,
        message: "Daily generation triggered successfully",
      });
    } catch (error) {
      console.error("Error triggering daily generation:", error);
      res.status(500).json({ error: "Failed to trigger daily generation" });
    }
  });

  return httpServer;
}
