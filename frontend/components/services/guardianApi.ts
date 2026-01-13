// 1. New Import Syntax (We import the Class, not the function)
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// --- TYPES ---
export interface AnalysisResult {
  id?: string;
  verdict: 'SAFE' | 'CAUTION' | 'DANGER' | 'UNKNOWN';
  score: number;
  tactic: string;
  explanation: string;
  timestamp?: string;
}

// --- CONFIG ---
const API_URL = "https://edge-guardian.michaelangelo41699.workers.dev/";

// --- ANALYZE FUNCTION ---
export const analyzeImage = async (imageUri: string): Promise<AnalysisResult> => {
  try {
    console.log("1. Original URI:", imageUri);

    // STEP 1: CREATE CONTEXT
    // The new API uses a "Context" builder pattern
    const context = ImageManipulator.manipulate(imageUri);

    // STEP 2: ADD ACTIONS
    // Resize to 800px width (prevents 500 Error / Token Limit)
    context.resize({ width: 400 });

    // STEP 3: RENDER & SAVE
    // We render the changes, then save with specific options
    const imageRef = await context.renderAsync();
    const saveResult = await imageRef.saveAsync({
        compress: 0.3,
        format: SaveFormat.JPEG,
        base64: true // <--- MAGIC: This generates the string for us!
    });

    // Check if base64 was generated
    if (!saveResult.base64) {
        throw new Error("Failed to generate Base64 string from image");
    }

    console.log("2. Payload Size:", saveResult.base64.length); 

    // STEP 4: SEND TO CLOUDFLARE
    console.log("3. Sending request...");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        image: saveResult.base64, // Use the directly generated string
        stream: false 
      })
    });

    console.log("4. Response Status:", response.status);
    const text = await response.text();
    
    // STEP 5: PARSE JSON
    try {
        const data = JSON.parse(text);
        return data;
    } catch (e) {
        console.error("JSON Parse Error. Server sent:", text);
        throw new Error("Server returned invalid JSON. Check Backend logs.");
    }

  } catch (error: any) {
    console.error("ANALYSIS FAILED:", error.message);
    
    return { 
        verdict: "UNKNOWN", 
        score: 0, 
        tactic: "Analysis Error", 
        explanation: `Failed to process image: ${error.message}` 
    };
  }
};

// --- HISTORY FUNCTION ---
export const getHistory = async (): Promise<AnalysisResult[]> => {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error("History fetch failed");

    const history = await response.json();
    return Array.isArray(history) ? history : [];

  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
};