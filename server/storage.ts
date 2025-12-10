import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Script, InsertScript, Settings, InsertSettings, DashboardStats } from "@shared/schema";

// Use absolute path from project root for consistent storage location
const DATA_DIR = path.resolve(process.cwd(), "data");
const SCRIPTS_FILE = path.join(DATA_DIR, "scripts.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  // Also ensure export folders exist
  const folders = ["scripts", "exports", "assets"];
  for (const folder of folders) {
    const folderPath = path.join(DATA_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  }
}

function loadScripts(): Script[] {
  ensureDataDir();
  try {
    if (fs.existsSync(SCRIPTS_FILE)) {
      const data = fs.readFileSync(SCRIPTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading scripts:", error);
  }
  return [];
}

function saveScripts(scripts: Script[]) {
  ensureDataDir();
  fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2));
}

function loadSettings(): Settings {
  ensureDataDir();
  const defaults: Settings = {
    adminEmail: "",
    dailyScriptCount: 8,
    autoGenerateEnabled: true,
    productFeatures: "instant payments, HONEY stablecoin currency, zero fees, $BEARCO memecoin integration",
    lastUpdated: new Date().toISOString(),
    arcadsAvatarId: "",
    autoGenerateVideos: false,
  };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const saved = JSON.parse(data);
      return { ...defaults, ...saved };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return defaults;
}

function saveSettings(settings: Settings) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export interface IStorage {
  // Scripts
  getAllScripts(): Promise<Script[]>;
  getRecentScripts(limit?: number): Promise<Script[]>;
  getScriptById(id: string): Promise<Script | undefined>;
  createScript(script: InsertScript): Promise<Script>;
  createManyScripts(scripts: InsertScript[]): Promise<Script[]>;
  updateScriptStatus(id: string, status: Script["status"]): Promise<Script | undefined>;
  updateScriptVideo(id: string, videoStatus: Script["videoStatus"], videoUrl: string | null, videoJobId: string | null): Promise<Script | undefined>;
  getScriptsWithPendingVideos(): Promise<Script[]>;
  deleteScript(id: string): Promise<boolean>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;
  
  // Stats
  getStats(): Promise<DashboardStats>;
  
  // Export
  exportScriptsToCSV(): Promise<string>;
}

export class FileStorage implements IStorage {
  private scripts: Script[] = [];
  private settings: Settings;

  constructor() {
    this.scripts = loadScripts();
    this.settings = loadSettings();
  }

  async getAllScripts(): Promise<Script[]> {
    return [...this.scripts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentScripts(limit: number = 10): Promise<Script[]> {
    return [...this.scripts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getScriptById(id: string): Promise<Script | undefined> {
    return this.scripts.find((s) => s.id === id);
  }

  async createScript(insertScript: InsertScript): Promise<Script> {
    const script: Script = {
      ...insertScript,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      videoStatus: insertScript.videoStatus || "none",
      videoUrl: insertScript.videoUrl || null,
      videoJobId: insertScript.videoJobId || null,
    };
    this.scripts.push(script);
    saveScripts(this.scripts);
    
    // Also save to date-organized folder
    this.saveScriptToFolder(script);
    
    return script;
  }

  async createManyScripts(insertScripts: InsertScript[]): Promise<Script[]> {
    const newScripts: Script[] = insertScripts.map((s) => ({
      ...s,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      videoStatus: s.videoStatus || "none",
      videoUrl: s.videoUrl || null,
      videoJobId: s.videoJobId || null,
    }));
    
    this.scripts.push(...newScripts);
    saveScripts(this.scripts);
    
    // Save to organized folders
    for (const script of newScripts) {
      this.saveScriptToFolder(script);
    }
    
    return newScripts;
  }

  private saveScriptToFolder(script: Script) {
    const date = new Date(script.createdAt);
    const dateStr = date.toISOString().split("T")[0];
    const folder = path.join(DATA_DIR, "scripts", dateStr);
    
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    
    const filename = `${script.platform}_${script.id}.json`;
    const filepath = path.join(folder, filename);
    fs.writeFileSync(filepath, JSON.stringify(script, null, 2));
  }

  async updateScriptStatus(id: string, status: Script["status"]): Promise<Script | undefined> {
    const index = this.scripts.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    
    this.scripts[index] = { ...this.scripts[index], status };
    saveScripts(this.scripts);
    return this.scripts[index];
  }

  async deleteScript(id: string): Promise<boolean> {
    const index = this.scripts.findIndex((s) => s.id === id);
    if (index === -1) return false;
    
    this.scripts.splice(index, 1);
    saveScripts(this.scripts);
    return true;
  }

  async getSettings(): Promise<Settings> {
    return { ...this.settings };
  }

  async updateSettings(insertSettings: Partial<InsertSettings>): Promise<Settings> {
    // Merge with existing settings to preserve required fields
    this.settings = {
      adminEmail: insertSettings.adminEmail ?? this.settings.adminEmail,
      dailyScriptCount: insertSettings.dailyScriptCount ?? this.settings.dailyScriptCount,
      autoGenerateEnabled: insertSettings.autoGenerateEnabled ?? this.settings.autoGenerateEnabled,
      productFeatures: insertSettings.productFeatures ?? this.settings.productFeatures,
      arcadsAvatarId: insertSettings.arcadsAvatarId ?? this.settings.arcadsAvatarId,
      autoGenerateVideos: insertSettings.autoGenerateVideos ?? this.settings.autoGenerateVideos,
      lastUpdated: new Date().toISOString(),
    };
    saveSettings(this.settings);
    return { ...this.settings };
  }

  async getStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const scriptsToday = this.scripts.filter(
      (s) => new Date(s.createdAt) >= today
    ).length;
    
    const sortedScripts = [...this.scripts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return {
      totalScripts: this.scripts.length,
      pendingScripts: this.scripts.filter((s) => s.status === "pending").length,
      usedScripts: this.scripts.filter((s) => s.status === "used").length,
      archivedScripts: this.scripts.filter((s) => s.status === "archived").length,
      scriptsToday,
      lastGeneration: sortedScripts[0]?.createdAt || null,
      videosGenerating: this.scripts.filter((s) => s.videoStatus === "generating" || s.videoStatus === "pending").length,
      videosComplete: this.scripts.filter((s) => s.videoStatus === "complete").length,
    };
  }

  async updateScriptVideo(id: string, videoStatus: Script["videoStatus"], videoUrl: string | null, videoJobId: string | null): Promise<Script | undefined> {
    const index = this.scripts.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    
    this.scripts[index] = { 
      ...this.scripts[index], 
      videoStatus, 
      videoUrl,
      videoJobId 
    };
    saveScripts(this.scripts);
    return this.scripts[index];
  }

  async getScriptsWithPendingVideos(): Promise<Script[]> {
    return this.scripts.filter(
      (s) => s.videoStatus === "pending" || s.videoStatus === "generating"
    );
  }

  async exportScriptsToCSV(): Promise<string> {
    const headers = [
      "ID",
      "Date",
      "Hook",
      "Body",
      "CTA",
      "Type",
      "Platform",
      "Status",
      "Character Count",
      "Duration (s)",
      "Tone",
      "Word Count",
    ];
    
    const rows = this.scripts.map((s) => [
      s.id,
      new Date(s.createdAt).toISOString(),
      `"${s.hook.replace(/"/g, '""')}"`,
      `"${s.body.replace(/"/g, '""')}"`,
      `"${s.cta.replace(/"/g, '""')}"`,
      s.type,
      s.platform,
      s.status,
      s.metadata.characterCount.toString(),
      s.metadata.estimatedDuration.toString(),
      s.metadata.tone,
      s.metadata.wordCount.toString(),
    ]);
    
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    
    // Also save to exports folder
    const exportPath = path.join(
      DATA_DIR,
      "exports",
      `scripts-${new Date().toISOString().split("T")[0]}.csv`
    );
    fs.writeFileSync(exportPath, csv);
    
    return csv;
  }
}

export const storage = new FileStorage();
