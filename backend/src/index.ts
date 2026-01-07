 import { DurableObject } from "cloudflare:workers";

  export interface Env {
    AI: Ai;
    GUARDIAN_SESSION: DurableObjectNamespace;
  }

  interface AnalysisRequest {
    image: string;
    prompt?: string;
    stream?: boolean;
  }

  // ==========================================
  // WORKER: Routes requests to Durable Object
  // ==========================================
  export default {
    async fetch(request: Request, env: Env): Promise<Response> {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // Get or create user session (using "global-demo-user" for now)
      // In production, use actual user ID: const userId = request.headers.get("user-id")
      const id = env.GUARDIAN_SESSION.idFromName("global-demo-user");
      const stub = env.GUARDIAN_SESSION.get(id);

      // Forward request to Durable Object
      return stub.fetch(request);
    }
  } satisfies ExportedHandler<Env>;

  // ==========================================
  // DURABLE OBJECT: Handles AI + History
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
      };

      // --- GET HISTORY ---
      if (request.method === "GET") {
        const history = await this.ctx.storage.list({ reverse: true, limit: 20 });
        const historyArray = Array.from(history.values());

        return new Response(JSON.stringify(historyArray), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // --- ANALYZE IMAGE ---
      if (request.method === "POST") {
        try {
          const body = await request.json() as AnalysisRequest;
          const { image, prompt, stream } = body;

          if (!image) {
            return new Response(JSON.stringify({ error: "Missing image" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const defaultPrompt = prompt || "Analyze this screenshot. You are Edge-Guardian. What psychological marketing tactics are being used here to influence me? What could be the truth on statements made in the image and how could it possibly influence my thoughts or actions? Be detailed in your analysis.";

          const input = {
            prompt: defaultPrompt,
            image: image, // Already base64 from frontend
            max_tokens: 512,
            stream: stream !== false, // Default to streaming
          };

          // Run AI model
          const response = await this.env.AI.run(
            "@cf/meta/llama-3.2-11b-vision-instruct",
            input
          );

          // --- STREAMING RESPONSE ---
          if (stream !== false && response instanceof ReadableStream) {
            // Save to history after streaming completes
            // We'll capture the full response by tee-ing the stream
            const [stream1, stream2] = response.tee();

            // Save in background
            this.saveStreamToHistory(stream2, defaultPrompt);

            return new Response(stream1, {
              headers: {
                ...corsHeaders,
                "content-type": "text/event-stream",
                "cache-control": "no-cache",
                "connection": "keep-alive",
              },
            });
          }

          // --- NON-STREAMING RESPONSE ---
          const result = response as any;
          const analysisText = result.response || JSON.stringify(result);

          // Save to history
          const scanId = `scan_${Date.now()}`;
          const record = {
            id: scanId,
            timestamp: new Date().toISOString(),
            prompt: defaultPrompt,
            analysis: analysisText,
          };

          await this.ctx.storage.put(scanId, record);

          return new Response(JSON.stringify({ response: analysisText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (err: any) {
          console.error("Analysis error:", err);
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Helper: Save streamed response to history
    private async saveStreamToHistory(stream: ReadableStream, prompt: string) {
      try {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const jsonStr = line.replace('data: ', '').trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  if (data.response) {
                    fullText += data.response;
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        // Save complete analysis to history
        const scanId = `scan_${Date.now()}`;
        const record = {
          id: scanId,
          timestamp: new Date().toISOString(),
          prompt: prompt,
          analysis: fullText,
        };

        await this.ctx.storage.put(scanId, record);
      } catch (err) {
        console.error("Failed to save stream to history:", err);
      }
    }
  }
