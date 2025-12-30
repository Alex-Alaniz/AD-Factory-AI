/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./test-utils";
import { ScriptCard } from "../components/script-card";
import type { Script } from "@shared/schema";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockScript: Script = {
  id: "test-script-1",
  hook: "Stop scrolling and watch this",
  body: "This is the main body of the script that explains the product features in detail.",
  cta: "Download the app now!",
  type: "product-demo",
  platform: "tiktok",
  status: "pending",
  videoStatus: "none",
  videoUrl: null,
  videoJobId: null,
  metadata: {
    characterCount: 150,
    estimatedDuration: 30,
    tone: "excited",
    wordCount: 25,
  },
  generatedBatch: "batch-1",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("ScriptCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API responses for status endpoints
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/arcads/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: false }),
        });
      }
      if (url.includes("/api/wav2lip/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ configured: false, enabled: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it("should render script content", () => {
    renderWithProviders(<ScriptCard script={mockScript} />);

    expect(screen.getByText("Stop scrolling and watch this")).toBeInTheDocument();
    expect(screen.getByText(/This is the main body/)).toBeInTheDocument();
    expect(screen.getByText("Download the app now!")).toBeInTheDocument();
  });

  it("should display script type badge", () => {
    renderWithProviders(<ScriptCard script={mockScript} />);

    expect(screen.getByText("Product Demo")).toBeInTheDocument();
  });

  it("should display platform badge", () => {
    renderWithProviders(<ScriptCard script={mockScript} />);

    expect(screen.getByText("Tiktok")).toBeInTheDocument();
  });

  it("should display status badge", () => {
    renderWithProviders(<ScriptCard script={mockScript} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("should display metadata", () => {
    renderWithProviders(<ScriptCard script={mockScript} />);

    expect(screen.getByText("30s")).toBeInTheDocument();
    expect(screen.getByText("150 chars")).toBeInTheDocument();
  });

  it("should show Copied text after clicking copy button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScriptCard script={mockScript} />);

    const copyButton = screen.getByTestId(`button-copy-${mockScript.id}`);
    await user.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });

  it("should have correct test ids", () => {
    renderWithProviders(<ScriptCard script={mockScript} />);

    expect(screen.getByTestId(`card-script-${mockScript.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`text-hook-${mockScript.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`text-body-${mockScript.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`text-cta-${mockScript.id}`)).toBeInTheDocument();
  });

  describe("video status", () => {
    it("should show View Video button when video is complete", () => {
      const scriptWithVideo: Script = {
        ...mockScript,
        videoStatus: "complete",
        videoUrl: "https://example.com/video.mp4",
      };

      renderWithProviders(<ScriptCard script={scriptWithVideo} />);

      expect(screen.getByTestId(`button-view-video-${mockScript.id}`)).toBeInTheDocument();
      expect(screen.getByText("View Video")).toBeInTheDocument();
    });

    it("should show Queued badge when video is pending", () => {
      const scriptPending: Script = {
        ...mockScript,
        videoStatus: "pending",
      };

      renderWithProviders(<ScriptCard script={scriptPending} />);

      expect(screen.getByText("Queued")).toBeInTheDocument();
    });

    it("should show Generating badge when video is generating", () => {
      const scriptGenerating: Script = {
        ...mockScript,
        videoStatus: "generating",
      };

      renderWithProviders(<ScriptCard script={scriptGenerating} />);

      expect(screen.getByText("Generating")).toBeInTheDocument();
    });

    it("should show Failed badge when video generation failed", () => {
      const scriptFailed: Script = {
        ...mockScript,
        videoStatus: "failed",
      };

      renderWithProviders(<ScriptCard script={scriptFailed} />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });

  describe("different platforms", () => {
    it("should display Twitter platform correctly", () => {
      const twitterScript: Script = {
        ...mockScript,
        platform: "twitter",
      };

      renderWithProviders(<ScriptCard script={twitterScript} />);

      expect(screen.getByText("Twitter")).toBeInTheDocument();
    });

    it("should display Instagram platform correctly", () => {
      const instagramScript: Script = {
        ...mockScript,
        platform: "instagram",
      };

      renderWithProviders(<ScriptCard script={instagramScript} />);

      expect(screen.getByText("Instagram")).toBeInTheDocument();
    });
  });

  describe("different statuses", () => {
    it("should display Used status correctly", () => {
      const usedScript: Script = {
        ...mockScript,
        status: "used",
      };

      renderWithProviders(<ScriptCard script={usedScript} />);

      expect(screen.getByText("Used")).toBeInTheDocument();
    });

    it("should display Archived status correctly", () => {
      const archivedScript: Script = {
        ...mockScript,
        status: "archived",
      };

      renderWithProviders(<ScriptCard script={archivedScript} />);

      expect(screen.getByText("Archived")).toBeInTheDocument();
    });
  });
});
