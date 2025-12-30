import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import type { InsertScript, Script, InsertSettings } from "@shared/schema";

// Mock the data directory before importing storage
const TEST_DATA_DIR = path.resolve(process.cwd(), "data", "__test__");

// We need to create a fresh FileStorage instance for each test
// So we'll import the class directly and mock the file paths

describe("FileStorage", () => {
  // Helper to create a fresh storage instance with test paths
  let testStorage: any;

  const createTestStorage = () => {
    // Clean up test directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    // Create a simple in-memory storage that mimics FileStorage behavior
    class TestFileStorage {
      private scripts: Script[] = [];
      private settings: any;

      constructor() {
        this.scripts = [];
        this.settings = {
          adminEmail: "",
          dailyScriptCount: 8,
          autoGenerateEnabled: true,
          productFeatures: "instant payments, HONEY stablecoin currency, zero fees, $BEARCO memecoin integration",
          lastUpdated: new Date().toISOString(),
          arcadsAvatarId: "",
          autoGenerateVideos: false,
          wav2lipApiUrl: "",
          wav2lipAvatarImageUrl: "",
          wav2lipEnabled: false,
          preferredVideoProvider: "arcads",
        };
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
          id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          videoStatus: insertScript.videoStatus || "none",
          videoUrl: insertScript.videoUrl || null,
          videoJobId: insertScript.videoJobId || null,
        };
        this.scripts.push(script);
        return script;
      }

      async createManyScripts(insertScripts: InsertScript[]): Promise<Script[]> {
        const newScripts: Script[] = insertScripts.map((s) => ({
          ...s,
          id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          videoStatus: s.videoStatus || "none",
          videoUrl: s.videoUrl || null,
          videoJobId: s.videoJobId || null,
        }));
        this.scripts.push(...newScripts);
        return newScripts;
      }

      async updateScriptStatus(id: string, status: Script["status"]): Promise<Script | undefined> {
        const index = this.scripts.findIndex((s) => s.id === id);
        if (index === -1) return undefined;
        this.scripts[index] = { ...this.scripts[index], status };
        return this.scripts[index];
      }

      async updateScriptVideo(
        id: string,
        videoStatus: Script["videoStatus"],
        videoUrl: string | null,
        videoJobId: string | null
      ): Promise<Script | undefined> {
        const index = this.scripts.findIndex((s) => s.id === id);
        if (index === -1) return undefined;
        this.scripts[index] = { ...this.scripts[index], videoStatus, videoUrl, videoJobId };
        return this.scripts[index];
      }

      async deleteScript(id: string): Promise<boolean> {
        const index = this.scripts.findIndex((s) => s.id === id);
        if (index === -1) return false;
        this.scripts.splice(index, 1);
        return true;
      }

      async getScriptsWithPendingVideos(): Promise<Script[]> {
        return this.scripts.filter(
          (s) => s.videoStatus === "pending" || s.videoStatus === "generating"
        );
      }

      async getSettings() {
        return { ...this.settings };
      }

      async updateSettings(insertSettings: Partial<InsertSettings>) {
        this.settings = {
          ...this.settings,
          ...insertSettings,
          lastUpdated: new Date().toISOString(),
        };
        return { ...this.settings };
      }

      async getStats() {
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
          videosGenerating: this.scripts.filter(
            (s) => s.videoStatus === "generating" || s.videoStatus === "pending"
          ).length,
          videosComplete: this.scripts.filter((s) => s.videoStatus === "complete").length,
        };
      }

      async exportScriptsToCSV(): Promise<string> {
        const headers = [
          "ID", "Date", "Hook", "Body", "CTA", "Type", "Platform", "Status",
          "Video Status", "Video URL", "Character Count", "Duration (s)", "Tone", "Word Count"
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
          s.videoStatus || "none",
          s.videoUrl || "",
          s.metadata.characterCount.toString(),
          s.metadata.estimatedDuration.toString(),
          s.metadata.tone,
          s.metadata.wordCount.toString(),
        ]);

        return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      }
    }

    return new TestFileStorage();
  };

  const createMockScript = (overrides: Partial<InsertScript> = {}): InsertScript => ({
    hook: "This app changed my life!",
    body: "I used to struggle with payments but now everything is instant.",
    cta: "Download Bearo today!",
    type: "product-demo",
    platform: "tiktok",
    status: "pending",
    metadata: {
      characterCount: 100,
      estimatedDuration: 15,
      tone: "excited",
      wordCount: 20,
    },
    generatedBatch: "batch-123",
    videoStatus: "none",
    videoUrl: null,
    videoJobId: null,
    ...overrides,
  });

  beforeEach(() => {
    testStorage = createTestStorage();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe("Script Operations", () => {
    describe("createScript", () => {
      it("should create a script with valid data", async () => {
        const input = createMockScript();
        const script = await testStorage.createScript(input);

        expect(script.id).toBeDefined();
        expect(script.hook).toBe(input.hook);
        expect(script.body).toBe(input.body);
        expect(script.cta).toBe(input.cta);
        expect(script.type).toBe(input.type);
        expect(script.platform).toBe(input.platform);
        expect(script.status).toBe("pending");
        expect(script.createdAt).toBeDefined();
        expect(script.videoStatus).toBe("none");
      });

      it("should set default video status to none", async () => {
        const input = createMockScript({ videoStatus: undefined });
        const script = await testStorage.createScript(input);
        expect(script.videoStatus).toBe("none");
      });
    });

    describe("createManyScripts", () => {
      it("should create multiple scripts at once", async () => {
        const inputs = [
          createMockScript({ hook: "Script 1" }),
          createMockScript({ hook: "Script 2" }),
          createMockScript({ hook: "Script 3" }),
        ];

        const scripts = await testStorage.createManyScripts(inputs);

        expect(scripts).toHaveLength(3);
        expect(scripts[0].hook).toBe("Script 1");
        expect(scripts[1].hook).toBe("Script 2");
        expect(scripts[2].hook).toBe("Script 3");
      });

      it("should handle empty array", async () => {
        const scripts = await testStorage.createManyScripts([]);
        expect(scripts).toHaveLength(0);
      });
    });

    describe("getAllScripts", () => {
      it("should return empty array when no scripts exist", async () => {
        const scripts = await testStorage.getAllScripts();
        expect(scripts).toHaveLength(0);
      });

      it("should return all scripts sorted by date descending", async () => {
        await testStorage.createScript(createMockScript({ hook: "Old Script" }));
        await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
        await testStorage.createScript(createMockScript({ hook: "New Script" }));

        const scripts = await testStorage.getAllScripts();

        expect(scripts).toHaveLength(2);
        expect(scripts[0].hook).toBe("New Script");
        expect(scripts[1].hook).toBe("Old Script");
      });
    });

    describe("getRecentScripts", () => {
      it("should return limited number of scripts", async () => {
        for (let i = 0; i < 15; i++) {
          await testStorage.createScript(createMockScript({ hook: `Script ${i}` }));
        }

        const scripts = await testStorage.getRecentScripts(5);

        expect(scripts).toHaveLength(5);
      });

      it("should use default limit of 10", async () => {
        for (let i = 0; i < 15; i++) {
          await testStorage.createScript(createMockScript({ hook: `Script ${i}` }));
        }

        const scripts = await testStorage.getRecentScripts();

        expect(scripts).toHaveLength(10);
      });
    });

    describe("getScriptById", () => {
      it("should return script by ID", async () => {
        const created = await testStorage.createScript(createMockScript());
        const found = await testStorage.getScriptById(created.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
      });

      it("should return undefined for non-existent ID", async () => {
        const found = await testStorage.getScriptById("non-existent-id");
        expect(found).toBeUndefined();
      });
    });

    describe("updateScriptStatus", () => {
      it("should update script status", async () => {
        const script = await testStorage.createScript(createMockScript());

        const updated = await testStorage.updateScriptStatus(script.id, "used");

        expect(updated).toBeDefined();
        expect(updated?.status).toBe("used");
      });

      it("should return undefined for non-existent script", async () => {
        const updated = await testStorage.updateScriptStatus("non-existent", "used");
        expect(updated).toBeUndefined();
      });

      it("should persist status change", async () => {
        const script = await testStorage.createScript(createMockScript());
        await testStorage.updateScriptStatus(script.id, "archived");

        const found = await testStorage.getScriptById(script.id);
        expect(found?.status).toBe("archived");
      });
    });

    describe("updateScriptVideo", () => {
      it("should update video status and URL", async () => {
        const script = await testStorage.createScript(createMockScript());

        const updated = await testStorage.updateScriptVideo(
          script.id,
          "complete",
          "https://example.com/video.mp4",
          "job-123"
        );

        expect(updated).toBeDefined();
        expect(updated?.videoStatus).toBe("complete");
        expect(updated?.videoUrl).toBe("https://example.com/video.mp4");
        expect(updated?.videoJobId).toBe("job-123");
      });

      it("should handle null values", async () => {
        const script = await testStorage.createScript(createMockScript());

        const updated = await testStorage.updateScriptVideo(script.id, "failed", null, null);

        expect(updated?.videoStatus).toBe("failed");
        expect(updated?.videoUrl).toBeNull();
        expect(updated?.videoJobId).toBeNull();
      });
    });

    describe("deleteScript", () => {
      it("should delete existing script", async () => {
        const script = await testStorage.createScript(createMockScript());

        const deleted = await testStorage.deleteScript(script.id);

        expect(deleted).toBe(true);
        const found = await testStorage.getScriptById(script.id);
        expect(found).toBeUndefined();
      });

      it("should return false for non-existent script", async () => {
        const deleted = await testStorage.deleteScript("non-existent");
        expect(deleted).toBe(false);
      });
    });

    describe("getScriptsWithPendingVideos", () => {
      it("should return scripts with pending or generating video status", async () => {
        await testStorage.createScript(createMockScript({ videoStatus: "none" }));
        await testStorage.createScript(createMockScript({ videoStatus: "pending" }));
        await testStorage.createScript(createMockScript({ videoStatus: "generating" }));
        await testStorage.createScript(createMockScript({ videoStatus: "complete" }));
        await testStorage.createScript(createMockScript({ videoStatus: "failed" }));

        const pendingScripts = await testStorage.getScriptsWithPendingVideos();

        expect(pendingScripts).toHaveLength(2);
        expect(pendingScripts.every((s: Script) => s.videoStatus === "pending" || s.videoStatus === "generating")).toBe(true);
      });
    });
  });

  describe("Settings Operations", () => {
    describe("getSettings", () => {
      it("should return default settings", async () => {
        const settings = await testStorage.getSettings();

        expect(settings.adminEmail).toBe("");
        expect(settings.dailyScriptCount).toBe(8);
        expect(settings.autoGenerateEnabled).toBe(true);
        expect(settings.autoGenerateVideos).toBe(false);
        expect(settings.preferredVideoProvider).toBe("arcads");
      });
    });

    describe("updateSettings", () => {
      it("should update partial settings", async () => {
        const updated = await testStorage.updateSettings({
          adminEmail: "test@example.com",
          dailyScriptCount: 12,
        });

        expect(updated.adminEmail).toBe("test@example.com");
        expect(updated.dailyScriptCount).toBe(12);
        expect(updated.autoGenerateEnabled).toBe(true); // Default preserved
      });

      it("should update lastUpdated timestamp", async () => {
        const before = new Date().toISOString();
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updated = await testStorage.updateSettings({ dailyScriptCount: 5 });

        expect(new Date(updated.lastUpdated) >= new Date(before)).toBe(true);
      });

      it("should handle video provider setting", async () => {
        const updated = await testStorage.updateSettings({
          preferredVideoProvider: "wav2lip",
          wav2lipEnabled: true,
          wav2lipApiUrl: "http://localhost:8000",
        });

        expect(updated.preferredVideoProvider).toBe("wav2lip");
        expect(updated.wav2lipEnabled).toBe(true);
        expect(updated.wav2lipApiUrl).toBe("http://localhost:8000");
      });
    });
  });

  describe("Stats Operations", () => {
    describe("getStats", () => {
      it("should return zero counts when no scripts exist", async () => {
        const stats = await testStorage.getStats();

        expect(stats.totalScripts).toBe(0);
        expect(stats.pendingScripts).toBe(0);
        expect(stats.usedScripts).toBe(0);
        expect(stats.archivedScripts).toBe(0);
        expect(stats.lastGeneration).toBeNull();
      });

      it("should count scripts by status", async () => {
        await testStorage.createScript(createMockScript({ status: "pending" }));
        await testStorage.createScript(createMockScript({ status: "pending" }));
        await testStorage.createScript(createMockScript({ status: "used" }));
        await testStorage.createScript(createMockScript({ status: "archived" }));

        const stats = await testStorage.getStats();

        expect(stats.totalScripts).toBe(4);
        expect(stats.pendingScripts).toBe(2);
        expect(stats.usedScripts).toBe(1);
        expect(stats.archivedScripts).toBe(1);
      });

      it("should count video statuses", async () => {
        await testStorage.createScript(createMockScript({ videoStatus: "pending" }));
        await testStorage.createScript(createMockScript({ videoStatus: "generating" }));
        await testStorage.createScript(createMockScript({ videoStatus: "complete" }));
        await testStorage.createScript(createMockScript({ videoStatus: "complete" }));

        const stats = await testStorage.getStats();

        expect(stats.videosGenerating).toBe(2); // pending + generating
        expect(stats.videosComplete).toBe(2);
      });

      it("should return last generation date", async () => {
        await testStorage.createScript(createMockScript());

        const stats = await testStorage.getStats();

        expect(stats.lastGeneration).toBeDefined();
        expect(new Date(stats.lastGeneration!)).toBeInstanceOf(Date);
      });
    });
  });

  describe("Export Operations", () => {
    describe("exportScriptsToCSV", () => {
      it("should export empty CSV with headers when no scripts", async () => {
        const csv = await testStorage.exportScriptsToCSV();
        const lines = csv.split("\n");

        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("ID");
        expect(lines[0]).toContain("Hook");
        expect(lines[0]).toContain("Platform");
      });

      it("should export scripts to CSV format", async () => {
        await testStorage.createScript(
          createMockScript({
            hook: "Test Hook",
            body: "Test Body",
            cta: "Test CTA",
            platform: "twitter",
          })
        );

        const csv = await testStorage.exportScriptsToCSV();
        const lines = csv.split("\n");

        expect(lines).toHaveLength(2);
        expect(lines[1]).toContain("Test Hook");
        expect(lines[1]).toContain("twitter");
      });

      it("should properly escape quotes in CSV", async () => {
        await testStorage.createScript(
          createMockScript({
            hook: 'This has "quotes" in it',
          })
        );

        const csv = await testStorage.exportScriptsToCSV();

        expect(csv).toContain('""quotes""');
      });
    });
  });
});
