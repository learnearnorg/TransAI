
import { Modality, Type, GenerateContentResponse, ThinkingLevel, GoogleGenAI as _GoogleGenAI } from "@google/genai";
import { MODELS } from "../constants";
import { decodeBase64, decodeAudioData } from "./audioUtils";
import { ProfessionalField, LinguisticPersona, GlossaryItem, TranslationTone, SourceQualityReport, TranslationQualityReport, ComparisonReport, NPEReport, TranslationHistoryItem, LinguisticTerm, VerificationReport, SuggestedGlossaryItem, TranslationMemoryEntry, ProjectScope, ImprovementType, StyleGuide } from "../types";
import { generateId } from "../utils/id";

/**
 * Neural Congestion Controller
 * Serializes requests and manages global quota state.
 */
export const getApiKey = () => {
  // 1. Check Neural Secret Vault (preferred)
  try {
    const saved = localStorage.getItem('transai_secrets');
    if (saved) {
      const secrets = JSON.parse(saved);
      // Secrets is now an array: [{id, name, key, service}, ...]
      if (Array.isArray(secrets)) {
        const geminiSecret = secrets.find((s: any) => 
          s.service?.toLowerCase() === 'gemini' || 
          s.name?.toLowerCase().includes('gemini') ||
          s.name?.toLowerCase().includes('google')
        );
        if (geminiSecret && geminiSecret.key) {
          const val = geminiSecret.key.replace(/^["']|["']$/g, '').trim();
          if (val && val.length > 10 && val !== 'MY_GEMINI_API_KEY' && val !== 'YOUR_API_KEY' && !val.includes('...')) {
            return val;
          }
        }
      }
    }
  } catch (e) {}

  // 2. Check direct localStorage keys (fallbacks)
  const directKeys = ['GEMINI_API_KEY', 'API_KEY', 'GOOGLE_API_KEY', 'VITE_GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'];
  for (const k of directKeys) {
    try {
      const val = localStorage.getItem(k);
      if (val) {
        const cleaned = val.replace(/^["']|["']$/g, '').trim();
        if (cleaned && cleaned.length > 10 && !['MY_GEMINI_API_KEY', 'YOUR_API_KEY', 'AISTUDIO_PROXY_KEY', 'undefined', 'null', ''].includes(cleaned)) {
          return cleaned;
        }
      }
    } catch (e) {}
  }

  // 3. Check Vite Environment Variables (client-side build time)
  try {
    const viteKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (viteKey && viteKey.length > 10 && viteKey !== 'MY_GEMINI_API_KEY' && viteKey !== 'YOUR_API_KEY' && !viteKey.includes('...')) {
      return viteKey;
    }
  } catch (e) {}

  // 4. Check for Platform Key (AI Studio injection)
  if (typeof window !== 'undefined' && (window as any).aistudio?.apiKey) {
    return (window as any).aistudio.apiKey;
  }

  // 5. Environment Fallback (Proxy)
  return 'AISTUDIO_PROXY_KEY';
};

export function formatClientGeminiError(err: any): Error {
  if (!err) return new Error('Unknown error during neural processing.');
  
  let msg = '';
  let status = err.status || err.code || 500;
  
  // Extract initial message
  if (typeof err === 'string') {
    msg = err;
  } else if (err.message) {
    msg = err.message;
  } else {
    msg = err.toString();
  }

  // Helper to check if a string contains any of our key terms
  const containsDisruptionKeywords = (str: string) => {
    const s = str.toLowerCase();
    return s.includes('unrestricted') || 
           s.includes('disruption') || 
           s.includes('restrict your key') || 
           s.includes('permission_denied') ||
           s.includes('403') ||
           s.includes('forbidden');
  };

  let hasDisruption = containsDisruptionKeywords(msg) || containsDisruptionKeywords(err.toString()) || status === 403;

  // Try to parse JSON from the message if it contains JSON
  try {
    const firstBrace = msg.indexOf('{');
    const lastBrace = msg.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = msg.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed?.error?.message) {
        msg = parsed.error.message;
        if (parsed.error.code) status = parsed.error.code;
        if (containsDisruptionKeywords(msg)) {
          hasDisruption = true;
        }
      }
    }
  } catch (e) {
    // Keep original msg
  }

  if (hasDisruption) {
    const errorMsg = `Google API Key Disruption (403 Permission Denied): You are using an unrestricted Gemini API Key. Google is temporarily disrupting access as a preview of restriction enforcement. To restore functionality immediately, you must restrict your key in the Google Cloud Console. Follow these steps:
1. Open https://console.cloud.google.com/apis/credentials in your browser.
2. Select your API Key from the list.
3. Under "API restrictions", select "Restrict key".
4. Add "Generative Language API" (which powers Gemini) to the list of allowed APIs.
5. Save changes and wait 5-10 minutes for Google to sync.
Alternatively, generate a new restricted key inside Google AI Studio or use a properly restricted key.`;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('neural-disruption-alert', { detail: errorMsg }));
    }
    return new Error(errorMsg);
  }
  
  if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') || status === 400) {
    return new Error(`Neural Credentials Rejected: The provided Gemini API key is invalid or has expired. Please double-check it in settings or the Secret Vault.`);
  }

  if (status === 429 || msg.includes('quota') || msg.includes('QUOTA_EXCEEDED') || msg.includes('Rate limit')) {
    return new Error(`Quota Exceeded (429): The neural engine rate limit or daily quota has been exceeded. Please try again in a moment.`);
  }

  return new Error(msg || err.toString());
}

class NeuralQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minGap = 250; // ms between requests
  public isOnCooldown = false;
  private cooldownTimer: any = null;

  async add<T>(request: () => Promise<T>): Promise<T> {
    if (this.isOnCooldown) {
      throw new Error("NEURAL_COOLDOWN: Service is recovering from saturation. Please wait.");
    }

    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minGap) {
        await new Promise(r => setTimeout(r, this.minGap - timeSinceLast));
      }

      const request = this.queue.shift();
      if (request) {
        try {
          await request();
          this.lastRequestTime = Date.now();
        } catch (error: any) {
          if (error?.message?.includes('429')) {
            this.triggerCooldown();
          }
        }
      }
    }
    this.processing = false;
  }

  private triggerCooldown() {
    this.isOnCooldown = true;
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    this.cooldownTimer = setTimeout(() => {
      this.isOnCooldown = false;
    }, 30000); // 30s cooldown on saturation
  }
}

const neuralQueue = new NeuralQueue();

/**
 * Sanitizes output text by replacing <u> tags with Markdown italic signs (_).
 */
const sanitizeOutput = (text: any): string => {
  if (text === null || text === undefined) return "";
  if (typeof text !== 'string') return String(text);
  return text.replace(/<u>/g, '_').replace(/<\/u>/g, '_');
};

/**
 * Calculates cosine similarity between two vectors.
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Enhanced Safe Generator with Queue & Backoff
 */
export const safeGenerateContent = async (params: any, retries = 3, delay = 1000): Promise<any> => {
  return neuralQueue.add(async () => {
    try {
      const res = await fetch('/api/neural/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': getApiKey() || ''
        },
        body: JSON.stringify({
          model: params.model,
          contents: params.contents,
          config: params.config || params.generationConfig
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let msg = errorData.error || `AI Proxy Error: ${res.status}`;
        if (res.status === 403 || msg.includes('403') || msg.includes('unrestricted') || msg.includes('disruption') || msg.includes('PERMISSION_DENIED')) {
          const formattedErr = formatClientGeminiError(new Error(msg));
          throw formattedErr;
        }
        if (msg.includes('Not Found') || res.status === 404) {
           throw new Error("API Route Not Found. Dev server restarting or endpoint missing.");
        }
        if (res.status === 401) {
           throw new Error("Neural Auth Required: No API Key found. Open the 'Secret Vault' (Shield icon) to add one, or use platform settings (top-right gear).");
        }
        if (res.status === 500 && msg.includes('GEMINI_API_KEY')) {
           throw new Error("Neural Sync Error: Cloud configuration mismatch. Verify your Gemini key in settings.");
        }
        if (res.status === 400 && (errorData.error?.includes('API_KEY_INVALID') || msg.includes('API key not valid'))) {
           throw new Error("Neural Credentials Rejected: The Gemini key is invalid. Please double-check it in settings.");
        }
        if (errorData.message?.includes('API key not valid') || errorData.error?.includes('API key not valid')) {
           throw new Error("The provided Gemini API Key is invalid. Please verify it in Settings or the Secret Vault.");
        }
        throw new Error(msg);
      }

      const data = await res.json();
      return {
        ...data,
        response: {
          text: () => data.text
        }
      } as any;
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429');
      if (isRateLimit && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return safeGenerateContent(params, retries - 1, delay * 2);
      }
      if (error?.message?.includes('API key not valid')) {
        throw new Error("Invalid API Key provided. Please check your Gemini API key in Settings.");
      }
      throw error;
    }
  });
};

/**
 * Generates semantic embeddings for text.
 */
export const embedText = async (text: string): Promise<number[]> => {
  return neuralQueue.add(async () => {
    try {
      const res = await fetch('/api/neural/embed', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': getApiKey() || ''
        },
        body: JSON.stringify({
          model: MODELS.EMBEDDING,
          content: text
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData.error || `AI Embed Proxy Error: ${res.status}`;
        if (msg.includes('Not Found') || res.status === 404) {
           throw new Error("API Route Not Found. Dev server restarting or endpoint missing.");
        }
        if (res.status === 401) {
           throw new Error("Neural Auth Required (Embed): No API Key found. Use the 'Secret Vault' (Shield) or platform settings.");
        }
        if (res.status === 500 && msg.includes('GEMINI_API_KEY')) {
           throw new Error("Neural Sync Error (Embed): Cloud configuration mismatch. Check settings.");
        }
        if (res.status === 400 && (errorData.error?.includes('API_KEY_INVALID') || msg.includes('API key not valid'))) {
           throw new Error("Neural Credentials Rejected (Embed): The key is invalid. Verify in settings.");
        }
        if (errorData.message?.includes('API key not valid') || errorData.error?.includes('API key not valid')) {
           throw new Error("The Gemini API Key used for embedding is invalid. Please verify it in the AI Studio platform Settings or the app's Secret Vault.");
        }
        throw new Error(msg);
      }

      const data = await res.json();
      return data.embedding || [];
    } catch (error: any) {
      if (error?.message?.includes('API key not valid')) {
        throw new Error("Invalid API Key provided. Please check your Gemini API key in Settings.");
      }
      console.error("Embedding Error:", error);
      throw error;
    }
  });
};

/**
 * Neural Proxy for GoogleGenAI SDK
 * This allows using the standard SDK patterns while routing everything through our server-side proxy
 */
import { GoogleGenAI as OriginalGoogleGenAI } from '@google/genai';

export const GoogleGenAI = class extends OriginalGoogleGenAI {
  constructor(options: any) {
    let key = typeof options === 'string' ? options : options?.apiKey;
    let newOptions: any = typeof options === 'string' ? { apiKey: key } : { ...options };
    
    // If using the proxy key for free tier, route through our server
    if (key === 'AISTUDIO_PROXY_KEY') {
       newOptions.httpOptions = { 
         ...newOptions.httpOptions, 
         baseUrl: window.location.origin + '/api/proxy/google'
       };
    }
    super(newOptions);

    if (this.models) {
      (this as any).models = new Proxy(this.models, {
        get(target, prop, receiver) {
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return async function(this: any, ...args: any[]) {
              try {
                return await val.apply(target, args);
              } catch (err: any) {
                throw formatClientGeminiError(err);
              }
            };
          }
          return val;
        }
      });
    }

    if (this.live) {
      (this as any).live = new Proxy(this.live, {
        get(target, prop, receiver) {
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return function(this: any, ...args: any[]) {
              try {
                return val.apply(target, args);
              } catch (err: any) {
                throw formatClientGeminiError(err);
              }
            };
          }
          return val;
        }
      });
    }
  }
} as any;

/**
 * Detects and masks PII in text.
 */
export const detectAndMaskPII = async (text: string): Promise<{ maskedText: string; detectedCount: number }> => {
  const prompt = `Act as a Neural Privacy Auditor. Identify and mask all PII in the text below. Use placeholders like [NAME], [EMAIL].
  Text: "${text}"
  Return JSON: { "maskedText": string, "detectedCount": number }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { maskedText: { type: Type.STRING }, detectedCount: { type: Type.NUMBER } },
          required: ["maskedText", "detectedCount"]
        }
      }
    });
    return JSON.parse(response.text || '{"maskedText": "", "detectedCount": 0}');
  } catch (e) {
    return { maskedText: text, detectedCount: 0 };
  }
};

/**
 * Predicts the next words for autocomplete.
 */
export const predictNextWords = async (
  currentText: string,
  targetLang: string,
  field: string,
  glossary: any[],
  memory: any[]
): Promise<string> => {
  if (!currentText.trim() || currentText.length < 3) return "";

  const glossaryContext = glossary.length > 0 ? `Glossary: ${JSON.stringify(glossary.slice(0, 10))}` : "";
  const memoryContext = memory.length > 0 ? `Memory: ${JSON.stringify(memory.slice(0, 5))}` : "";

  const prompt = `Act as a Neural Smart Compose engine. Based on the context below, predict the next 2-5 words to complete the current sentence.
  Target Language: ${targetLang}
  Field: ${field}
  ${glossaryContext}
  ${memoryContext}
  Current Text: "${currentText}"
  
  Return ONLY the suggested completion text. Do not repeat the current text. If no confident prediction, return an empty string.`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });
    const text = response.text?.trim() || "";
    return sanitizeOutput(text);
  } catch (e) {
    return "";
  }
};

/**
 * Extracts text from images or PDFs using OCR.
 */
export const extractTextFromVaultFile = async (fileId: string): Promise<string> => {
  try {
    const downloadRes = await fetch(`/api/vault/download/${encodeURIComponent(fileId)}`);
    if (!downloadRes.ok) throw new Error(`Failed to download file: ${downloadRes.statusText}`);
    
    const blob = await downloadRes.blob();
    const file = new File([blob], fileId, { type: blob.type || 'application/octet-stream' });
    return await extractTextViaFileAPI(file);
  } catch (error: any) {
    if (error.message?.includes('API Key')) throw error;
    console.error("Backend Processing Error:", error);
    throw new Error(`Failed to process document via frontend inline data: ${error.message}`);
  }
};

export const extractTextViaFileAPI = async (file: File): Promise<string> => {
  try {
    const base64Str = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });

    const prompt = `You are an expert OCR and document transcription engine.
      Please extract all the text from this document with the highest possible accuracy.
      
      CRITICAL INSTRUCTIONS:
      1. Maintain the EXACT original formatting, structure, indentation, and layout as much as possible using Markdown.
      2. If it's a form, table, or structured list, represent it with 100% structural fidelity.
      3. Replace any manual signatures, handwritten signatures, or signature lines with the text "(signed)".
      4. Replace any visual stamps, official seals, company stamps, or logos functioning as seals with the text "(seal)".
      5. Do not include any conversational filler. Return ONLY the extracted text content.`;

    const response = await safeGenerateContent({
      model: MODELS.COMPLEX || 'gemini-2.0-pro-exp-02-05',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.type || 'application/pdf', data: base64Str } },
            { text: prompt }
          ]
        }
      ]
    });
    return response.text || '';
  } catch (error: any) {
    if (error.message?.includes('API Key')) throw error;
    console.error("Frontend Processing Error:", error);
    throw new Error(`Failed to process document via frontend inline data: ${error.message}`);
  }
};

export const uiSyncTranslate = async (
  imageBase64: string,
  mimeType: string,
  jsonContent: string,
  sourceLang: string,
  targetLang: string
): Promise<{translatedJson: string, contextExplanation: string}> => {
  const prompt = `Act as an expert UI/UX Localization Engineer. You are given a screenshot of a user interface and a JSON file containing the source text strings for that UI.
      
      Your task is to translate the JSON strings from ${sourceLang} to ${targetLang}, specifically using the visual context from the screenshot to ensure the translations are accurate, contextually appropriate, and fit within the visual constraints (e.g., button widths, headers).

      JSON Content to translate:
      ${jsonContent}

      Return a JSON object with two fields:
      1. "translatedJson": A stringified JSON object containing the translated key-value pairs (maintaining the exact structure of the input JSON).
      2. "contextExplanation": A brief explanation of how the visual context influenced your translation choices.`;

  const response = await safeGenerateContent({
    model: MODELS.COMPLEX || 'gemini-2.0-pro-exp-02-05',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedJson: { type: Type.STRING },
          contextExplanation: { type: Type.STRING }
        },
        required: ["translatedJson", "contextExplanation"]
      }
    }
  });

  const rawText = response.text || "{}";
  return JSON.parse(rawText);
};

export const translateDocumentHtml = async (
  html: string,
  sourceLang: string,
  targetLang: string,
  field: ProfessionalField = 'General'
): Promise<string> => {
  const prompt = `Act as a Senior ${field} Translator. Translate the following HTML content from ${sourceLang} to ${targetLang}.
  
  CRITICAL RULES:
  1. You MUST preserve all HTML tags, attributes, and structure exactly as they are.
  2. ONLY translate the text content inside the HTML tags.
  3. Do NOT translate class names, IDs, inline styles, or any HTML attributes.
  4. Return ONLY the translated HTML string, without any markdown formatting blocks (like \`\`\`html).
  
  HTML to translate:
  ${html}`;

  const response = await safeGenerateContent({
    model: MODELS.COMPLEX,
    contents: prompt,
    generationConfig: {
      temperature: 0.1,
    }
  });

  let result = response.text || '';
  // Clean up markdown code blocks if the model adds them
  if (result.startsWith('\`\`\`html')) {
    result = result.replace(/^\`\`\`html\n?/, '').replace(/\n?\`\`\`$/, '');
  } else if (result.startsWith('\`\`\`')) {
    result = result.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
  }
  return result;
};

export const extractTextFromAsset = async (base64Data: string, mimeType: string): Promise<string> => {
  const prompt = `You are an expert OCR and document transcription engine.
  Please extract all the text from this document/image with the highest possible accuracy.
  
  CRITICAL INSTRUCTIONS:
  1. Maintain the EXACT original formatting, structure, indentation, and layout as much as possible using Markdown.
  2. If it's a form, table, or structured list, represent it with 100% structural fidelity. The tables in the source file MUST be created in the output translation in the exact same format.
  3. If this document contains any embedded images, thoroughly analyze those images and extract all text from them (OCR) as part of your transcription, inserting the extracted text where the images appear.
  4. Replace any manual signatures, handwritten signatures, or signature lines with the text "(signed)".
  5. Replace any visual stamps, official seals, company stamps, or logos functioning as seals with the text "(seal)".
  6. Do not include any conversational filler. Return ONLY the extracted text content.`;
  
  // Attempt to fix generic MIME types that the Gemini API doesn't support
  let finalMimeType = mimeType;
  if (mimeType === 'application/octet-stream' || !mimeType) {
    if (base64Data.startsWith('iVBORw0KGgo')) finalMimeType = 'image/png';
    else if (base64Data.startsWith('/9j/')) finalMimeType = 'image/jpeg';
    else if (base64Data.startsWith('JVBERi0')) finalMimeType = 'application/pdf';
    else if (base64Data.startsWith('Qk0')) finalMimeType = 'image/bmp';
    else if (base64Data.startsWith('R0lGOD')) finalMimeType = 'image/gif';
    else if (base64Data.startsWith('UklGR')) finalMimeType = 'image/webp';
    else finalMimeType = 'image/png'; // Default to png if we can't tell
  }

  try {
    const response = await safeGenerateContent({
      model: MODELS.IMAGE,
      contents: { 
        parts: [
          { inlineData: { data: base64Data, mimeType: finalMimeType } }, 
          { text: prompt }
        ] 
      }
    });
    
    const extractedText = response.text;
    if (!extractedText || extractedText.trim().length === 0) {
      return "[Neural Sync: No legible text identified in the provided asset.]";
    }
    
    return sanitizeOutput(extractedText);
  } catch (e: any) {
    console.error("OCR Extraction Error:", e);
    return `[Neural Sync Error: ${e.message || "Service currently saturated or asset incompatible"}]`;
  }
};

/**
 * Analyzes linguistic complexity and returns technical or idiomatic terms.
 */
export const analyzeLinguisticComplexity = async (text: string, sourceLang: string): Promise<LinguisticTerm[]> => {
  const prompt = `Identify complex terms in this ${sourceLang} text. Return JSON array of LinguisticTerm objects.
  Text: "${text}"`;
  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              context: { type: Type.STRING },
              alternative: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['technical', 'idiomatic', 'ambiguous', 'important'] }
            },
            required: ["term", "definition", "context", "alternative", "type"]
          }
        }
      }
    });
    const result = JSON.parse(response.text || '[]');
    return result.map((t: any) => ({ 
      ...t, 
      id: generateId(),
      definition: sanitizeOutput(t.definition),
      context: sanitizeOutput(t.context),
      alternative: sanitizeOutput(t.alternative)
    }));
  } catch (e) {
    return [];
  }
};

/**
 * Fetches phonetic pronunciation and sound-alike guide.
 */
export const fetchPronunciationGuide = async (text: string, lang: string): Promise<{ phonetic: string; guide: string }> => {
  const prompt = `Provide IPA and sounds-like guide for: "${text}" in ${lang}. JSON {phonetic, guide}.`;
  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { phonetic: { type: Type.STRING }, guide: { type: Type.STRING } },
          required: ["phonetic", "guide"]
        }
      }
    });
    return JSON.parse(response.text || '{"phonetic": "N/A", "guide": "N/A"}');
  } catch (e) {
    return { phonetic: "N/A", guide: "Throttled" };
  }
};

/**
 * Verifies translation quality with back-translation.
 */
export const verifyTranslationQuality = async (sourceText: string, translatedText: string, sourceLang: string, targetLang: string): Promise<VerificationReport> => {
  const prompt = `Verify translation quality. Source: ${sourceText}. Target: ${translatedText}. JSON with score, backTranslation, feedback, isConsistent.`;
  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            backTranslation: { type: Type.STRING },
            feedback: { type: Type.STRING },
            isConsistent: { type: Type.BOOLEAN }
          },
          required: ["score", "backTranslation", "feedback", "isConsistent"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
};

/**
 * Audits translation quality using MQM framework.
 */
export const auditTranslationQuality = async (source: string, translation: string, sourceLang: string, targetLang: string, field: ProfessionalField): Promise<TranslationQualityReport> => {
  const prompt = `Perform a deep MQM (Multidimensional Quality Metrics) audit on this translation.
  Source (${sourceLang}): "${source}"
  Translation (${targetLang}): "${translation}"
  Field: ${field}
  
  Return a JSON TranslationQualityReport:
  {
    "auditId": "uuid",
    "overallScore": number (0-100),
    "certification": "Clinical Grade" | "Legal Grade" | "Professional Grade" | "Operational Grade" | "Substandard",
    "evaluation": {
      "Accuracy": { "score": number, "status": "optimal" | "warning" | "critical" },
      "Fluency": { "score": number, "status": "optimal" | "warning" | "critical" },
      "Terminology": { "score": number, "status": "optimal" | "warning" | "critical" },
      "Style": { "score": number, "status": "optimal" | "warning" | "critical" },
      "Locale Convention": { "score": number, "status": "optimal" | "warning" | "critical" },
      "Design": { "score": number, "status": "optimal" | "warning" | "critical" }
    },
    "critiques": [
      { "dimension": string, "severity": "Minor" | "Major" | "Critical", "finding": string, "improvement": string }
    ]
  }`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          auditId: { type: Type.STRING },
          overallScore: { type: Type.NUMBER },
          certification: { type: Type.STRING, enum: ["Clinical Grade", "Legal Grade", "Professional Grade", "Operational Grade", "Substandard"] },
          evaluation: {
            type: Type.OBJECT,
            properties: {
              Accuracy: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ["optimal", "warning", "critical"] } }, required: ["score", "status"] },
              Fluency: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ["optimal", "warning", "critical"] } }, required: ["score", "status"] },
              Terminology: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ["optimal", "warning", "critical"] } }, required: ["score", "status"] },
              Style: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ["optimal", "warning", "critical"] } }, required: ["score", "status"] },
              "Locale Convention": { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ["optimal", "warning", "critical"] } }, required: ["score", "status"] },
              Design: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ["optimal", "warning", "critical"] } }, required: ["score", "status"] }
            },
            required: ["Accuracy", "Fluency", "Terminology", "Style", "Locale Convention", "Design"]
          },
          critiques: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dimension: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["Minor", "Major", "Critical"] },
                finding: { type: Type.STRING },
                improvement: { type: Type.STRING }
              },
              required: ["dimension", "severity", "finding", "improvement"]
            }
          }
        },
        required: ["auditId", "overallScore", "certification", "evaluation", "critiques"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  if (result.critiques) {
    result.critiques = result.critiques.map((c: any) => ({
      ...c,
      finding: sanitizeOutput(c.finding),
      improvement: sanitizeOutput(c.improvement)
    }));
  }
  return result;
};

/**
 * Harvests key terminology from source and target text.
 */
export const harvestTerminology = async (
  source: string, 
  target: string, 
  sourceLang: string, 
  targetLang: string, 
  field: ProfessionalField
): Promise<SuggestedGlossaryItem[]> => {
  const prompt = `Act as a Neural Terminology Harvester. Analyze the source (${sourceLang}) and its translation (${targetLang}) in the ${field} domain. 
  Extract the most important specialized terms, industry jargon, or highly recurring technical phrases.
  
  Source: "${source}"
  Translation: "${target}"
  
  Return a JSON array of SuggestedGlossaryItem:
  {
    "id": "uuid",
    "term": "Source Term",
    "translation": "Translated Term",
    "definition": "Brief definition or usage context",
    "reason": "Why this term is important (e.g., 'Core Domain Term')",
    "priority": "High" | "Medium" | "Low"
  }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              term: { type: Type.STRING },
              translation: { type: Type.STRING },
              definition: { type: Type.STRING },
              context: { type: Type.STRING },
              reason: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["id", "term", "translation", "definition", "context", "reason", "priority"]
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');
    return result.map((item: any) => ({
      ...item,
      id: generateId() // Ensure fresh IDs
    }));
  } catch (e) {
    console.error("Harvesting failed", e);
    return [];
  }
};

/**
 * Audits translation for NPE improvements.
 */
export const auditTranslationNPE = async (source: string, currentTranslation: string, sourceLang: string, targetLang: string): Promise<NPEReport> => {
  const prompt = `Optimize translation. JSON {revised, explanation, diff: [{type, text}]}.`;
  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          revised: { type: Type.STRING },
          explanation: { type: Type.STRING },
          diff: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: ['addition', 'deletion', 'stable'] }, text: { type: Type.STRING } }, required: ["type", "text"] } }
        },
        required: ["revised", "explanation", "diff"]
      }
    }
  });
  const result = JSON.parse(response.text || '{}');
  if (result.revised) result.revised = sanitizeOutput(result.revised);
  if (result.diff) {
    result.diff = result.diff.map((d: any) => ({
      ...d,
      text: sanitizeOutput(d.text)
    }));
  }
  return result;
};

/**
 * Trains a style guide by analyzing a document and extracting linguistic rules.
 * Enhanced to provide structured analysis across multiple dimensions.
 */
export const trainStyleGuide = async (text: string): Promise<{ 
  instructions: string; 
  examples: { source: string; target: string }[];
  analysis?: {
    tone: string;
    formality: string;
    terminology: string[];
    punctuation: string;
  }
}> => {
  const prompt = `Act as a Neural Style Architect. Analyze the following document and extract a set of formal translation instructions and style rules.
  Provide a structured analysis of the linguistic patterns.
  
  Document: "${text.slice(0, 15000)}"
  
  Return a JSON object:
  {
    "instructions": "A detailed set of rules for tone, terminology, and formatting.",
    "examples": [
      { "source": "Example source text", "target": "Example target translation" }
    ],
    "analysis": {
      "tone": "Description of the emotional tone",
      "formality": "Level of formality (e.g., High, Neutral, Casual)",
      "terminology": ["List of key terms or industry jargon found"],
      "punctuation": "Specific rules for punctuation and symbols"
    }
  }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            instructions: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING }
                },
                required: ["source", "target"]
              }
            },
            analysis: {
              type: Type.OBJECT,
              properties: {
                tone: { type: Type.STRING },
                formality: { type: Type.STRING },
                terminology: { type: Type.ARRAY, items: { type: Type.STRING } },
                punctuation: { type: Type.STRING }
              },
              required: ["tone", "formality", "terminology", "punctuation"]
            }
          },
          required: ["instructions", "examples", "analysis"]
        }
      }
    });
    return JSON.parse(response.text || '{"instructions": "", "examples": [], "analysis": {"tone": "", "formality": "", "terminology": [], "punctuation": ""}}');
  } catch (e) {
    console.error("Style training failed", e);
    return { instructions: "Neural training cycle interrupted.", examples: [] };
  }
};

/**
 * Translates text with domain-specific personas and glossaries.
 */
export const chatWithCopilot = async (
  selection: string,
  prompt: string,
  sourceLang: string,
  targetLang: string,
  context: string = ''
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: MODELS.COMPLEX,
      contents: `You are an expert linguistic copilot. The user has selected the following text:
"${selection}"

Context (if any):
${context}

Languages involved: Source (${sourceLang}), Target (${targetLang}).

User Request: ${prompt}

Provide a concise, helpful, and expert response.`,
      config: {
        temperature: 0.4,
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Copilot error:", error);
    throw new Error("Failed to communicate with the linguistic copilot.");
  }
};

export const translateText = async (
  text: string, 
  sourceLang: string, 
  targetLang: string, 
  field: ProfessionalField = 'General',
  glossary: GlossaryItem[] = [],
  tone: TranslationTone = 'Standard',
  context: string = '',
  persona: LinguisticPersona | string = 'Minimalist',
  lockedSegments: string[] = [],
  customInstructions: string = '',
  useGrounding: boolean = false
): Promise<{ text: string; sources?: { uri: string; title: string }[] }> => {
  const personaInstructions: Record<string, string> = {
    'Minimalist': 'Use as few words as possible while maintaining meaning. Avoid all fluff.',
    'Academic': 'Use formal, scholarly language with precise terminology. Maintain an objective tone.',
    'Journalistic': 'Write in a clear, concise, and engaging style suitable for news reporting. Use the inverted pyramid structure if applicable.',
    'Marketing': 'Use persuasive, benefit-oriented language. Focus on emotional appeal and brand voice.',
    'Creative': 'Prioritize artistic expression, metaphors, and evocative language. Maintain the original creative intent.',
    'Legalistic': 'Use precise legal terminology and formal structures. Prioritize accuracy and lack of ambiguity over readability.',
    'AP Style': 'Adhere strictly to Associated Press Stylebook guidelines (e.g., specific capitalization, abbreviation, and numeral rules).',
    'Chicago Style': 'Adhere to The Chicago Manual of Style guidelines, emphasizing formal grammar and specific citation/formatting styles.',
    'Oxford Style': 'Use British English spelling and the Oxford (serial) comma. Maintain a refined, formal British tone.',
    'Technical Manual': 'Use clear, imperative language suitable for instructions. Focus on clarity, safety, and step-by-step logic.',
    'Medical Journal': 'Use highly specific medical terminology (AMA style). Focus on clinical accuracy and peer-reviewed standards.',
    'Legal Brief': 'Use formal legal argumentation style. Adhere to standard legal citation and formatting conventions.'
  };

  let finalPersonaName = typeof persona === 'string' ? persona : persona.name;
  let finalPersonaInstruction = typeof persona === 'string' 
    ? (personaInstructions[persona] || '') 
    : persona.baseInstruction;

  if (typeof persona !== 'string' && persona.examples.length > 0) {
    const examplesStr = persona.examples
      .map(ex => `Source: ${ex.source}\nTarget: ${ex.target}${ex.context ? `\nContext: ${ex.context}` : ''}`)
      .join('\n\n');
    finalPersonaInstruction += `\n\nFew-shot examples for style reference:\n${examplesStr}`;
  }

  const styleInstruction = persona === 'Custom Guide' 
    ? `Adhere strictly to the following custom style guide and rules: ${context}`
    : (customInstructions || finalPersonaInstruction);

  const prompt = `Act as a specialized ${field} translator. 
  Style Guide / Persona: ${finalPersonaName}. 
  Specific Style Instructions: ${styleInstruction}
  ${context && persona !== 'Custom Guide' ? `Additional Contextual Constraints: ${context}` : ''}
  
  Translate ${sourceLang} to ${targetLang}. 
  Tone: ${tone}. Glossaries: ${JSON.stringify(glossary)}. Locked: ${JSON.stringify(lockedSegments)}.
  
  CRITICAL FORMATTING RULES:
  1. You MUST preserve the EXACT structure, layout, and formatting of the source text.
  2. Maintain all line breaks, paragraph spacing, and indentation exactly as they appear.
  3. If the source contains tables (Markdown, HTML, ASCII, TSV, or structured data), you MUST produce the EXACT same table structure and format in the translation. Do NOT convert TSV or other formats to Markdown tables unless they were Markdown tables in the source.
  4. For Markdown tables, ensure the pipe (|) and hyphen (-) alignment is preserved perfectly. Do not alter the number of columns or rows.
  5. Preserve all numbering, bullet points, and list structures (ordered and unordered) exactly as they are in the source.
  6. Preserve all image references (e.g., Markdown image syntax ![alt](url)) exactly as they appear, translating only the alt text if appropriate, but keeping the URL intact.
  7. Preserve all mathematical formulas (LaTeX, MathML, or ASCII math) exactly as they appear. Do NOT translate variables or mathematical symbols.
  8. Do NOT add any introductory or concluding remarks.
  9. If the source is Markdown, the translation MUST use the exact same Markdown syntax.
  10. Do NOT use HTML tags like <u> for underlining. Use Markdown emphasis signs like _ or ** instead for emphasis.
  
  Return ONLY the translated string. Text: "${text}"`;
  
  const response = await safeGenerateContent({ 
    model: MODELS.TEXT, 
    contents: prompt,
    config: useGrounding ? { tools: [{ googleSearch: {} }] } : undefined
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    .map(chunk => ({ uri: chunk.web!.uri, title: chunk.web!.title }));

  return {
    text: sanitizeOutput(response.text || ''),
    sources: sources
  };
};

/**
 * Chunks text into semantic segments for RAG.
 */
export const chunkText = (text: string, chunkSize = 1000, overlap = 200): string[] => {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
};

/**
 * Retrieves relevant context from knowledge bases using semantic search.
 */
export const retrieveKnowledgeContext = async (
  query: string,
  knowledgeBases: any[],
  vaultFiles: any[]
): Promise<{ context: string; sources: string[] }> => {
  const activeKBs = knowledgeBases.filter(kb => kb.isActive);
  if (activeKBs.length === 0) return { context: "", sources: [] };

  const fileIds = activeKBs.flatMap(kb => kb.fileIds);
  const files = vaultFiles.filter(f => fileIds.includes(f.id) && f.content);
  if (files.length === 0) return { context: "", sources: [] };

  try {
    // 1. Advanced RAG: Query Expansion
    // Expand the query to include synonyms and related concepts to improve recall
    let expandedQuery = query;
    try {
      const expansionPrompt = `Expand the following search query with 3-5 related keywords or synonyms to improve vector search recall. Return ONLY a comma-separated list of keywords. Query: "${query}"`;
      const expansionResponse = await safeGenerateContent({
        model: MODELS.TEXT,
        contents: expansionPrompt,
        config: { temperature: 0.3 }
      });
      if (expansionResponse && expansionResponse.text) {
        expandedQuery = `${query} ${expansionResponse.text.replace(/,/g, ' ')}`;
      }
    } catch (e) {
      console.warn("Query expansion failed, using original query.");
    }

    const queryEmbedding = await embedText(expandedQuery);
    const queryKeywords = expandedQuery.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const allChunks: { text: string; source: string; similarity: number; keywordScore: number; combinedScore: number }[] = [];

    for (const file of files) {
      if (!file.chunks || file.chunks.length === 0) {
        // Fallback: simple keyword search if no chunks/embeddings
        let keywordScore = 0;
        const fileContentLower = file.content.toLowerCase();
        queryKeywords.forEach(kw => {
          if (fileContentLower.includes(kw)) keywordScore += 0.1;
        });
        
        if (keywordScore > 0 || fileContentLower.includes(query.toLowerCase())) {
          allChunks.push({ 
            text: file.content.slice(0, 1000), 
            source: file.name, 
            similarity: 0.5,
            keywordScore: keywordScore,
            combinedScore: 0.5 + keywordScore
          });
        }
        continue;
      }

      for (const chunk of file.chunks) {
        let similarity = 0;
        if (chunk.embedding) {
          similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        }
        
        // Keyword matching (BM25-lite approach)
        let keywordScore = 0;
        const chunkTextLower = chunk.text.toLowerCase();
        queryKeywords.forEach(kw => {
          if (chunkTextLower.includes(kw)) {
            // Boost score if the keyword appears multiple times
            const count = (chunkTextLower.match(new RegExp(kw, 'g')) || []).length;
            keywordScore += 0.05 * Math.min(count, 3);
          }
        });

        // Hybrid scoring: Vector similarity is primary, keyword matching is secondary boost
        const combinedScore = similarity + keywordScore;

        if (combinedScore > 0.50) { // Lowered threshold to allow more candidates for LLM re-ranking
          allChunks.push({ text: chunk.text, source: file.name, similarity, keywordScore, combinedScore });
        }
      }
    }

    // 2. Advanced RAG: Initial Retrieval (Top 10)
    const topCandidates = allChunks
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 10);

    if (topCandidates.length === 0) return { context: "", sources: [] };

    // 3. Advanced RAG: LLM Re-ranking & Contextual Compression
    // Use a fast model to evaluate the retrieved chunks and extract only the most relevant parts
    let finalContext = "";
    let finalSources = new Set<string>();

    try {
      const rerankPrompt = `
You are an advanced RAG (Retrieval-Augmented Generation) contextual compressor.
Your task is to review the following retrieved document chunks and extract ONLY the information strictly relevant to the user's query.
If a chunk is not relevant, ignore it.
Synthesize the relevant information into a concise, highly concentrated context block.

User Query: "${query}"

Retrieved Chunks:
${topCandidates.map((c, i) => `[Chunk ${i+1} | Source: ${c.source}]\n${c.text}`).join('\n\n')}

Output the compressed context. If nothing is relevant, output "NO_RELEVANT_CONTEXT".
`;
      const compressedContextResponse = await safeGenerateContent({
        model: MODELS.TEXT,
        contents: rerankPrompt,
        config: { temperature: 0.1 }
      });
      
      const compressedContext = compressedContextResponse?.text || "";
      
      if (compressedContext && !compressedContext.includes("NO_RELEVANT_CONTEXT")) {
        finalContext = "\n\n[Advanced RAG Context (Compressed & Re-ranked)]\n" + compressedContext;
        // Add sources from top candidates (simplified, could be parsed from LLM output if we asked it to cite)
        topCandidates.slice(0, 3).forEach(c => finalSources.add(c.source));
      } else {
        // Fallback to standard top 3 if compression fails or returns empty
        const top3 = topCandidates.slice(0, 3);
        finalContext = "\n\n[Standard RAG Context]\n" + top3.map(c => `[Source: ${c.source}] ${c.text}`).join('\n---\n');
        top3.forEach(c => finalSources.add(c.source));
      }
    } catch (e) {
      console.warn("LLM Re-ranking failed, falling back to standard retrieval.");
      const top3 = topCandidates.slice(0, 3);
      finalContext = "\n\n[Standard RAG Context]\n" + top3.map(c => `[Source: ${c.source}] ${c.text}`).join('\n---\n');
      top3.forEach(c => finalSources.add(c.source));
    }

    return { 
      context: finalContext, 
      sources: Array.from(finalSources)
    };
  } catch (err) {
    console.error("RAG Retrieval Failed:", err);
    return { context: "", sources: [] };
  }
};

export interface SessionConsistencyMap {
  terms: { source: string; target: string; frequency: number }[];
  stylePatterns: string[];
  characterNames: string[];
}

/**
 * Extracts key terms and stylistic patterns from the translation history
 * to ensure session-wide consistency.
 */
export const extractSessionConsistencyMap = async (
  history: TranslationHistoryItem[]
): Promise<SessionConsistencyMap> => {
  if (history.length < 2) return { terms: [], stylePatterns: [], characterNames: [] };

  const recentHistory = history.slice(0, 10); // Analyze last 10 items for performance
  const historyData = recentHistory.map(h => ({
    source: h.sourceText,
    target: h.translatedText,
    field: h.field
  }));

  const prompt = `Analyze the following translation history and extract a "Session Consistency Map".
  Identify:
  1. Recurring key terms and their consistent translations.
  2. Specific stylistic patterns (e.g., use of passive voice, specific honorifics, sentence length).
  3. Character names or proper nouns that must remain identical.

  History Data:
  ${JSON.stringify(historyData)}

  Return a JSON object:
  {
    "terms": [{"source": "term", "target": "translation", "frequency": number}],
    "stylePatterns": ["pattern 1", "pattern 2"],
    "characterNames": ["Name 1", "Name 2"]
  }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            terms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  frequency: { type: Type.NUMBER }
                },
                required: ["source", "target", "frequency"]
              }
            },
            stylePatterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            characterNames: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["terms", "stylePatterns", "characterNames"]
        }
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (err: any) {
    const isCritical = err.message?.includes('API Key') || 
                       err.message?.includes('Disruption') || 
                       err.message?.includes('403') || 
                       err.message?.includes('unrestricted') ||
                       err.message?.includes('PERMISSION_DENIED') ||
                       err.message?.includes('disruptions') ||
                       err.message?.includes('Credentials') ||
                       err.message?.includes('Auth');
    if (isCritical) throw err;
    console.error("Consistency Map Extraction Failed", err);
    return { terms: [], stylePatterns: [], characterNames: [] };
  }
};

/**
 * Automated Project Scoping & Intelligence
 * Analyzes the source text and context to recommend optimal translation parameters.
 */
export const generateTranscreations = async (params: {
  headline: string;
  body: string;
  audience: string;
  voice: string;
  sourceLang: string;
  targetLang: string;
  field: ProfessionalField;
  persona?: LinguisticPersona;
  customStyleGuide?: StyleGuide;
}): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `
    You are an expert transcreator and cultural consultant.
    Your task is to adapt the following marketing copy from ${params.sourceLang} into ${params.targetLang}.
    
    Source Headline: "${params.headline}"
    Source Body: "${params.body}"
    
    Target Audience: ${params.audience}
    Brand Voice: ${params.voice}
    Field: ${params.field}
    
    Do NOT just translate literally. Adapt the emotion, intent, idioms, and cultural references to resonate deeply with the target audience in ${params.targetLang}.
    
    Provide exactly 3 different creative options.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              headline: { type: Type.STRING, description: `The adapted headline in ${params.targetLang}` },
              body: { type: Type.STRING, description: `The adapted body copy in ${params.targetLang}` },
              backTranslation: { type: Type.STRING, description: `A literal English translation of the adapted copy so the original author understands exactly what it says` },
              culturalRationale: { type: Type.STRING, description: `Why this adaptation works for the target culture and audience` },
              emotionalResonance: { type: Type.NUMBER, description: `A score from 0-100 indicating how well it hits the desired brand voice` },
              tone: { type: Type.STRING, description: `A 1-2 word description of the tone (e.g., Playful, Urgent, Authoritative)` }
            },
            required: ["id", "headline", "body", "backTranslation", "culturalRationale", "emotionalResonance", "tone"]
          }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Transcreation error:", error);
    return [];
  }
};

export const analyzeProjectScope = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  context: string = ''
): Promise<ProjectScope> => {
  const prompt = `Act as a Senior Localization Project Manager and Linguistic Architect.
  Analyze the following translation request and provide a comprehensive "Project Scope & Intelligence" report.
  
  Source Language: ${sourceLang}
  Target Language: ${targetLang}
  Context: ${context}
  
  Text to analyze: "${text.slice(0, 5000)}"
  
  Identify:
  1. The most appropriate Professional Field (Medical, Legal, Technical, Creative, etc.).
  2. The ideal Linguistic Persona (Minimalist, Academic, Storyteller, etc.).
  3. A complexity score (0-100) based on terminology, syntax, and cultural depth.
  4. Estimated effort (Low, Medium, High).
  5. Key terminology that will require specific attention.
  6. Potential challenges (e.g., untranslatable idioms, gender-neutrality issues, formatting risks).
  7. Suggested tone (Formal, Casual, etc.).
  8. A brief audience analysis.
  
  Return a JSON object:
  {
    "recommendedField": "Field",
    "recommendedPersona": "Persona",
    "complexityScore": number,
    "estimatedEffort": "Low" | "Medium" | "High",
    "keyTerminology": ["term1", "term2"],
    "potentialChallenges": [{"category": "string", "description": "string", "mitigation": "string"}],
    "suggestedTone": "Tone",
    "audienceAnalysis": "string"
  }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedField: { type: Type.STRING },
            recommendedPersona: { type: Type.STRING },
            complexityScore: { type: Type.NUMBER },
            estimatedEffort: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            keyTerminology: { type: Type.ARRAY, items: { type: Type.STRING } },
            potentialChallenges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  mitigation: { type: Type.STRING }
                },
                required: ["category", "description", "mitigation"]
              }
            },
            suggestedTone: { type: Type.STRING },
            audienceAnalysis: { type: Type.STRING }
          },
          required: ["recommendedField", "recommendedPersona", "complexityScore", "estimatedEffort", "keyTerminology", "potentialChallenges", "suggestedTone", "audienceAnalysis"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (err) {
    console.error("Project Scoping Failed", err);
    throw err;
  }
};

/**
 * Powerhouse Translation Engine: RAG + Multi-Agent Refinement + Neural Reasoning
 */
export const translatePowerhouse = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  field: ProfessionalField = 'General',
  glossary: GlossaryItem[] = [],
  tone: TranslationTone = 'Standard',
  context: string = '',
  persona: LinguisticPersona | string = 'Minimalist',
  translationMemory: TranslationMemoryEntry[] = [],
  styleGuide?: string,
  knowledgeBases: any[] = [],
  vaultFiles: any[] = [],
  sessionConsistencyMap?: SessionConsistencyMap,
  visualContext?: string, // Base64 image
  customInstructions?: string
): Promise<{ 
  text: string; 
  audit?: TranslationQualityReport; 
  refinementExplanation?: string;
  contextUsed?: string[];
  reasoning?: string;
}> => {
  // 1. RAG: Enhanced Context Retrieval
  let ragContext = "";
  const contextUsed: string[] = [];

  // TM Retrieval with semantic similarity
  if (translationMemory.length > 0) {
    try {
      const sourceEmbedding = await embedText(text);
      const relevantEntries = translationMemory
        .map(entry => ({
          ...entry,
          similarity: entry.embedding ? cosineSimilarity(sourceEmbedding, entry.embedding) : 0
        }))
        .filter(entry => entry.similarity > 0.65) // Slightly lower threshold for broader context
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5); // Top 5 matches

      if (relevantEntries.length > 0) {
        ragContext += "\n\nNeural Translation Memory Context (High Similarity):\n" + 
          relevantEntries.map(e => `[Similarity: ${(e.similarity * 100).toFixed(1)}%] Source: "${e.sourceSegment}" -> Translation: "${e.targetSegment}"`).join('\n');
        relevantEntries.forEach(e => contextUsed.push(`TM Match: ${e.sourceSegment.slice(0, 30)}...`));
      }
    } catch (err) {
      console.error("TM Context Retrieval Failed:", err);
    }
  }

  // KB Retrieval (RAG)
  if (knowledgeBases.length > 0) {
    const kbResult = await retrieveKnowledgeContext(text, knowledgeBases, vaultFiles);
    if (kbResult.context) {
      ragContext += kbResult.context;
      kbResult.sources.forEach(s => contextUsed.push(`KB: ${s}`));
    }
  }

  // 2. Agent A: Initial Translation (Draft) with Reasoning
  // We use a high-reasoning model for the draft to ensure deep understanding
  const draftPrompt = `Act as a Senior ${field} Translator. 
  Translate the following text from ${sourceLang} to ${targetLang}.
  
  Tone: ${tone}
  Persona: ${typeof persona === 'string' ? persona : persona.name}
  ${styleGuide ? `Style Guide: ${styleGuide}` : ''}
  ${glossary.length > 0 ? `Glossary: ${JSON.stringify(glossary)}` : ''}
  ${(context || ragContext) ? `Contextual Constraints:\n${context}\n${ragContext}` : ''}
  
  ${sessionConsistencyMap ? `Session Consistency Constraints:
  - Key Terms: ${JSON.stringify(sessionConsistencyMap.terms)}
  - Style Patterns: ${sessionConsistencyMap.stylePatterns.join(', ')}
  - Character Names: ${sessionConsistencyMap.characterNames.join(', ')}` : ''}
  
  ${customInstructions ? `User Preferences & Instructions:\n${customInstructions}` : ''}
  
  ${visualContext ? `Visual Context Analysis:
  - Analyze the provided image (screenshot/UI mockup).
  - Use the visual layout, button sizes, and surrounding elements to inform the translation.
  - Ensure the translation fits within the visual space if it looks like a UI element.
  - Match the visual tone and brand identity shown in the image.` : ''}
  
  CRITICAL FORMATTING RULES:
  1. You MUST preserve the EXACT structure, layout, and formatting of the source text.
  2. Maintain all line breaks, paragraph spacing, and indentation exactly as they appear.
  3. If the source contains tables (Markdown, HTML, ASCII, TSV, or structured data), you MUST produce the EXACT same table structure and format in the translation. Do NOT convert TSV or other formats to Markdown tables unless they were Markdown tables in the source.
  4. For Markdown tables, ensure the pipe (|) and hyphen (-) alignment is preserved perfectly. Do not alter the number of columns or rows.
  5. Preserve all numbering, bullet points, and list structures (ordered and unordered) exactly as they are in the source.
  6. Preserve all image references (e.g., Markdown image syntax ![alt](url)) exactly as they appear, translating only the alt text if appropriate, but keeping the URL intact.
  7. Preserve all mathematical formulas (LaTeX, MathML, or ASCII math) exactly as they appear. Do NOT translate variables or mathematical symbols.
  8. Do NOT add any introductory or concluding remarks.
  9. If the source is Markdown, the translation MUST use the exact same Markdown syntax.
  10. Do NOT use HTML tags like <u> for underlining. Use Markdown emphasis signs like _ or ** instead for emphasis.
  
  Text to translate: "${text}"
  
  Return ONLY the translated text.`;

  const draftContents: any = visualContext ? {
    parts: [
      { text: draftPrompt },
      {
        inlineData: {
          mimeType: "image/png",
          data: visualContext.split(',')[1] || visualContext
        }
      }
    ]
  } : draftPrompt;

  const draftResponse = await safeGenerateContent({
    model: MODELS.COMPLEX, // Force Pro model for reasoning
    contents: draftContents,
    config: {
      temperature: 0.2,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } // Enable reasoning for the draft
    }
  });

  const draftText = sanitizeOutput(draftResponse.text || "");

  // 3. Agent B: LQA Audit (Multidimensional Quality Metrics)
  const auditReport = await auditTranslationQuality(
    text,
    draftText,
    sourceLang,
    targetLang,
    field
  );

  // 4. Agent C: Post-Editor Refinement
  // We refine if the score is below 98 or if there are any critiques
  if (auditReport.overallScore < 98 || auditReport.critiques.length > 0) {
    const refinementPrompt = `Act as a Master Neural Post-Editor. 
    Refine the following translation based on the LQA Audit findings.
    
    Source (${sourceLang}): "${text}"
    Draft Translation (${targetLang}): "${draftText}"
    
    LQA Audit Findings:
    - Overall Score: ${auditReport.overallScore}/100
    - Critiques: ${JSON.stringify(auditReport.critiques)}
    
    ${styleGuide ? `Style Guide Constraints: ${styleGuide}` : ''}
    ${glossary.length > 0 ? `Glossary: ${JSON.stringify(glossary)}` : ''}
    ${sessionConsistencyMap ? `Session Consistency Constraints:
    - Key Terms: ${JSON.stringify(sessionConsistencyMap.terms)}
    - Style Patterns: ${sessionConsistencyMap.stylePatterns.join(', ')}
    - Character Names: ${sessionConsistencyMap.characterNames.join(', ')}` : ''}
    
    Instructions:
    1. Address all critiques identified in the audit.
    2. Ensure perfect adherence to the ${tone} tone.
    3. Verify all glossary terms are used correctly.
    4. Maintain original formatting and structure.
    
    Return a JSON object:
    {
      "refinedText": "The final polished translation",
      "explanation": "Brief explanation of what was refined and why"
    }`;

    try {
      const refinementResponse = await safeGenerateContent({
        model: MODELS.TEXT,
        contents: refinementPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              refinedText: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["refinedText", "explanation"]
          }
        }
      });

      const refinementResult = JSON.parse(refinementResponse.text || '{}');
      
      return {
        text: sanitizeOutput(refinementResult.refinedText || draftText),
        audit: auditReport,
        refinementExplanation: refinementResult.explanation,
        contextUsed,
        reasoning: draftResponse.candidates?.[0]?.content?.parts?.find(p => p.thought)?.text
      };
    } catch (err) {
      console.error("Refinement failed, returning draft", err);
      return {
        text: draftText,
        audit: auditReport,
        contextUsed
      };
    }
  }

  return {
    text: draftText,
    audit: auditReport,
    contextUsed
  };
};

/**
 * Mapping for dictionary entries with neural context.
 */
export const getNeuralDictionaryMapping = async (word: string, sourceLang: string, targetLang: string): Promise<any> => {
  const prompt = `Provide a dictionary mapping for the word or phrase "${word}" from ${sourceLang} to ${targetLang}.
  Return a JSON object with the following structure:
  {
    "targetTerm": "The translated term",
    "pos": "Part of speech (e.g., noun, verb, adjective)",
    "notes": "Any linguistic notes, context, or usage examples"
  }`;
  
  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetTerm: { type: Type.STRING },
          pos: { type: Type.STRING },
          notes: { type: Type.STRING }
        },
        required: ["targetTerm", "pos", "notes"]
      }
    }
  });
  return JSON.parse(response.text || '{"targetTerm":"","pos":"","notes":""}');
};

/**
 * Translates text from an image or asset with spatial awareness for Visual OCR.
 */
export const translateImage = async (base64Data: string, mimeType: string, targetLang: string, field: ProfessionalField = 'General'): Promise<any> => {
  const prompt = `Act as a Visual Neural Translator. Perform OCR on this image and translate all detected text into ${targetLang}.
  For each distinct block of text, identify its bounding box coordinates.
  
  CRITICAL FORMATTING RULES:
  1. If the source contains tables, forms, or structured lists, you MUST reconstruct them in the "translated" field using Markdown table syntax or precise spacing to maintain 100% structural fidelity.
  2. Maintain the relative positioning and layout of all text elements.
  3. Replace any manual signatures, handwritten signatures, or signature lines with the text "(signed)" in both original and translated text.
  4. Replace any visual stamps, official seals, company stamps, or logos functioning as seals with the text "(seal)" in both original and translated text.
  5. For the "blocks" array, provide the translation for each detected segment.
  6. Do NOT use HTML tags like <u> for underlining. Use Markdown emphasis signs like _ or ** instead for emphasis.
  7. Provide a brief explanation of the visual context of the image (e.g., "This is a restaurant menu", "This is a street sign indicating a detour").
  
  Return a JSON object with:
  {
    "original": "Full original text (reconstruct tables in Markdown if present)",
    "translated": "Full translated text (reconstruct tables in Markdown if present)",
    "confidence": number (0-100),
    "contextExplanation": "Brief explanation of the visual context and what the image represents",
    "blocks": [
      {
        "text": "Original text block",
        "translation": "Translated text block",
        "box_2d": [ymin, xmin, ymax, xmax] // Normalized coordinates 0-1000
      }
    ]
  }`;

  const response = await safeGenerateContent({
    model: MODELS.IMAGE,
    contents: { 
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } }, 
        { text: prompt }
      ] 
    },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          translated: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                translation: { type: Type.STRING },
                box_2d: { 
                  type: Type.ARRAY, 
                  items: { type: Type.NUMBER },
                  minItems: 4,
                  maxItems: 4
                }
              },
              required: ["text", "translation", "box_2d"]
            }
          }
        },
        required: ["original", "translated", "confidence", "blocks"]
      }
    }
  });
  const result = JSON.parse(response.text || '{"original": "", "translated": "", "confidence": 0, "blocks": []}');
  if (result.original) result.original = sanitizeOutput(result.original);
  if (result.translated) result.translated = sanitizeOutput(result.translated);
  if (result.blocks) {
    result.blocks = result.blocks.map((b: any) => ({
      ...b,
      text: sanitizeOutput(b.text),
      translation: sanitizeOutput(b.translation)
    }));
  }
  return result;
};

export const analyzeVoiceCharacteristics = async (
  audioBase64: string,
  mimeType: string
): Promise<{
  pitch: string;
  tone: string;
  gender: string;
  emotion: string;
  accent: string;
  technicalSpecs: string;
}> => {
  const prompt = `Act as a Neural Acoustic Auditor. Analyze the provided audio sample and extract the vocal characteristics.
  Return JSON: { "pitch": string, "tone": string, "gender": string, "emotion": string, "accent": string, "technicalSpecs": string }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pitch: { type: Type.STRING },
            tone: { type: Type.STRING },
            gender: { type: Type.STRING },
            emotion: { type: Type.STRING },
            accent: { type: Type.STRING },
            technicalSpecs: { type: Type.STRING }
          },
          required: ["pitch", "tone", "gender", "emotion", "accent", "technicalSpecs"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Voice analysis failed", e);
    return {
      pitch: "Detected",
      tone: "Natural",
      gender: "Neutral",
      emotion: "Calm",
      accent: "Standard",
      technicalSpecs: "24kHz / Mono"
    };
  }
};

/**
 * Generates dubbed audio using the TTS model.
 * Simulates voice cloning by selecting a voice based on the analyzed voice profile.
 */
export const generateDubbedAudio = async (
  text: string,
  sourceAudioBase64: string,
  sourceAudioMimeType: string,
  targetLang: string
): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  // 1. Analyze voice to pick a matching TTS voice
  const profile = await analyzeVoiceCharacteristics(sourceAudioBase64, sourceAudioMimeType);
  
  // 2. Select voice based on gender/tone (Simulating cloning)
  let voiceName = 'Kore'; // Default
  const gender = profile.gender.toLowerCase();
  if (gender.includes('male')) {
    voiceName = 'Fenrir'; // Deep male voice
  } else if (gender.includes('female')) {
    voiceName = 'Aoede'; // Female voice
  } else {
    voiceName = 'Puck'; // Neutral
  }

  try {
    const response = await ai.models.generateContent({
      model: MODELS.TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("Dubbing generation failed", e);
    throw e;
  }
};

/**
 * Generates a lip-synced video using Veo.
 * This is a neural simulation that generates video frames matching the dubbed audio content.
 */
export const generateLipSyncVideo = async (
  prompt: string,
  base64Frame: string,
  mimeType: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  try {
    let operation = await ai.models.generateVideos({
      model: MODELS.VIDEO,
      prompt: `A person speaking clearly and naturally: ${prompt}`,
      image: {
        imageBytes: base64Frame,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return undefined;

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': getApiKey(),
      },
    });

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Lip-sync video generation failed", e);
    throw e;
  }
};

/**
 * Text-to-speech generation.
 */
export const textToSpeech = async (text: string, voiceName: 'Kore' | 'Puck' | 'Zephyr' = 'Kore'): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: MODELS.TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioCtx, 24000, 1);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (e) { console.error("TTS saturation", e); }
};

/**
 * Establish a live multimodal translation session.
 */
export const connectLiveTranslation = (callbacks: any, config: any): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  return ai.live.connect({ model: config.model || MODELS.LIVE, callbacks, config: { ...config, model: undefined } });
};

export const fetchSynonyms = async (word: string): Promise<any> => {
  const prompt = `Find synonyms and related terms for the word or phrase: "${word}".
  Return a JSON object with the following structure:
  {
    "synonyms": ["synonym1", "synonym2"],
    "antonyms": ["antonym1", "antonym2"],
    "relatedTerms": ["term1", "term2"]
  }`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
          antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
          relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["synonyms", "antonyms", "relatedTerms"]
      }
    }
  });
  return JSON.parse(response.text || '{"synonyms":[],"antonyms":[],"relatedTerms":[]}');
};

/**
 * Fetches a detailed word definition.
 */
export const fetchWordDefinition = async (word: string, lang: string, contextText: string): Promise<any> => {
  const prompt = `Identify and define the word "${word}" in the context of the following text in ${lang}:
  "${contextText}"
  Return a JSON object:
  {
    "definition": "Clear explanation",
    "context": "How it's used in this specific text",
    "alternative": "A synonym or alternative phrase",
    "type": "technical" | "idiomatic" | "ambiguous" | "important"
  }`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          context: { type: Type.STRING },
          alternative: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['technical', 'idiomatic', 'ambiguous', 'important'] }
        },
        required: ["definition", "context", "alternative", "type"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

/**
 * Generates an offline survival phrasebook for a target language.
 */
export const fetchOfflinePack = async (lang: string): Promise<Record<string, string>> => {
  const prompt = `Generate a JSON object containing 50 essential travel and emergency phrases in ${lang}.
  Keys should be English phrases and values should be ${lang} translations.`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || '{}');
};

/**
 * Translates a website by crawling it using Search Grounding.
 */
export const translateWebsite = async (url: string, targetLang: string): Promise<any> => {
  const prompt = `Summarize and translate the primary content of the website at ${url} into ${targetLang}.`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  return {
    content: sanitizeOutput(response.text || "Could not retrieve content."),
    title: `Translation for ${url}`,
    sources: sources
  };
};

/**
 * Extracts potential glossary terms from a single text.
 */
export const extractGlossaryFromText = async (text: string, lang: string): Promise<SuggestedGlossaryItem[]> => {
  const prompt = `Act as a Neural Terminology Analyst. Scan the following ${lang} text and identify key technical terms, brand names, or recurring domain-specific vocabulary that should be included in a professional glossary.
  
  Text: "${text.slice(0, 5000)}"
  
  Return a JSON array of SuggestedGlossaryItem objects:
  {
    "term": "The identified term",
    "definition": "A concise definition or target translation suggestion",
    "reason": "Why this term was selected (e.g., 'Technical term', 'Recurring brand name')",
    "context": "A short snippet showing how the term is used in the text",
    "priority": "High" | "Medium" | "Low"
  }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              reason: { type: Type.STRING },
              context: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
            },
            required: ["term", "definition", "reason", "context", "priority"]
          }
        }
      }
    });
    const suggestions = JSON.parse(response.text || '[]');
    return suggestions.map((s: any) => ({ 
      ...s, 
      id: generateId(),
      definition: sanitizeOutput(s.definition),
      context: sanitizeOutput(s.context),
      reason: sanitizeOutput(s.reason)
    }));
  } catch (e) {
    console.error("Glossary extraction failed", e);
    return [];
  }
};

/**
 * Extracts glossary terms from a pair of source and target texts.
 */
export const extractGlossaryFromPair = async (sourceText: string, targetText: string, sourceLang: string, targetLang: string): Promise<SuggestedGlossaryItem[]> => {
  const prompt = `Act as a Neural Terminology Extractor. I will provide you with a source text in ${sourceLang} and its corresponding translation in ${targetLang}.
  Your task is to identify key technical terms, recurring phrases, or domain-specific vocabulary and their exact mappings.
  
  Source Text: "${sourceText.slice(0, 3000)}"
  Target Text: "${targetText.slice(0, 3000)}"
  
  Return a JSON array of SuggestedGlossaryItem objects:
  {
    "term": "Source term",
    "definition": "Target translation/definition",
    "reason": "Why this term was selected (e.g., 'Technical term', 'Recurring phrase')",
    "context": "A short snippet showing how the term is used in the source text",
    "priority": "High" | "Medium" | "Low"
  }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              reason: { type: Type.STRING },
              context: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
            },
            required: ["term", "definition", "reason", "context", "priority"]
          }
        }
      }
    });
    const suggestions = JSON.parse(response.text || '[]');
    return suggestions.map((s: any) => ({ 
      ...s, 
      id: generateId(),
      definition: sanitizeOutput(s.definition),
      context: sanitizeOutput(s.context),
      reason: sanitizeOutput(s.reason)
    }));
  } catch (e) {
    console.error("Bilingual glossary extraction failed", e);
    return [];
  }
};

/**
 * Infers glossary terms from translation history.
 */
export const inferGlossaryTerms = async (history: any[], currentGlossary: any[]): Promise<any[]> => {
  const prompt = `Analyze this translation history and suggest 5 new technical or recurring terms to add to a glossary.
  Exclude existing: ${JSON.stringify(currentGlossary)}
  History: ${JSON.stringify(history.slice(0, 5))}
  Return a JSON array of objects with term, definition, reason, context, priority.`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING },
            reason: { type: Type.STRING },
            context: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
          },
          required: ["term", "definition", "reason", "context", "priority"]
        }
      }
    }
  });
  
  const suggestions = JSON.parse(response.text || '[]');
  return suggestions.map((s: any) => ({ ...s, id: generateId() }));
};

/**
 * Translates code or comments within code.
 * Strict implementation: When in 'comments' mode, logic structures are never touched.
 */
export const translateCode = async (code: string, sourceLang: string, target: string, mode: 'comments' | 'logic', useGrounding: boolean = false): Promise<{ text: string; sources?: { uri: string; title: string }[] }> => {
  const instruction = mode === 'comments' 
    ? `Act as a specialized developer-translator. In the following ${sourceLang} code, translate ONLY the text found inside comments (//, /* */, #, etc.) or docstrings into ${target}. 
       CRITICAL: Do NOT translate or modify any variable names, function names, logic flow, syntax, or keywords. The code structure must remain 100% functional and unchanged. 
       Return the full source code with only the comment text translated.`
    : `Translate the following ${sourceLang} code or logic into ${target} syntax or natural language as appropriate. Preserve structural intent.`;

  const prompt = `${instruction}\n\nCode Buffer:\n\`\`\`\n${code}\n\`\`\``;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      tools: useGrounding ? [{ googleSearch: {} }] : []
    }
  });
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    .map(chunk => ({ uri: chunk.web!.uri, title: chunk.web!.title }));

  return {
    text: response.text || '',
    sources: sources
  };
};

/**
 * Compares two documents and provides a detailed delta report.
 */
export const compareDocuments = async (textA: string, textB: string, field: ProfessionalField): Promise<ComparisonReport> => {
  const prompt = `Compare these two ${field} documents.
  Document A: ${textA.slice(0, 1000)}
  Document B: ${textB.slice(0, 1000)}
  Return JSON ComparisonReport.`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          similarityScore: { type: Type.NUMBER },
          optimizedSynthesis: { type: Type.STRING },
          differences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['Structural', 'Linguistic', 'Semantic'] },
                severity: { type: Type.STRING, enum: ['Minor', 'Moderate', 'Critical'] },
                fragmentA: { type: Type.STRING },
                fragmentB: { type: Type.STRING },
                analysis: { type: Type.STRING }
              }
            }
          }
        },
        required: ["summary", "similarityScore", "optimizedSynthesis", "differences"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

/**
 * Detects text with bounding boxes and translates it for in-painting.
 */
export const detectAndTranslateLayout = async (base64Data: string, mimeType: string, targetLang: string): Promise<any> => {
  const prompt = `Act as a Neural Layout Architect. Detect all text blocks in this document/image.
  For each block, provide:
  1. The original text.
  2. The translated text in ${targetLang}.
  3. The bounding box coordinates [ymin, xmin, ymax, xmax] in normalized coordinates (0-1000).
  4. The font size (relative to height).
  5. The background color (hex) and text color (hex) to match the original style.
  
  Return a JSON object:
  {
    "blocks": [
      {
        "original": string,
        "translated": string,
        "box_2d": [number, number, number, number],
        "fontSize": number,
        "backgroundColor": string,
        "textColor": string
      }
    ]
  }`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.IMAGE,
      contents: { 
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } }, 
          { text: prompt }
        ] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  translated: { type: Type.STRING },
                  box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                  fontSize: { type: Type.NUMBER },
                  backgroundColor: { type: Type.STRING },
                  textColor: { type: Type.STRING }
                },
                required: ["original", "translated", "box_2d", "fontSize", "backgroundColor", "textColor"]
              }
            }
          },
          required: ["blocks"]
        }
      }
    });
    return JSON.parse(response.text || '{"blocks": []}');
  } catch (e) {
    console.error("Layout detection failed", e);
    throw e;
  }
};

/**
 * Translates spreadsheet sheets.
 */
export const translateSpreadsheetContent = async (sheets: any[], targetLang: string, field: ProfessionalField): Promise<any[]> => {
  const prompt = `Translate spreadsheet sheets to ${targetLang} specializing in ${field}.
  Sheets Data: ${JSON.stringify(sheets)}
  CRITICAL: You MUST preserve the EXACT structure of the JSON array and all nested objects. Only translate the string values that represent cell content. Do NOT modify any keys or structural elements.
  Return JSON array of sheets with translated data values.`;

  const response = await safeGenerateContent({
    model: MODELS.TEXT,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || '[]');
};

/**
 * Analyzes cultural nuances and potential pitfalls for a translation.
 */
export async function analyzeCulturalNuances(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{
  nuances: { term: string; explanation: string; suggestion: string }[];
  idioms: { original: string; meaning: string; equivalent: string }[];
  sensitivity: { issue: string; severity: 'Low' | 'Medium' | 'High'; advice: string }[];
}> {
  const prompt = `
    Analyze the following text for cultural nuances, idioms, and potential sensitivities when translating from ${sourceLang} to ${targetLang}.
    
    Text: "${text}"
    
    Provide the analysis in JSON format with the following structure:
    {
      "nuances": [
        { "term": "string", "explanation": "why this is a nuance", "suggestion": "how to handle it" }
      ],
      "idioms": [
        { "original": "the idiom", "meaning": "literal/intended meaning", "equivalent": "target language equivalent" }
      ],
      "sensitivity": [
        { "issue": "potential problem", "severity": "Low|Medium|High", "advice": "how to avoid offense" }
      ]
    }
  `;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{"nuances":[], "idioms":[], "sensitivity":[]}');
  } catch (error) {
    console.error("Cultural analysis failed:", error);
    return { nuances: [], idioms: [], sensitivity: [] };
  }
}

/**
 * Applies post-translation improvements (styling, grammar, humanizing, etc.)
 */
export async function improveTranslation(
  sourceText: string,
  translatedText: string,
  targetLang: string,
  improvementType: ImprovementType
): Promise<{ improvedText: string; explanation: string }> {
  const prompt = `
    You are an expert linguist and native speaker of ${targetLang}.
    Your task is to improve the following translation based on the requested improvement type.

    Improvement Type: ${improvementType}
    
    Instructions for each type:
    - humanize: Make the text sound more natural, conversational, and less like a machine translation. Use native idioms where appropriate.
    - grammar: Fix any grammatical errors, awkward phrasing, or typos without changing the core meaning.
    - simplify: Make the text easier to read and understand. Use simpler vocabulary and shorter sentences.
    - formalize: Elevate the tone to be more professional, academic, or formal.
    - creative: Add flair and creativity to the text, making it more engaging (good for marketing).
    - shorten: Make the text more concise and punchy, removing unnecessary words.
    - expand: Elaborate on the text, adding more detail or descriptive language while keeping the original meaning.

    Source Text:
    "${sourceText}"

    Current Translation (${targetLang}):
    "${translatedText}"

    Return the result as a JSON object with the following structure:
    {
      "improvedText": "The improved translation",
      "explanation": "A brief explanation of what was changed and why."
    }
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            improvedText: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['improvedText', 'explanation'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      improvedText: result.improvedText || translatedText,
      explanation: result.explanation || 'No explanation provided.',
    };
  } catch (error) {
    console.error('Error improving translation:', error);
    throw new Error('Failed to improve translation.');
  }
}

/**
 * Refines a translation based on audit findings and style guide constraints.
 */
export async function refineTranslation(
  sourceText: string,
  currentTranslation: string,
  targetLang: string,
  field: ProfessionalField,
  persona: LinguisticPersona | string,
  auditFindings?: string
): Promise<{ refinedText: string; explanation: string }> {
  const personaName = typeof persona === 'string' ? persona : persona.name;
  const prompt = `
    Act as a Senior Neural Post-Editor. Your task is to refine the following translation to improve its quality, accuracy, and adherence to the specified style and field conventions.
    
    Source Text: "${sourceText}"
    Current Translation: "${currentTranslation}"
    Target Language: ${targetLang}
    Professional Field: ${field}
    Linguistic Persona: ${personaName}
    ${auditFindings ? `LQA Audit Findings: ${auditFindings}` : ''}
    
    CRITICAL INSTRUCTIONS:
    1. Improve the translation based on the provided audit findings (if any).
    2. Ensure the tone and style match the ${personaName} persona.
    3. Use terminology appropriate for the ${field} field.
    4. Maintain the original meaning while improving fluency and naturalness.
    
    Provide the response in JSON format:
    {
      "refinedText": "the improved translation",
      "explanation": "a brief explanation of the key changes made and why"
    }
  `;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || '{"refinedText": "", "explanation": ""}');
    return {
      refinedText: sanitizeOutput(result.refinedText || currentTranslation),
      explanation: sanitizeOutput(result.explanation || "No major changes required.")
    };
  } catch (error) {
    console.error("Refinement failed:", error);
    return {
      refinedText: currentTranslation,
      explanation: "Refinement failed due to an error."
    };
  }
}

export async function healTranslationMemory(entries: TranslationMemoryEntry[]): Promise<TranslationMemoryEntry[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not found");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an expert localization engineer and linguist. Your task is to review a set of Translation Memory (TM) entries and perform a "self-healing" process.
For each entry, you must:
1. Evaluate the translation quality and accuracy.
2. Provide a confidence score from 0 to 100.
3. If the translation is poor, outdated, or inconsistent, flag it and provide better alternatives.
4. If the translation is excellent, mark it as active.

Here are the entries to review:
${JSON.stringify(entries.map(e => ({ id: e.id, source: e.sourceSegment, target: e.targetSegment, sourceLang: e.sourceLang, targetLang: e.targetLang })), null, 2)}
`;

  const response = await ai.models.generateContent({
    model: MODELS.COMPLEX,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            status: { type: Type.STRING, description: "One of: 'active', 'flagged', 'deprecated'" },
            confidenceScore: { type: Type.NUMBER, description: "Score from 0 to 100" },
            healingSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Suggested better translations if flagged or deprecated"
            }
          },
          required: ["id", "status", "confidenceScore"]
        }
      }
    }
  });

  const results = JSON.parse(response.text || "[]");
  
  return entries.map(entry => {
    const result = results.find((r: any) => r.id === entry.id);
    if (result) {
      return {
        ...entry,
        status: result.status,
        confidenceScore: result.confidenceScore,
        healingSuggestions: result.healingSuggestions || [],
        lastHealed: Date.now()
      };
    }
    return entry;
  });
}

export async function generateDojoChallenge(
  sourceLang: string, 
  targetLang: string, 
  field: string, 
  difficulty: string
): Promise<{ sourceText: string; context: string; difficulty: string; hints: string[] }> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `You are a Senior Localization Trainer. Create a translation challenge for a linguist training to translate from ${sourceLang} to ${targetLang} in the field of ${field}.
  The difficulty level is ${difficulty}.
  
  Beginner: Simple sentences, basic vocabulary.
  Intermediate: Idioms, industry-specific terms, slightly complex grammar.
  Advanced: Nuanced cultural references, highly technical jargon, ambiguous phrasing.
  Master: Extremely difficult wordplay, deep cultural localization, complex marketing transcreation.
  
  Return a JSON object with:
  {
    "sourceText": "The text to be translated",
    "context": "Brief context or brief for the translator",
    "difficulty": "${difficulty}",
    "hints": ["Hint 1", "Hint 2"]
  }`;

  const response = await ai.models.generateContent({
    model: MODELS.COMPLEX,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");
}

export async function evaluateDojoTranslation(
  sourceText: string,
  userTranslation: string,
  sourceLang: string,
  targetLang: string,
  context: string
): Promise<{ score: number; feedback: string; mqm: any; betterAlternative: string }> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `You are a strict but fair Senior Localization Reviewer.
  Evaluate the following translation from ${sourceLang} to ${targetLang}.
  
  Context: ${context}
  Source: "${sourceText}"
  User Translation: "${userTranslation}"

  Score the translation from 0 to 100 based on MQM (Multidimensional Quality Metrics) standards.
  Provide a JSON response with:
  {
    "score": number,
    "feedback": "Overall feedback message (encouraging but critical)",
    "mqm": {
      "accuracy": "Feedback on accuracy (mistranslations, omissions)",
      "fluency": "Feedback on fluency (grammar, spelling, naturalness)",
      "style": "Feedback on style/tone (register, company style)",
      "terminology": "Feedback on terminology (glossary adherence, industry terms)"
    },
    "betterAlternative": "Your suggested perfect translation"
  }`;

  const response = await ai.models.generateContent({
    model: MODELS.COMPLEX,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeSentimentAndTone(
  sourceText: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string
): Promise<{
  metrics: { metric: string; sourceScore: number; targetScore: number }[];
  analysis: string;
  warnings: string[];
}> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `You are an expert in cross-cultural sentiment analysis and psycholinguistics.
  Analyze the emotional tone and sentiment of the following source text (${sourceLang}) and its translation (${targetLang}).
  
  Source Text: "${sourceText}"
  Translated Text: "${translatedText}"

  Score both texts from 0 to 100 on the following 5 metrics:
  1. Formality (0 = highly informal, 100 = highly formal)
  2. Empathy (0 = cold/detached, 100 = highly empathetic/warm)
  3. Urgency (0 = relaxed, 100 = highly urgent/demanding)
  4. Positivity (0 = negative/pessimistic, 100 = highly positive/optimistic)
  5. Authority (0 = submissive/uncertain, 100 = highly authoritative/confident)

  Provide a JSON response with:
  {
    "metrics": [
      { "metric": "Formality", "sourceScore": number, "targetScore": number },
      { "metric": "Empathy", "sourceScore": number, "targetScore": number },
      { "metric": "Urgency", "sourceScore": number, "targetScore": number },
      { "metric": "Positivity", "sourceScore": number, "targetScore": number },
      { "metric": "Authority", "sourceScore": number, "targetScore": number }
    ],
    "analysis": "A brief paragraph explaining the emotional shift or consistency between the source and target.",
    "warnings": ["Array of specific warnings if there is a dangerous tone mismatch (e.g., 'Target sounds too aggressive compared to source'). Empty array if fine."]
  }`;

  const response = await ai.models.generateContent({
    model: MODELS.COMPLEX,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeLegalCompliance(
  sourceText: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string,
  region: string,
  domain: string
): Promise<{
  status: 'compliant' | 'warning' | 'critical';
  issues: { severity: 'warning' | 'critical'; text: string; explanation: string; suggestion: string }[];
  summary: string;
}> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `You are an expert in international law, compliance, and cross-border localization.
  Analyze the following translation for legal and compliance risks in the target region.
  
  Source Text (${sourceLang}): "${sourceText}"
  Translated Text (${targetLang}): "${translatedText}"
  Target Region/Jurisdiction: ${region}
  Industry/Domain: ${domain}

  Check for:
  1. Regulatory compliance (e.g., GDPR, HIPAA, CCPA, local advertising laws).
  2. Legally binding terminology mismatches (e.g., "warranty" vs "guarantee", "liability").
  3. Cultural-legal taboos or prohibited claims in the target region.

  Provide a JSON response with:
  {
    "status": "compliant" | "warning" | "critical",
    "issues": [
      {
        "severity": "warning" | "critical",
        "text": "The specific problematic phrase in the translation",
        "explanation": "Why this is a legal/compliance risk in the target region",
        "suggestion": "A legally safer alternative translation"
      }
    ],
    "summary": "A brief executive summary of the legal readiness of this translation."
  }`;

  const response = await ai.models.generateContent({
    model: MODELS.COMPLEX,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");
}

export async function optimizeForSEO(
  sourceText: string,
  targetLang: string,
  targetMarket: string,
  keywords: string[]
): Promise<{ optimizedText: string; adaptations: { original: string; adapted: string; reason: string; volume: number }[] }> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `You are an expert Multilingual SEO Optimizer and Localization Specialist.
  Translate and optimize the following text for the ${targetMarket} market in ${targetLang}.
  Target Keywords: ${keywords.join(', ')}

  Adapt the terminology to match what local users actually search for in ${targetMarket} (e.g., "sneakers" to "trainers" in the UK, or "cell phone" to "Handy" in Germany).
  
  Source Text:
  "${sourceText}"

  Return a JSON object with:
  1. "optimizedText": The localized and SEO-optimized text.
  2. "adaptations": An array of keyword adaptations made, with properties: "original" (the source keyword), "adapted" (the localized keyword used), "reason" (why this is better for SEO in this market), and "volume" (a realistic estimated monthly search volume number for the adapted keyword in that market).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedText: { type: Type.STRING },
            adaptations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  adapted: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  volume: { type: Type.NUMBER },
                },
                required: ['original', 'adapted', 'reason', 'volume'],
              },
            },
          },
          required: ['optimizedText', 'adaptations'],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error optimizing for SEO:', error);
    throw new Error('Failed to optimize text for SEO.');
  }
}

/**
 * Anonymizes PII in text by replacing it with placeholders.
 */
export async function anonymizeText(
  text: string,
  typesToMask: string[]
): Promise<{ maskedText: string; piiMap: Record<string, string>; detectedEntities: { type: string; value: string; placeholder: string }[] }> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `You are an enterprise data security and PII masking engine.
  Analyze the following text and mask the requested types of Personally Identifiable Information (PII).
  
  Types to mask: ${typesToMask.join(', ')}
  
  Replace each detected entity with a unique placeholder in the format [TYPE_ID] (e.g., [PERSON_1], [EMAIL_1], [CREDIT_CARD_1], [PHONE_1], [LOCATION_1], [ORG_1]).
  
  Source Text:
  "${text}"
  
  Return a JSON object with:
  1. "maskedText": The text with PII replaced by placeholders.
  2. "piiMap": A key-value map of placeholders to their original values (e.g., {"[PERSON_1]": "John Doe"}).
  3. "detectedEntities": An array of objects detailing what was found: [{ "type": "PERSON", "value": "John Doe", "placeholder": "[PERSON_1]" }]
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            maskedText: { type: Type.STRING },
            piiMap: { type: Type.OBJECT },
            detectedEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  value: { type: Type.STRING },
                  placeholder: { type: Type.STRING },
                },
                required: ['type', 'value', 'placeholder'],
              },
            },
          },
          required: ['maskedText', 'piiMap', 'detectedEntities'],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error anonymizing text:', error);
    throw new Error('Failed to anonymize text.');
  }
}

/**
 * Unmasks PII in translated text by replacing placeholders with original values.
 */
export function unmaskText(maskedText: string, piiMap: Record<string, string>): string {
  let result = maskedText;
  for (const [placeholder, value] of Object.entries(piiMap)) {
    // Escape the brackets for the regex
    const escapedPlaceholder = placeholder.replace(/\\[/g, '\\\\[').replace(/\\]/g, '\\\\]');
    const regex = new RegExp(escapedPlaceholder, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

export async function translateToSignLanguageGloss(
  text: string,
  targetSignLanguage: string = 'American Sign Language (ASL)'
): Promise<{ gloss: string; explanation: string }> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `You are an expert in Deaf culture and sign language linguistics.
  Translate the following text into ${targetSignLanguage} Gloss.
  
  Source Text: "${text}"
  
  Sign language gloss is a written system used to indicate what signs to use. It is typically written in ALL CAPS, drops unnecessary articles (a, an, the) and "to be" verbs, and follows the specific grammar and word order of the target sign language (e.g., Time-Topic-Comment for ASL).
  
  Provide a JSON response with:
  {
    "gloss": "THE GLOSSED TEXT IN ALL CAPS",
    "explanation": "A brief explanation of the grammatical structure and why certain words were dropped or reordered."
  }`;

  const response = await ai.models.generateContent({
    model: MODELS.COMPLEX,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");
}

export const processHtmlImagesForOCR = async (html: string): Promise<string> => {
  const imgRegex = /<img[^>]+src="data:([^;]+);base64,([^"]+)"[^>]*>/gi;
  let newHtml = html;
  const matches = [...html.matchAll(imgRegex)];
  
  if (matches.length === 0) return html;

  for (const match of matches) {
    const fullTag = match[0];
    const mimeType = match[1];
    const base64 = match[2];
    
    try {
      const extractedText = await extractTextFromAsset(base64, mimeType);
      
      const newContent = `
        <div class="ocr-image-extracted" style="border: 1px dashed #ccc; padding: 10px; margin: 10px 0;">
          <em>[Extracted Text from Embedded Image]</em>
          <blockquote>${extractedText.replace(/\n/g, '<br/>')}</blockquote>
        </div>
      `;
      newHtml = newHtml.replace(fullTag, newContent);
    } catch (e) {
      console.error("Failed to OCR image", e);
    }
  }
  
  return newHtml;
};
