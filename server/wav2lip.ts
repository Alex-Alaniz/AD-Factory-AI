import type { Script, Wav2LipVideoResponse } from "@shared/schema";
import OpenAI from "openai";

export interface Wav2LipService {
  generateVideo(script: Script, avatarImageUrl: string): Promise<Wav2LipVideoResponse>;
  checkVideoStatus(jobId: string): Promise<Wav2LipVideoResponse>;
  pollVideoCompletion(jobId: string): Promise<Wav2LipVideoResponse>;
}

const POLL_INTERVAL = 10000; // 10 seconds
const MAX_POLL_ATTEMPTS = 60; // 10 minutes max

export function createWav2LipService(apiUrl: string, openaiClient?: OpenAI): Wav2LipService | null {
  if (!apiUrl) {
    console.log("Wav2Lip API URL not configured");
    return null;
  }

  async function textToSpeech(text: string): Promise<Buffer | null> {
    if (!openaiClient) {
      console.log("OpenAI client not available for TTS");
      return null;
    }

    try {
      const response = await openaiClient.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
        response_format: "mp3",
      });

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("TTS generation failed:", error);
      return null;
    }
  }

  async function generateVideo(script: Script, avatarImageUrl: string): Promise<Wav2LipVideoResponse> {
    const fullText = `${script.hook} ${script.body} ${script.cta}`;
    
    const audioBuffer = await textToSpeech(fullText);
    if (!audioBuffer) {
      throw new Error("Failed to generate audio from script text");
    }

    const formData = new FormData();
    formData.append("audio", new Blob([audioBuffer], { type: "audio/mp3" }), "speech.mp3");
    formData.append("image_url", avatarImageUrl);
    formData.append("script_id", script.id);

    const response = await fetch(`${apiUrl}/generate`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wav2Lip API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      jobId: data.job_id || data.jobId,
      status: data.status || "pending",
      videoUrl: data.video_url || data.videoUrl,
    };
  }

  async function checkVideoStatus(jobId: string): Promise<Wav2LipVideoResponse> {
    const response = await fetch(`${apiUrl}/status/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Wav2Lip status check failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      jobId,
      status: data.status,
      videoUrl: data.video_url || data.videoUrl,
      error: data.error,
    };
  }

  async function pollVideoCompletion(jobId: string): Promise<Wav2LipVideoResponse> {
    let attempts = 0;
    
    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      
      try {
        const status = await checkVideoStatus(jobId);
        
        if (status.status === "complete") {
          return status;
        }
        
        if (status.status === "failed") {
          throw new Error(status.error || "Video generation failed");
        }
        
        attempts++;
      } catch (error) {
        console.error(`Poll attempt ${attempts} failed:`, error);
        attempts++;
      }
    }
    
    throw new Error("Video generation timed out");
  }

  return {
    generateVideo,
    checkVideoStatus,
    pollVideoCompletion,
  };
}

export function getOpenAIClient(): OpenAI | null {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!baseUrl || !apiKey) {
    console.log("OpenAI credentials not available");
    return null;
  }

  return new OpenAI({
    baseURL: baseUrl,
    apiKey: apiKey,
  });
}
