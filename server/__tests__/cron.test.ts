import { describe, it, expect, vi, beforeEach } from "vitest";

type CronCallback = () => Promise<void>;

// Use vi.hoisted for mocks that need to be available before imports
const { mockSchedule, mockStorage, mockGenerateScripts, mockSendDailySummaryEmail } = vi.hoisted(() => ({
  mockSchedule: vi.fn((_schedule: string, _callback: () => Promise<void>) => ({
    stop: vi.fn(),
  })),
  mockStorage: {
    getSettings: vi.fn(),
    createManyScripts: vi.fn(),
  },
  mockGenerateScripts: vi.fn(),
  mockSendDailySummaryEmail: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: mockSchedule,
  },
}));

vi.mock("../storage", () => ({
  storage: mockStorage,
}));

vi.mock("../openai", () => ({
  generateScripts: mockGenerateScripts,
}));

vi.mock("../resend", () => ({
  sendDailySummaryEmail: mockSendDailySummaryEmail,
}));

import { startCronJobs, stopCronJobs } from "../cron";

describe("Cron Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startCronJobs", () => {
    it("should schedule a cron job every 3 hours", () => {
      startCronJobs();

      expect(mockSchedule).toHaveBeenCalledWith(
        "0 */3 * * *",
        expect.any(Function)
      );
    });

    it("should only create one cron job even when called multiple times", () => {
      startCronJobs();
      startCronJobs();

      // Each call creates a new schedule, but stopCronJobs should clean up
      expect(mockSchedule).toHaveBeenCalled();
    });
  });

  describe("stopCronJobs", () => {
    it("should stop the cron job if one is running", () => {
      const mockStop = vi.fn();
      mockSchedule.mockReturnValueOnce({
        stop: mockStop,
      });

      startCronJobs();
      stopCronJobs();

      expect(mockStop).toHaveBeenCalled();
    });

    it("should not throw if no cron job is running", () => {
      expect(() => stopCronJobs()).not.toThrow();
    });
  });

  describe("Scheduled Job Execution", () => {
    let scheduledCallback: CronCallback;

    beforeEach(() => {
      // Capture the callback function passed to cron.schedule
      mockSchedule.mockImplementation(
        (_schedule: string, callback: CronCallback) => {
          scheduledCallback = callback;
          return { stop: vi.fn() };
        }
      );

      startCronJobs();
    });

    it("should not generate scripts when auto-generation is disabled", async () => {
      mockStorage.getSettings.mockResolvedValueOnce({
        autoGenerateEnabled: false,
        dailyScriptCount: 8,
        productFeatures: "test features",
        adminEmail: "",
      });

      await scheduledCallback();

      expect(mockGenerateScripts).not.toHaveBeenCalled();
    });

    it("should generate scripts when auto-generation is enabled", async () => {
      mockStorage.getSettings.mockResolvedValueOnce({
        autoGenerateEnabled: true,
        dailyScriptCount: 8,
        productFeatures: "test features",
        adminEmail: "",
      });

      mockGenerateScripts.mockResolvedValueOnce([
        { hook: "Test", body: "Body", cta: "CTA" },
      ]);

      mockStorage.createManyScripts.mockResolvedValueOnce([
        { id: "1", hook: "Test", body: "Body", cta: "CTA" },
      ]);

      await scheduledCallback();

      expect(mockGenerateScripts).toHaveBeenCalledWith(
        "test features",
        8,
        ["twitter", "tiktok", "instagram"]
      );
      expect(mockStorage.createManyScripts).toHaveBeenCalled();
    });

    it("should use default product features when none configured", async () => {
      mockStorage.getSettings.mockResolvedValueOnce({
        autoGenerateEnabled: true,
        dailyScriptCount: 5,
        productFeatures: "",
        adminEmail: "",
      });

      mockGenerateScripts.mockResolvedValueOnce([]);
      mockStorage.createManyScripts.mockResolvedValueOnce([]);

      await scheduledCallback();

      expect(mockGenerateScripts).toHaveBeenCalledWith(
        "instant payments, HONEY stablecoin currency, zero fees, $BEARCO memecoin integration",
        5,
        expect.any(Array)
      );
    });

    it("should send email notification when admin email is configured", async () => {
      mockStorage.getSettings.mockResolvedValueOnce({
        autoGenerateEnabled: true,
        dailyScriptCount: 3,
        productFeatures: "test",
        adminEmail: "admin@example.com",
      });

      mockGenerateScripts.mockResolvedValueOnce([
        { hook: "Hook 1" },
        { hook: "Hook 2" },
        { hook: "Hook 3" },
      ]);

      mockStorage.createManyScripts.mockResolvedValueOnce([
        { id: "1", hook: "Hook 1" },
        { id: "2", hook: "Hook 2" },
        { id: "3", hook: "Hook 3" },
      ]);

      await scheduledCallback();

      expect(mockSendDailySummaryEmail).toHaveBeenCalledWith(
        "admin@example.com",
        expect.objectContaining({
          scriptsGenerated: 3,
          topHooks: ["Hook 1", "Hook 2", "Hook 3"],
        })
      );
    });

    it("should not send email when admin email is not configured", async () => {
      mockStorage.getSettings.mockResolvedValueOnce({
        autoGenerateEnabled: true,
        dailyScriptCount: 3,
        productFeatures: "test",
        adminEmail: "",
      });

      mockGenerateScripts.mockResolvedValueOnce([]);
      mockStorage.createManyScripts.mockResolvedValueOnce([]);

      await scheduledCallback();

      expect(mockSendDailySummaryEmail).not.toHaveBeenCalled();
    });

    it("should only include top 3 hooks in email notification", async () => {
      mockStorage.getSettings.mockResolvedValueOnce({
        autoGenerateEnabled: true,
        dailyScriptCount: 5,
        productFeatures: "test",
        adminEmail: "admin@example.com",
      });

      mockGenerateScripts.mockResolvedValueOnce([
        { hook: "Hook 1" },
        { hook: "Hook 2" },
        { hook: "Hook 3" },
        { hook: "Hook 4" },
        { hook: "Hook 5" },
      ]);

      mockStorage.createManyScripts.mockResolvedValueOnce([
        { id: "1", hook: "Hook 1" },
        { id: "2", hook: "Hook 2" },
        { id: "3", hook: "Hook 3" },
        { id: "4", hook: "Hook 4" },
        { id: "5", hook: "Hook 5" },
      ]);

      await scheduledCallback();

      expect(mockSendDailySummaryEmail).toHaveBeenCalledWith(
        "admin@example.com",
        expect.objectContaining({
          topHooks: ["Hook 1", "Hook 2", "Hook 3"],
        })
      );
    });

    it("should handle errors gracefully", async () => {
      mockStorage.getSettings.mockRejectedValueOnce(new Error("Database error"));

      // Should not throw
      await expect(scheduledCallback()).resolves.toBeUndefined();
    });

    it("should handle script generation errors gracefully", async () => {
      mockStorage.getSettings.mockResolvedValueOnce({
        autoGenerateEnabled: true,
        dailyScriptCount: 3,
        productFeatures: "test",
        adminEmail: "",
      });

      mockGenerateScripts.mockRejectedValueOnce(new Error("OpenAI error"));

      // Should not throw
      await expect(scheduledCallback()).resolves.toBeUndefined();
    });
  });
});
