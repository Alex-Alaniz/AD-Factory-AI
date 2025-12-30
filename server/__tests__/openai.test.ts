import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to create the mock before imports
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

// Mock p-limit to just execute the function
vi.mock("p-limit", () => ({
  default: () => <T>(fn: () => T): T => fn(),
}));

// Mock p-retry to just execute the function
vi.mock("p-retry", () => {
  const pRetry = async <T>(fn: () => Promise<T>): Promise<T> => fn();
  (pRetry as any).AbortError = class AbortError extends Error {};
  return { default: pRetry };
});

// Import the module after mocking
import { generateScripts } from "../openai";

describe("OpenAI Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateScripts", () => {
    it("should generate scripts with valid response", async () => {
      const mockScripts = {
        scripts: [
          {
            hook: "This app is amazing!",
            body: "I've been using it for a week now.",
            cta: "Download it today!",
            type: "product-demo",
            tone: "excited",
          },
          {
            hook: "Changed my life!",
            body: "No more payment headaches.",
            cta: "Try it free!",
            type: "founder-story",
            tone: "casual",
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockScripts),
            },
          },
        ],
      });

      const result = await generateScripts("test features", 2, ["tiktok", "twitter"]);

      expect(result).toHaveLength(2);
      expect(result[0].hook).toBe("This app is amazing!");
      expect(result[1].hook).toBe("Changed my life!");
    });

    it("should assign platforms in round-robin fashion", async () => {
      const mockScripts = {
        scripts: [
          { hook: "Hook 1", body: "Body 1", cta: "CTA 1", type: "product-demo", tone: "excited" },
          { hook: "Hook 2", body: "Body 2", cta: "CTA 2", type: "product-demo", tone: "casual" },
          { hook: "Hook 3", body: "Body 3", cta: "CTA 3", type: "product-demo", tone: "informative" },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockScripts) } }],
      });

      const result = await generateScripts("test", 3, ["tiktok", "twitter"]);

      expect(result[0].platform).toBe("tiktok");
      expect(result[1].platform).toBe("twitter");
      expect(result[2].platform).toBe("tiktok");
    });

    it("should include metadata in generated scripts", async () => {
      const mockScripts = {
        scripts: [
          {
            hook: "Test Hook",
            body: "Test Body with some words here",
            cta: "Test CTA",
            type: "product-demo",
            tone: "excited",
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockScripts) } }],
      });

      const result = await generateScripts("test", 1, ["instagram"]);

      expect(result[0].metadata).toBeDefined();
      expect(result[0].metadata.characterCount).toBeGreaterThan(0);
      expect(result[0].metadata.wordCount).toBeGreaterThan(0);
      expect(result[0].metadata.estimatedDuration).toBeGreaterThan(0);
      expect(result[0].metadata.tone).toBe("excited");
    });

    it("should set status to pending for new scripts", async () => {
      const mockScripts = {
        scripts: [
          { hook: "Test", body: "Body", cta: "CTA", type: "product-demo", tone: "casual" },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockScripts) } }],
      });

      const result = await generateScripts("test", 1, ["tiktok"]);

      expect(result[0].status).toBe("pending");
    });

    it("should include batch ID for all scripts in a generation", async () => {
      const mockScripts = {
        scripts: [
          { hook: "Test 1", body: "Body 1", cta: "CTA 1", type: "product-demo", tone: "excited" },
          { hook: "Test 2", body: "Body 2", cta: "CTA 2", type: "founder-story", tone: "casual" },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockScripts) } }],
      });

      const result = await generateScripts("test", 2, ["tiktok"]);

      expect(result[0].generatedBatch).toBeDefined();
      expect(result[0].generatedBatch).toBe(result[1].generatedBatch);
    });

    it("should handle array response format", async () => {
      // Direct array format instead of { scripts: [...] }
      const mockScripts = [
        { hook: "Direct Array", body: "Body", cta: "CTA", type: "product-demo", tone: "excited" },
      ];

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockScripts) } }],
      });

      const result = await generateScripts("test", 1, ["tiktok"]);

      expect(result).toHaveLength(1);
      expect(result[0].hook).toBe("Direct Array");
    });

    it("should throw error on invalid JSON response", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "not valid json" } }],
      });

      await expect(generateScripts("test", 1, ["tiktok"])).rejects.toThrow(
        "Failed to parse generated scripts"
      );
    });

    it("should throw error when response has no scripts", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ scripts: [] }) } }],
      });

      await expect(generateScripts("test", 1, ["tiktok"])).rejects.toThrow(
        "Failed to parse generated scripts"
      );
    });

    it("should handle object with non-standard scripts key", async () => {
      const mockResponse = {
        generatedContent: [
          { hook: "Alt Key", body: "Body", cta: "CTA", type: "product-demo", tone: "excited" },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      const result = await generateScripts("test", 1, ["tiktok"]);

      expect(result).toHaveLength(1);
      expect(result[0].hook).toBe("Alt Key");
    });
  });

  describe("Helper Functions", () => {
    describe("estimateDuration", () => {
      it("should estimate duration based on word count (2.5 words/second)", async () => {
        const mockScripts = {
          scripts: [
            {
              hook: "One two three four five",
              body: "six seven eight nine ten",
              cta: "eleven twelve",
              type: "product-demo",
              tone: "casual",
            },
          ],
        };

        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockScripts) } }],
        });

        const result = await generateScripts("test", 1, ["tiktok"]);

        // 12 words / 2.5 words per second = ~5 seconds (rounded)
        expect(result[0].metadata.estimatedDuration).toBe(5);
      });
    });

    describe("character count", () => {
      it("should count total characters of full script", async () => {
        const mockScripts = {
          scripts: [
            {
              hook: "Hello",
              body: "World",
              cta: "Now",
              type: "product-demo",
              tone: "casual",
            },
          ],
        };

        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockScripts) } }],
        });

        const result = await generateScripts("test", 1, ["tiktok"]);

        // "Hello World Now" = 15 characters
        expect(result[0].metadata.characterCount).toBe(15);
      });
    });

    describe("word count", () => {
      it("should count words in full script", async () => {
        const mockScripts = {
          scripts: [
            {
              hook: "One two",
              body: "three four five",
              cta: "six",
              type: "product-demo",
              tone: "casual",
            },
          ],
        };

        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockScripts) } }],
        });

        const result = await generateScripts("test", 1, ["tiktok"]);

        expect(result[0].metadata.wordCount).toBe(6);
      });
    });
  });

  describe("Default values", () => {
    it("should use random type when not provided", async () => {
      const mockScripts = {
        scripts: [
          {
            hook: "Test",
            body: "Body",
            cta: "CTA",
            // No type provided
            tone: "casual",
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockScripts) } }],
      });

      const result = await generateScripts("test", 1, ["tiktok"]);

      expect(["product-demo", "founder-story", "skeptic-to-believer", "feature-highlight"]).toContain(
        result[0].type
      );
    });

    it("should use random tone when not provided", async () => {
      const mockScripts = {
        scripts: [
          {
            hook: "Test",
            body: "Body",
            cta: "CTA",
            type: "product-demo",
            // No tone provided
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockScripts) } }],
      });

      const result = await generateScripts("test", 1, ["tiktok"]);

      expect(["excited", "casual", "informative", "persuasive"]).toContain(
        result[0].metadata.tone
      );
    });
  });
});
