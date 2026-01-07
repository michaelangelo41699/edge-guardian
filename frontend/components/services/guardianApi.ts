import * as FileSystem from 'expo-file-system/legacy';

// Type definition for the Guardian API response
interface GuardianApiResponse {
  response?: string;
  safe?: boolean;
  confidence?: number;
  threats?: string[];
}

// --- STREAMING VERSION (The "Hero" Function) ---
export const analyzeImageStream = async (
  imageUri: string,
  onChunk: (text: string) => void
): Promise<void> => {
  try {
    // 1. Read the image file as base64 (No conversion needed!)
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // 2. Send JSON payload (Matching your Backend)
    const response = await fetch("https://edge-guardian.michaelangelo41699.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json" // <--- CHANGED from octet-stream
      },
      body: JSON.stringify({
        image: base64,
        prompt: "Analyze the psychological marketing tactics in this image. Be concise but deep.",
        stream: true // Enable streaming for real-time display
      })
    });

    if (!response.ok) throw new Error(`Server Error: ${response.status}`);
    if (!response.body) throw new Error("No response body to stream");

    // Stream reader loop for real-time word-by-word display
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const jsonStr = line.replace('data: ', '').trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);
                if (data.response) {
                  onChunk(data.response);
                }
              }
            } catch (e) {
              console.log('Stream parse error (ignorable):', e);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error("Stream failed:", error);
    throw error;
  }
};

// --- NON-STREAMING VERSION (Backup) ---
export const analyzeImage = async (imageUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    const response = await fetch("https://edge-guardian.michaelangelo41699.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64,
        prompt: "Analyze this image.",
        stream: false // Disable streaming
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.response || "No analysis returned.";

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const getHistory = async (): Promise<any[]> => {
  try {
    const response = await fetch("https://edge-guardian.michaelangelo41699.workers.dev/", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }

    const history = await response.json();
    return Array.isArray(history) ? history : [];

  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
};