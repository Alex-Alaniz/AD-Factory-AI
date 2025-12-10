import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateScripts } from "./openai";
import { sendDailySummaryEmail, sendTestEmail } from "./resend";
import { startCronJobs } from "./cron";
import type { Platform, GenerationRequest } from "@shared/schema";
import { insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

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
