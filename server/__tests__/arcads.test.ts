import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArcadsService, createArcadsService } from "../arcads";
import type { Script } from "@shared/schema";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Arcads Module", () => {
  const mockScript: Script = {
    id: "test-script-1",
    hook: "This is the hook",
    body: "This is the body content",
    cta: "Download now!",
    type: "product-demo",
    platform: "tiktok",
    status: "pending",
    metadata: {
      characterCount: 50,
      estimatedDuration: 10,
      tone: "excited",
      wordCount: 10,
    },
    createdAt: new Date().toISOString(),
    generatedBatch: "batch-1",
    videoStatus: "none",
    videoUrl: null,
    videoJobId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createArcadsService", () => {
    it("should return null when API key is empty", () => {
      const service = createArcadsService("", "avatar-1");
      expect(service).toBeNull();
    });

    it("should return service instance when API key is provided", () => {
      const service = createArcadsService("test-api-key", "avatar-1");
      expect(service).toBeInstanceOf(ArcadsService);
    });

    it("should use default avatar ID when not specified", () => {
      const service = createArcadsService("test-api-key", "default");
      expect(service).toBeInstanceOf(ArcadsService);
    });
  });

  describe("ArcadsService", () => {
    let service: ArcadsService;

    beforeEach(() => {
      service = new ArcadsService("test-api-key", "avatar-123");
    });

    describe("generateVideo", () => {
      it("should generate video with correct API call", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "job-123",
              status: "pending",
            }),
        });

        const result = await service.generateVideo(mockScript);

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.arcads.ai/v1/videos/generate",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer test-api-key",
            },
          })
        );

        expect(result.jobId).toBe("job-123");
        expect(result.status).toBe("pending");
      });

      it("should combine hook, body, and cta into script", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ job_id: "job-123", status: "pending" }),
        });

        await service.generateVideo(mockScript);

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.script).toBe(
          `${mockScript.hook} ${mockScript.body} ${mockScript.cta}`
        );
      });

      it("should include avatar ID in request", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ job_id: "job-123", status: "pending" }),
        });

        await service.generateVideo(mockScript);

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.avatar_id).toBe("avatar-123");
      });

      it("should throw error on API failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
        });

        await expect(service.generateVideo(mockScript)).rejects.toThrow(
          "Arcads API error: 500"
        );
      });

      it("should throw error when API key not configured", async () => {
        const noKeyService = new ArcadsService("", "avatar-123");

        await expect(noKeyService.generateVideo(mockScript)).rejects.toThrow(
          "Arcads API key not configured"
        );
      });

      it("should handle video_url in response", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "job-123",
              status: "completed",
              video_url: "https://example.com/video.mp4",
            }),
        });

        const result = await service.generateVideo(mockScript);

        expect(result.videoUrl).toBe("https://example.com/video.mp4");
      });
    });

    describe("checkVideoStatus", () => {
      it("should check video status with correct API call", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "job-123",
              status: "processing",
            }),
        });

        const result = await service.checkVideoStatus("job-123");

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.arcads.ai/v1/videos/status/job-123",
          expect.objectContaining({
            method: "GET",
            headers: {
              Authorization: "Bearer test-api-key",
            },
          })
        );

        expect(result.jobId).toBe("job-123");
        expect(result.status).toBe("processing");
      });

      it("should return video URL when completed", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "job-123",
              status: "completed",
              video_url: "https://example.com/video.mp4",
            }),
        });

        const result = await service.checkVideoStatus("job-123");

        expect(result.status).toBe("completed");
        expect(result.videoUrl).toBe("https://example.com/video.mp4");
      });

      it("should throw error on API failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not Found"),
        });

        await expect(service.checkVideoStatus("job-123")).rejects.toThrow(
          "Arcads API error: 404"
        );
      });

      it("should throw error when API key not configured", async () => {
        const noKeyService = new ArcadsService("", "avatar-123");

        await expect(noKeyService.checkVideoStatus("job-123")).rejects.toThrow(
          "Arcads API key not configured"
        );
      });
    });

    describe("pollVideoCompletion", () => {
      it("should return immediately when video is completed", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "job-123",
              status: "completed",
              video_url: "https://example.com/video.mp4",
            }),
        });

        const result = await service.pollVideoCompletion("job-123");

        expect(result.status).toBe("completed");
        expect(result.videoUrl).toBe("https://example.com/video.mp4");
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it("should throw error when video generation fails", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "job-123",
              status: "failed",
            }),
        });

        await expect(service.pollVideoCompletion("job-123")).rejects.toThrow(
          "Video generation failed"
        );
      });

      it("should poll until completed", async () => {
        vi.useRealTimers(); // Use real timers for this test

        // First call - processing
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ job_id: "job-123", status: "processing" }),
        });

        // Second call - completed
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "job-123",
              status: "completed",
              video_url: "https://example.com/video.mp4",
            }),
        });

        const result = await service.pollVideoCompletion("job-123", 5, 10); // Short interval

        expect(result.status).toBe("completed");
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("should timeout after max attempts", async () => {
        vi.useRealTimers(); // Use real timers for this test

        // Always return processing
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ job_id: "job-123", status: "processing" }),
        });

        // Use very short intervals for testing
        await expect(
          service.pollVideoCompletion("job-123", 2, 10) // 2 attempts, 10ms interval
        ).rejects.toThrow("Video generation timed out");
      });
    });
  });
});
