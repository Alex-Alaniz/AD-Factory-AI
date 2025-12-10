import { z } from "zod";

// Script types for UGC content
export const scriptTypes = ["product-demo", "founder-story", "skeptic-to-believer", "feature-highlight"] as const;
export type ScriptType = typeof scriptTypes[number];

// Platforms for content distribution
export const platforms = ["twitter", "tiktok", "instagram"] as const;
export type Platform = typeof platforms[number];

// Script status for tracking
export const scriptStatuses = ["pending", "used", "archived"] as const;
export type ScriptStatus = typeof scriptStatuses[number];

// Video generation status
export const videoStatuses = ["none", "pending", "generating", "complete", "failed"] as const;
export type VideoStatus = typeof videoStatuses[number];

// Tone types for scripts
export const tones = ["excited", "casual", "informative", "persuasive"] as const;
export type Tone = typeof tones[number];

// Script metadata
export interface ScriptMetadata {
  characterCount: number;
  estimatedDuration: number; // in seconds
  tone: Tone;
  wordCount: number;
}

// Main Script interface
export interface Script {
  id: string;
  hook: string;
  body: string;
  cta: string;
  type: ScriptType;
  platform: Platform;
  status: ScriptStatus;
  metadata: ScriptMetadata;
  createdAt: string;
  generatedBatch: string; // batch ID for grouping scripts generated together
  // Video generation fields
  videoStatus: VideoStatus;
  videoUrl: string | null;
  videoJobId: string | null;
}

// Insert schema for creating a new script
export const insertScriptSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  cta: z.string().min(1),
  type: z.enum(scriptTypes),
  platform: z.enum(platforms),
  status: z.enum(scriptStatuses).default("pending"),
  metadata: z.object({
    characterCount: z.number(),
    estimatedDuration: z.number(),
    tone: z.enum(tones),
    wordCount: z.number(),
  }),
  generatedBatch: z.string(),
  videoStatus: z.enum(videoStatuses).default("none"),
  videoUrl: z.string().nullable().default(null),
  videoJobId: z.string().nullable().default(null),
});

export type InsertScript = z.infer<typeof insertScriptSchema>;

// Video generation provider
export const videoProviders = ["arcads", "wav2lip"] as const;
export type VideoProvider = typeof videoProviders[number];

// Settings interface
export interface Settings {
  adminEmail: string;
  dailyScriptCount: number;
  autoGenerateEnabled: boolean;
  productFeatures: string;
  lastUpdated: string;
  // Arcads integration (API key stored as secret, not here)
  arcadsAvatarId: string;
  autoGenerateVideos: boolean;
  // Wav2Lip integration
  wav2lipApiUrl: string; // Self-hosted Wav2Lip API endpoint URL
  wav2lipAvatarImageUrl: string; // URL to avatar image for lip-sync
  wav2lipEnabled: boolean; // Whether to use Wav2Lip for video generation
  preferredVideoProvider: VideoProvider; // Which provider to use for auto-generation
}

// Insert schema for settings
export const insertSettingsSchema = z.object({
  adminEmail: z.string().email().or(z.literal("")),
  dailyScriptCount: z.number().min(1).max(20).default(8),
  autoGenerateEnabled: z.boolean().default(true),
  productFeatures: z.string().default(""),
  arcadsAvatarId: z.string().default(""),
  autoGenerateVideos: z.boolean().default(false),
  wav2lipApiUrl: z.string().default(""),
  wav2lipAvatarImageUrl: z.string().default(""),
  wav2lipEnabled: z.boolean().default(false),
  preferredVideoProvider: z.enum(videoProviders).default("arcads"),
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Generation request interface
export interface GenerationRequest {
  productFeatures: string;
  count: number;
  platforms: Platform[];
}

// API Response types
export interface ScriptGenerationResponse {
  success: boolean;
  scripts: Script[];
  batchId: string;
  message?: string;
}

export interface DashboardStats {
  totalScripts: number;
  pendingScripts: number;
  usedScripts: number;
  archivedScripts: number;
  scriptsToday: number;
  lastGeneration: string | null;
  videosGenerating: number;
  videosComplete: number;
}

// Email notification data
export interface EmailNotificationData {
  scriptsGenerated: number;
  topHooks: string[];
  dashboardUrl: string;
  generatedAt: string;
}

// Arcads API types
export interface ArcadsVideoRequest {
  script: string;
  avatarId: string;
}

export interface ArcadsVideoResponse {
  jobId: string;
  status: string;
  videoUrl?: string;
}

// Wav2Lip API types
export interface Wav2LipVideoRequest {
  scriptText: string;
  avatarImageUrl: string;
  voiceId?: string; // Optional voice selection for TTS
}

export interface Wav2LipVideoResponse {
  jobId: string;
  status: "pending" | "processing" | "complete" | "failed";
  videoUrl?: string;
  error?: string;
}

// Keep legacy user schema for compatibility
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export interface User {
  id: string;
  username: string;
  password: string;
}
