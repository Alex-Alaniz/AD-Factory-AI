import type { Script, ArcadsVideoResponse } from "@shared/schema";

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

export class ArcadsService {
  private apiKey: string;
  private avatarId: string;

  constructor(apiKey: string, avatarId: string = "default") {
    this.apiKey = apiKey;
    this.avatarId = avatarId;
  }

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

export function createArcadsService(apiKey: string, avatarId: string): ArcadsService | null {
  if (!apiKey) {
    return null;
  }
  return new ArcadsService(apiKey, avatarId);
}
