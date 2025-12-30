/**
 * Arcads.ai video generation service integration.
 * Provides AI-powered avatar video creation from text scripts.
 * @module arcads
 */

import type { Script, ArcadsVideoResponse } from "@shared/schema";

/** Base URL for the Arcads API */
const ARCADS_API_BASE = "https://api.arcads.ai/v1";

interface ArcadsGenerateRequest {
  script: string;
  avatar_id: string;
  voice_settings?: {
    speed?: number;
    pitch?: number;
  };
  webhook_url?: string;
}

interface ArcadsStatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  error?: string;
}

/**
 * Service for interacting with the Arcads.ai video generation API.
 * Handles video creation and status polling.
 */
export class ArcadsService {
  private apiKey: string;
  private avatarId: string;

  /**
   * Creates an Arcads service instance.
   * @param apiKey - Arcads API key for authentication
   * @param avatarId - ID of the avatar to use for video generation
   */
  constructor(apiKey: string, avatarId: string = "default") {
    this.apiKey = apiKey;
    this.avatarId = avatarId;
  }

  /**
   * Initiates video generation for a script.
   * @param script - The script to generate a video for
   * @returns Response with job ID and initial status
   * @throws Error if API key is not configured or API call fails
   */
  async generateVideo(script: Script): Promise<ArcadsVideoResponse> {
    if (!this.apiKey) {
      throw new Error("Arcads API key not configured");
    }

    const fullScript = `${script.hook} ${script.body} ${script.cta}`;
    
    const requestBody: ArcadsGenerateRequest = {
      script: fullScript,
      avatar_id: this.avatarId,
      voice_settings: {
        speed: 1.0,
        pitch: 1.0,
      },
    };

    try {
      const response = await fetch(`${ARCADS_API_BASE}/videos/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Arcads API error:", response.status, errorText);
        throw new Error(`Arcads API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        jobId: data.job_id || data.id,
        status: data.status || "pending",
        videoUrl: data.video_url,
      };
    } catch (error) {
      console.error("Failed to generate video:", error);
      throw error;
    }
  }

  /**
   * Checks the current status of a video generation job.
   * @param jobId - The job ID returned from generateVideo
   * @returns Current status and video URL if complete
   * @throws Error if API key is not configured or API call fails
   */
  async checkVideoStatus(jobId: string): Promise<ArcadsVideoResponse> {
    if (!this.apiKey) {
      throw new Error("Arcads API key not configured");
    }

    try {
      const response = await fetch(`${ARCADS_API_BASE}/videos/status/${jobId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Arcads status check error:", response.status, errorText);
        throw new Error(`Arcads API error: ${response.status}`);
      }

      const data: ArcadsStatusResponse = await response.json();
      
      return {
        jobId: data.job_id,
        status: data.status,
        videoUrl: data.video_url,
      };
    } catch (error) {
      console.error("Failed to check video status:", error);
      throw error;
    }
  }

  /**
   * Polls for video completion with configurable timeout.
   * @param jobId - The job ID to poll
   * @param maxAttempts - Maximum number of poll attempts (default: 30)
   * @param intervalMs - Delay between polls in milliseconds (default: 10000)
   * @returns Final status with video URL
   * @throws Error if video generation fails or times out
   */
  async pollVideoCompletion(
    jobId: string,
    maxAttempts: number = 30,
    intervalMs: number = 10000
  ): Promise<ArcadsVideoResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.checkVideoStatus(jobId);
      
      if (status.status === "completed" && status.videoUrl) {
        return status;
      }
      
      if (status.status === "failed") {
        throw new Error("Video generation failed");
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error("Video generation timed out");
  }
}

/**
 * Factory function to create an Arcads service instance.
 * Returns null if API key is not provided.
 * @param apiKey - Arcads API key
 * @param avatarId - Avatar ID for video generation
 * @returns ArcadsService instance or null
 */
export function createArcadsService(apiKey: string, avatarId: string): ArcadsService | null {
  if (!apiKey) {
    return null;
  }
  return new ArcadsService(apiKey, avatarId);
}
