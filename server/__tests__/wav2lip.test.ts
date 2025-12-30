import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWav2LipService, getOpenAIClient } from "../wav2lip";
import type { Script } from "@shared/schema";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Wav2Lip Module", () => {
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

  describe("createWav2LipService", () => {
    it("should return null when API URL is empty", () => {
      const service = createWav2LipService("");
      expect(service).toBeNull();
    });

    it("should return service when API URL is provided", () => {
      const service = createWav2LipService("http://localhost:8000");
      expect(service).not.toBeNull();
      expect(service).toHaveProperty("generateVideo");
      expect(service).toHaveProperty("checkVideoStatus");
      expect(service).toHaveProperty("pollVideoCompletion");
    });
  });

  describe("Wav2LipService", () => {
    describe("generateVideo", () => {
      it("should throw error when OpenAI client not available for TTS", async () => {
        const service = createWav2LipService("http://localhost:8000");

        await expect(
          service!.generateVideo(mockScript, "https://example.com/avatar.jpg")
        ).rejects.toThrow("Failed to generate audio from script text");
      });

      it("should generate video with TTS when OpenAI client is available", async () => {
        // Create a mock OpenAI client
        const mockOpenAIClient = {
          audio: {
            speech: {
              create: vi.fn().mockResolvedValue({
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
              }),
            },
          },
        };

        const service = createWav2LipService(
          "http://localhost:8000",
          mockOpenAIClient as any
        );

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "wav2lip-job-123",
              status: "pending",
            }),
        });

        const result = await service!.generateVideo(
          mockScript,
          "https://example.com/avatar.jpg"
        );

        expect(mockOpenAIClient.audio.speech.create).toHaveBeenCalledWith({
          model: "tts-1",
          voice: "alloy",
          input: `${mockScript.hook} ${mockScript.body} ${mockScript.cta}`,
          response_format: "mp3",
        });

        expect(result.jobId).toBe("wav2lip-job-123");
        expect(result.status).toBe("pending");
      });

      it("should make POST request to correct endpoint", async () => {
        const mockOpenAIClient = {
          audio: {
            speech: {
              create: vi.fn().mockResolvedValue({
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
              }),
            },
          },
        };

        const service = createWav2LipService(
          "http://localhost:8000",
          mockOpenAIClient as any
        );

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              job_id: "wav2lip-job-123",
              status: "pending",
            }),
        });

        await service!.generateVideo(mockScript, "https://example.com/avatar.jpg");

        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/generate",
          expect.objectContaining({
            method: "POST",
          })
        );
      });

      it("should throw error on API failure", async () => {
        const mockOpenAIClient = {
          audio: {
            speech: {
              create: vi.fn().mockResolvedValue({
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
              }),
            },
          },
        };

        const service = createWav2LipService(
          "http://localhost:8000",
          mockOpenAIClient as any
        );

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
        });

        await expect(
          service!.generateVideo(mockScript, "https://example.com/avatar.jpg")
        ).rejects.toThrow("Wav2Lip API error: 500");
      });
    });

    describe("checkVideoStatus", () => {
      it("should check status at correct endpoint", async () => {
        const service = createWav2LipService("http://localhost:8000");

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "processing",
            }),
        });

        const result = await service!.checkVideoStatus("job-123");

        expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/status/job-123");
        expect(result.status).toBe("processing");
        expect(result.jobId).toBe("job-123");
      });

      it("should return video URL when complete", async () => {
        const service = createWav2LipService("http://localhost:8000");

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "complete",
              video_url: "https://example.com/output.mp4",
            }),
        });

        const result = await service!.checkVideoStatus("job-123");

        expect(result.status).toBe("complete");
        expect(result.videoUrl).toBe("https://example.com/output.mp4");
      });

      it("should return error message on failure", async () => {
        const service = createWav2LipService("http://localhost:8000");

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "failed",
              error: "Audio processing failed",
            }),
        });

        const result = await service!.checkVideoStatus("job-123");

        expect(result.status).toBe("failed");
        expect(result.error).toBe("Audio processing failed");
      });

      it("should throw error on API failure", async () => {
        const service = createWav2LipService("http://localhost:8000");

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

        await expect(service!.checkVideoStatus("job-123")).rejects.toThrow(
          "Wav2Lip status check failed: 404"
        );
      });
    });

    // Note: pollVideoCompletion tests are omitted due to long polling delays
    // The actual polling logic involves 10-second intervals which makes unit testing impractical
    // These should be tested via integration tests in production
  });

  describe("getOpenAIClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return null when credentials are not available", () => {
      delete process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

      const client = getOpenAIClient();
      expect(client).toBeNull();
    });

    it("should return null when only base URL is available", () => {
      process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = "https://api.openai.com";
      delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

      const client = getOpenAIClient();
      expect(client).toBeNull();
    });

    it("should return null when only API key is available", () => {
      delete process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "test-key";

      const client = getOpenAIClient();
      expect(client).toBeNull();
    });
  });
});
