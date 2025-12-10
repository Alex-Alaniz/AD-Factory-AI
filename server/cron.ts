import cron from "node-cron";
import { storage } from "./storage";
import { generateScripts } from "./openai";
import { sendDailySummaryEmail } from "./resend";
import type { Platform } from "@shared/schema";

let cronJob: cron.ScheduledTask | null = null;

export function startCronJobs() {
  // Schedule daily script generation at 6 AM EST (11 AM UTC)
  // EST is UTC-5, so 6 AM EST = 11 AM UTC
  cronJob = cron.schedule("0 11 * * *", async () => {
    console.log("Running daily script generation job...");
    
    try {
      const settings = await storage.getSettings();
      
      if (!settings.autoGenerateEnabled) {
        console.log("Auto generation is disabled, skipping...");
        return;
      }
      
      const platforms: Platform[] = ["twitter", "tiktok", "instagram"];
      const productFeatures = settings.productFeatures || 
        "instant payments, HONEY stablecoin currency, zero fees, $BEARCO memecoin integration";
      
      // Generate scripts
      const insertScripts = await generateScripts(
        productFeatures,
        settings.dailyScriptCount,
        platforms
      );
      
      const scripts = await storage.createManyScripts(insertScripts);
      console.log(`Generated ${scripts.length} scripts`);
      
      // Send email notification if admin email is configured
      if (settings.adminEmail) {
        const topHooks = scripts.slice(0, 3).map((s) => s.hook);
        
        await sendDailySummaryEmail(settings.adminEmail, {
          scriptsGenerated: scripts.length,
          topHooks,
          dashboardUrl: process.env.REPLIT_DEPLOYMENT_URL || "http://localhost:5000",
          generatedAt: new Date().toISOString(),
        });
        
        console.log("Daily summary email sent to:", settings.adminEmail);
      }
    } catch (error) {
      console.error("Error in daily script generation:", error);
    }
  }, {
    timezone: "America/New_York"
  });
  
  console.log("Cron job scheduled: Daily script generation at 6 AM EST");
}

export function stopCronJobs() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("Cron jobs stopped");
  }
}
