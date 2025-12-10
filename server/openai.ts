import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry from "p-retry";
import type { Script, ScriptType, Platform, Tone, InsertScript } from "@shared/schema";
import { randomUUID } from "crypto";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Helper function to check if error is rate limit or quota violation
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

const scriptTypes: ScriptType[] = ["product-demo", "founder-story", "skeptic-to-believer", "feature-highlight"];
const tones: Tone[] = ["excited", "casual", "informative", "persuasive"];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function estimateDuration(text: string): number {
  // Average speaking rate is about 150 words per minute = 2.5 words per second
  const wordCount = text.split(/\s+/).length;
  return Math.round(wordCount / 2.5);
}

interface GeneratedScript {
  hook: string;
  body: string;
  cta: string;
  type: ScriptType;
  tone: Tone;
}

export async function generateScripts(
  productFeatures: string,
  count: number,
  platforms: Platform[]
): Promise<InsertScript[]> {
  const limit = pLimit(2); // Process up to 2 requests concurrently
  const batchId = randomUUID();
  
  const prompt = `Generate ${count} unique UGC-style video scripts for Bearo, a crypto fintech app.

Product Features: ${productFeatures}

Requirements for each script:
- Length: 15-30 seconds when spoken (approximately 40-75 words total)
- Hook: Attention-grabbing opening line (5-15 words)
- Body: Main content explaining the benefit/feature (25-45 words)
- CTA: Clear call to action (5-15 words)
- Type: One of "product-demo", "founder-story", "skeptic-to-believer", "feature-highlight"
- Tone: One of "excited", "casual", "informative", "persuasive"

Make scripts feel authentic and casual like real user testimonials. Vary the types and tones across scripts.

Return a JSON object with a "scripts" key containing an array of script objects. Each object must have: "hook", "body", "cta", "type", and "tone" fields.`;

  const scripts: InsertScript[] = [];

  try {
    const response = await pRetry(
      async () => {
        try {
          // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
          const completion = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [{ role: "user", content: prompt }],
            max_completion_tokens: 4096,
            response_format: { type: "json_object" },
          });
          return completion;
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error;
          }
          throw new pRetry.AbortError(error);
        }
      },
      {
        retries: 5,
        minTimeout: 2000,
        maxTimeout: 60000,
        factor: 2,
      }
    );

    const content = response.choices[0]?.message?.content || "";
    let parsedScripts: GeneratedScript[] = [];

    try {
      const parsed = JSON.parse(content);
      // Handle both array and object wrapper formats
      if (Array.isArray(parsed)) {
        parsedScripts = parsed;
      } else if (parsed.scripts && Array.isArray(parsed.scripts)) {
        parsedScripts = parsed.scripts;
      } else {
        // Try to find any array property
        const arrayProp = Object.values(parsed).find(v => Array.isArray(v));
        parsedScripts = (arrayProp as GeneratedScript[]) || [];
      }
      
      if (parsedScripts.length === 0) {
        throw new Error("No scripts in response");
      }
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content, e);
      throw new Error("Failed to parse generated scripts");
    }

    for (let i = 0; i < parsedScripts.length; i++) {
      const script = parsedScripts[i];
      const platform = platforms[i % platforms.length];
      const fullText = `${script.hook} ${script.body} ${script.cta}`;
      
      scripts.push({
        hook: script.hook,
        body: script.body,
        cta: script.cta,
        type: script.type || getRandomElement(scriptTypes),
        platform,
        status: "pending",
        metadata: {
          characterCount: fullText.length,
          estimatedDuration: estimateDuration(fullText),
          tone: script.tone || getRandomElement(tones),
          wordCount: fullText.split(/\s+/).length,
        },
        generatedBatch: batchId,
      });
    }
  } catch (error) {
    console.error("Error generating scripts:", error);
    throw error;
  }

  return scripts;
}
