import { DurableObject } from "cloudflare:workers";

export interface Env {
  AI: Ai;
  GUARDIAN_SESSION: DurableObjectNamespace;
}

// Helper: Ensure base64 string has proper data URI format
// Cloudflare AI requires data URIs like: data:image/jpeg;base64,<data>
function ensureDataURI(base64: string): string {
  // Remove whitespace first
  const cleaned = base64.replace(/\s/g, "");

  // If it already has a data URI prefix, return as-is
  if (cleaned.startsWith("data:image/")) {
    return cleaned;
  }

  // Otherwise, add the JPEG data URI prefix (default for most images)
  return `data:image/jpeg;base64,${cleaned}`;
}

// ==========================================
// WORKER
// ==========================================
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const id = env.GUARDIAN_SESSION.idFromName("global-demo-user");
    const stub = env.GUARDIAN_SESSION.get(id);
    return stub.fetch(request);
  }
} satisfies ExportedHandler<Env>;

// ==========================================
// DURABLE OBJECT
// ==========================================
export class GuardianSession extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "GET") {
      const history = await this.ctx.storage.list({ reverse: true, limit: 10 });
      return new Response(JSON.stringify(Array.from(history.values())), { headers: corsHeaders });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json() as any;

        // Validate input
        if (!body.image || typeof body.image !== 'string') {
          throw new Error("Missing or invalid 'image' field in request body. Expected base64 string.");
        }

        // --- STEP 1: ENSURE DATA URI FORMAT ---
        // Cloudflare AI requires base64 data URIs: data:image/jpeg;base64,<data>
        const imageDataURI = ensureDataURI(body.image);

        // --- STEP 2: RUN AI (STRICT JSON PROMPT) ---
        const input = {
          messages: [
            {
              role: "system",
              content: "You are a JSON-only API. Output ONLY valid JSON. No explanations, no paragraphs, no markdown. Just raw JSON."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `TASK: Analyze image for manipulation tactics.

OUTPUT: Return ONLY this JSON structure (NO other text):
{"verdict":"SAFE|CAUTION|DANGER","score":0-100,"tactic":"type","explanation":"brief description"}

EXAMPLES:
Safe image: {"verdict":"SAFE","score":10,"tactic":"None","explanation":"Regular social media post with no manipulation"}
Suspicious: {"verdict":"CAUTION","score":65,"tactic":"Misleading Context","explanation":"Image taken out of original context"}
Dangerous: {"verdict":"DANGER","score":95,"tactic":"Fear Mongering","explanation":"Sensationalist headline with no credible source"}

RULES:
- verdict: Must be exactly "SAFE", "CAUTION", or "DANGER"
- score: Number from 0-100
- tactic: Short phrase (2-4 words)
- explanation: One brief sentence only

CRITICAL: Your response must be ONLY the JSON object. Do not include any other text before or after.

JSON response for this image:`
                },
                {
                    type: "image_url",
                    image_url: {
                      url: imageDataURI // Base64 data URI required by Cloudflare AI
                    }
                }
              ]
            }
          ]
        };

        const aiResponse = await this.env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", input);

        // --- STEP 3: PARSE RESPONSE (ROBUST EXTRACTION) ---
        let resultObj;

        const r = aiResponse as any;
        console.log("AI Raw Response Type:", typeof r, "Has .response:", !!r?.response);
        console.log("AI Raw Response:", JSON.stringify(r, null, 2));

        // Handle different response formats
        let rawData = r.response || r;

        // If it's already an object with the right structure, use it directly
        if (typeof rawData === 'object' && rawData !== null && 'verdict' in rawData) {
          console.log("AI returned structured object directly");
          resultObj = rawData;
        } else {
          // It's a string, need to parse it
          const rawText = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
          console.log("AI returned text, parsing:", rawText.substring(0, 200));

          // Clean the response (remove markdown, code blocks, extra text)
          let cleanText = rawText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

          // Try to extract JSON if AI added extra text
          const jsonMatch = cleanText.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            cleanText = jsonMatch[0];
            console.log("Extracted JSON from text:", cleanText);
          }

          try {
            resultObj = JSON.parse(cleanText);
          } catch (e) {
            console.error("JSON PARSE FAILED. Raw text:", rawText.substring(0, 500));
            console.error("Parse error:", e);

            // Fallback: Return a caution result
            resultObj = {
              verdict: "CAUTION",
              score: 50,
              tactic: "AI Response Error",
              explanation: "Unable to analyze image properly. Please try again."
            };
          }
        }

        // Validate and normalize the result
        try {
          // Ensure all required fields exist
          if (!resultObj.verdict || !resultObj.tactic || !resultObj.explanation) {
            throw new Error("Missing required fields in AI response");
          }

          // Normalize verdict to valid values
          const validVerdicts = ['SAFE', 'CAUTION', 'DANGER'];
          if (!validVerdicts.includes(resultObj.verdict.toUpperCase())) {
            console.log("Invalid verdict:", resultObj.verdict, "defaulting to CAUTION");
            resultObj.verdict = 'CAUTION';
          } else {
            resultObj.verdict = resultObj.verdict.toUpperCase();
          }

          // Ensure score is a number between 0-100
          resultObj.score = Math.max(0, Math.min(100, Number(resultObj.score) || 50));

          console.log("Final validated result:", JSON.stringify(resultObj));

        } catch (e) {
          console.error("Validation failed:", e);
          resultObj = {
            verdict: "CAUTION",
            score: 50,
            tactic: "Validation Error",
            explanation: "Unable to validate analysis results."
          };
        }

        // --- STEP 4: SAVE ---
        const scanId = `scan_${Date.now()}`;
        const record = {
            id: scanId,
            timestamp: new Date().toISOString(),
            verdict: resultObj.verdict || "UNKNOWN",
            score: resultObj.score || 0,
            tactic: resultObj.tactic || "Unknown",
            explanation: resultObj.explanation || "No details."
        };
        
        await this.ctx.storage.put(scanId, record);

        return new Response(JSON.stringify(record), { headers: corsHeaders });

      } catch (err: any) {
        console.error("BACKEND ERROR:", err);
        console.error("Error stack:", err.stack);
        // We return 200 so the app shows the error card instead of crashing
        return new Response(JSON.stringify({
            error: err.message || "Unknown error",
            errorCode: err.code || "UNKNOWN",
            verdict: "UNKNOWN",
            score: 0,
            tactic: "Error",
            explanation: err.message || "An unexpected error occurred"
        }), { status: 200, headers: corsHeaders });
      }
    }
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
}