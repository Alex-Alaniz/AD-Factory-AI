import cron, { type ScheduledTask } from "node-cron";
import { storage } from "./storage";
import { generateScripts } from "./openai";
import { sendDailySummaryEmail } from "./resend";
import type { Platform } from "@shared/schema";

let cronJob: ScheduledTask | null = null;

export function startCronJobs() {
  // Schedule script generation every 3 hours
  cronJob = cron.schedule("0 */3 * * *", async () => {
    console.log("Running scheduled script generation job...");
    
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
  });
  
  console.log("Cron job scheduled: Script generation every 3 hours");
}

export function stopCronJobs() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("Cron jobs stopped");
  }
}
