import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import type { Script, Settings, DashboardStats, InsertScript } from "@shared/schema";

// Mock the external dependencies
vi.mock("../storage", () => {
  let scripts: Script[] = [];
  let settings: Settings = {
    adminEmail: "",
    dailyScriptCount: 8,
    autoGenerateEnabled: true,
    productFeatures: "test features",
    lastUpdated: new Date().toISOString(),
    arcadsAvatarId: "",
    autoGenerateVideos: false,
    wav2lipApiUrl: "",
    wav2lipAvatarImageUrl: "",
    wav2lipEnabled: false,
    preferredVideoProvider: "arcads",
  };

  return {
    storage: {
      getAllScripts: vi.fn(() => Promise.resolve([...scripts])),
      getRecentScripts: vi.fn((limit: number = 10) =>
        Promise.resolve([...scripts].slice(0, limit))
      ),
      getScriptById: vi.fn((id: string) =>
        Promise.resolve(scripts.find((s) => s.id === id))
      ),
      createScript: vi.fn((insert: InsertScript) => {
        const script: Script = {
          ...insert,
          id: `test-${Date.now()}`,
          createdAt: new Date().toISOString(),
          videoStatus: insert.videoStatus || "none",
          videoUrl: insert.videoUrl || null,
          videoJobId: insert.videoJobId || null,
        };
        scripts.push(script);
        return Promise.resolve(script);
      }),
      createManyScripts: vi.fn((inserts: InsertScript[]) => {
        const newScripts = inserts.map((insert) => ({
          ...insert,
          id: `test-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
          videoStatus: insert.videoStatus || "none",
          videoUrl: insert.videoUrl || null,
          videoJobId: insert.videoJobId || null,
        } as Script));
        scripts.push(...newScripts);
        return Promise.resolve(newScripts);
      }),
      updateScriptStatus: vi.fn((id: string, status: string) => {
        const script = scripts.find((s) => s.id === id);
        if (!script) return Promise.resolve(undefined);
        script.status = status as any;
        return Promise.resolve(script);
      }),
      updateScriptVideo: vi.fn((id: string, videoStatus: string, videoUrl: string | null, videoJobId: string | null) => {
        const script = scripts.find((s) => s.id === id);
        if (!script) return Promise.resolve(undefined);
        script.videoStatus = videoStatus as any;
        script.videoUrl = videoUrl;
        script.videoJobId = videoJobId;
        return Promise.resolve(script);
      }),
      getSettings: vi.fn(() => Promise.resolve({ ...settings })),
      updateSettings: vi.fn((newSettings: Partial<Settings>) => {
        settings = { ...settings, ...newSettings, lastUpdated: new Date().toISOString() };
        return Promise.resolve({ ...settings });
      }),
      getStats: vi.fn(() => Promise.resolve({
        totalScripts: scripts.length,
        pendingScripts: scripts.filter((s) => s.status === "pending").length,
        usedScripts: scripts.filter((s) => s.status === "used").length,
        archivedScripts: scripts.filter((s) => s.status === "archived").length,
        scriptsToday: scripts.length,
        lastGeneration: scripts[0]?.createdAt || null,
        videosGenerating: 0,
        videosComplete: 0,
      } as DashboardStats)),
      exportScriptsToCSV: vi.fn(() => Promise.resolve("ID,Hook\n1,Test Hook")),
      _reset: () => {
        scripts = [];
        settings = {
          adminEmail: "",
          dailyScriptCount: 8,
          autoGenerateEnabled: true,
          productFeatures: "test features",
          lastUpdated: new Date().toISOString(),
          arcadsAvatarId: "",
          autoGenerateVideos: false,
          wav2lipApiUrl: "",
          wav2lipAvatarImageUrl: "",
          wav2lipEnabled: false,
          preferredVideoProvider: "arcads",
        };
      },
      _addScript: (script: Script) => {
        scripts.push(script);
      },
    },
  };
});

vi.mock("../openai", () => ({
  generateScripts: vi.fn(() =>
    Promise.resolve([
      {
        hook: "Generated Hook",
        body: "Generated Body",
        cta: "Generated CTA",
        type: "product-demo",
        platform: "tiktok",
        status: "pending",
        metadata: {
          characterCount: 50,
          estimatedDuration: 10,
          tone: "excited",
          wordCount: 10,
        },
        generatedBatch: "batch-123",
      },
    ])
  ),
}));

vi.mock("../cron", () => ({
  startCronJobs: vi.fn(),
  stopCronJobs: vi.fn(),
}));

vi.mock("../resend", () => ({
  sendDailySummaryEmail: vi.fn(() => Promise.resolve(true)),
  sendTestEmail: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("../arcads", () => ({
  createArcadsService: vi.fn(() => null),
}));

vi.mock("../wav2lip", () => ({
  createWav2LipService: vi.fn(() => null),
  getOpenAIClient: vi.fn(() => null),
}));

import { registerRoutes } from "../routes";
import { storage } from "../storage";

describe("API Routes", () => {
  let app: express.Express;
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    (storage as any)._reset?.();

    // Create fresh app and server
    app = express();
    app.use(express.json());
    httpServer = createServer(app);
    await registerRoutes(httpServer, app);
  });

  afterEach(() => {
    httpServer.close();
  });

  describe("GET /api/scripts", () => {
    it("should return empty array when no scripts exist", async () => {
      const response = await request(app).get("/api/scripts");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return all scripts", async () => {
      const mockScript: Script = {
        id: "test-1",
        hook: "Test Hook",
        body: "Test Body",
        cta: "Test CTA",
        type: "product-demo",
        platform: "tiktok",
        status: "pending",
        metadata: { characterCount: 50, estimatedDuration: 10, tone: "excited", wordCount: 10 },
        createdAt: new Date().toISOString(),
        generatedBatch: "batch-1",
        videoStatus: "none",
        videoUrl: null,
        videoJobId: null,
      };
      (storage as any)._addScript(mockScript);

      const response = await request(app).get("/api/scripts");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].hook).toBe("Test Hook");
    });
  });

  describe("GET /api/scripts/recent", () => {
    it("should return limited recent scripts", async () => {
      const response = await request(app).get("/api/scripts/recent?limit=5");

      expect(response.status).toBe(200);
      expect(storage.getRecentScripts).toHaveBeenCalledWith(5);
    });

    it("should use default limit when not specified", async () => {
      const response = await request(app).get("/api/scripts/recent");

      expect(response.status).toBe(200);
      expect(storage.getRecentScripts).toHaveBeenCalledWith(10);
    });
  });

  describe("POST /api/scripts/generate", () => {
    it("should generate scripts with valid request", async () => {
      const response = await request(app)
        .post("/api/scripts/generate")
        .send({
          productFeatures: "test features",
          count: 5,
          platforms: ["tiktok", "twitter"],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scripts).toBeDefined();
      expect(response.body.message).toContain("Generated");
    });

    it("should return 400 when missing productFeatures", async () => {
      const response = await request(app)
        .post("/api/scripts/generate")
        .send({
          count: 5,
          platforms: ["tiktok"],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should return 400 when missing count", async () => {
      const response = await request(app)
        .post("/api/scripts/generate")
        .send({
          productFeatures: "test features",
          platforms: ["tiktok"],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should return 400 when platforms is empty", async () => {
      const response = await request(app)
        .post("/api/scripts/generate")
        .send({
          productFeatures: "test features",
          count: 5,
          platforms: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });
  });

  describe("PATCH /api/scripts/:id/status", () => {
    it("should update script status", async () => {
      const mockScript: Script = {
        id: "test-update-1",
        hook: "Test",
        body: "Body",
        cta: "CTA",
        type: "product-demo",
        platform: "tiktok",
        status: "pending",
        metadata: { characterCount: 20, estimatedDuration: 5, tone: "casual", wordCount: 5 },
        createdAt: new Date().toISOString(),
        generatedBatch: "batch-1",
        videoStatus: "none",
        videoUrl: null,
        videoJobId: null,
      };
      (storage as any)._addScript(mockScript);

      const response = await request(app)
        .patch("/api/scripts/test-update-1/status")
        .send({ status: "used" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("used");
    });

    it("should return 400 for invalid status", async () => {
      const response = await request(app)
        .patch("/api/scripts/test-1/status")
        .send({ status: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid status");
    });

    it("should return 404 for non-existent script", async () => {
      const response = await request(app)
        .patch("/api/scripts/non-existent/status")
        .send({ status: "used" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Script not found");
    });
  });

  describe("GET /api/scripts/export", () => {
    it("should export scripts as CSV", async () => {
      const response = await request(app).get("/api/scripts/export");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.headers["content-disposition"]).toContain(".csv");
    });
  });

  describe("GET /api/stats", () => {
    it("should return dashboard stats", async () => {
      const response = await request(app).get("/api/stats");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalScripts");
      expect(response.body).toHaveProperty("pendingScripts");
      expect(response.body).toHaveProperty("usedScripts");
      expect(response.body).toHaveProperty("archivedScripts");
    });
  });

  describe("GET /api/settings", () => {
    it("should return current settings", async () => {
      const response = await request(app).get("/api/settings");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("adminEmail");
      expect(response.body).toHaveProperty("dailyScriptCount");
      expect(response.body).toHaveProperty("autoGenerateEnabled");
    });
  });

  describe("PUT /api/settings", () => {
    it("should update settings with valid data", async () => {
      const response = await request(app)
        .put("/api/settings")
        .send({
          adminEmail: "test@example.com",
          dailyScriptCount: 12,
        });

      expect(response.status).toBe(200);
      expect(response.body.adminEmail).toBe("test@example.com");
      expect(response.body.dailyScriptCount).toBe(12);
    });

    it("should return 400 for invalid settings data", async () => {
      const response = await request(app)
        .put("/api/settings")
        .send({
          dailyScriptCount: "not-a-number",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid settings data");
    });
  });

  describe("GET /api/arcads/status", () => {
    it("should return not configured when API key is missing", async () => {
      const response = await request(app).get("/api/arcads/status");

      expect(response.status).toBe(200);
      expect(response.body.configured).toBe(false);
    });
  });

  describe("GET /api/wav2lip/status", () => {
    it("should return wav2lip configuration status", async () => {
      const response = await request(app).get("/api/wav2lip/status");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("configured");
      expect(response.body).toHaveProperty("enabled");
    });
  });

  describe("POST /api/test-email", () => {
    it("should return 400 when admin email not configured", async () => {
      const response = await request(app).post("/api/test-email");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Admin email not configured");
    });
  });

  describe("POST /api/trigger-daily-generation", () => {
    it("should trigger daily generation", async () => {
      const response = await request(app).post("/api/trigger-daily-generation");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Daily generation triggered");
    });
  });

  describe("POST /api/scripts/:id/generate-video", () => {
    it("should return 404 for non-existent script", async () => {
      const response = await request(app)
        .post("/api/scripts/non-existent/generate-video");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Script not found");
    });

    it("should return 400 when Arcads API key not configured", async () => {
      const mockScript: Script = {
        id: "test-video-1",
        hook: "Test",
        body: "Body",
        cta: "CTA",
        type: "product-demo",
        platform: "tiktok",
        status: "pending",
        metadata: { characterCount: 20, estimatedDuration: 5, tone: "casual", wordCount: 5 },
        createdAt: new Date().toISOString(),
        generatedBatch: "batch-1",
        videoStatus: "none",
        videoUrl: null,
        videoJobId: null,
      };
      (storage as any)._addScript(mockScript);

      const response = await request(app)
        .post("/api/scripts/test-video-1/generate-video");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Arcads API key not configured");
    });
  });

  describe("POST /api/wav2lip/generate-video", () => {
    it("should return 400 when scriptId is missing", async () => {
      const response = await request(app)
        .post("/api/wav2lip/generate-video")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Script ID is required");
    });

    it("should return 404 for non-existent script", async () => {
      const response = await request(app)
        .post("/api/wav2lip/generate-video")
        .send({ scriptId: "non-existent" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Script not found");
    });
  });
});
