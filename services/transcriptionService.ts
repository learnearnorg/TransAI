import { SchemaType as Type } from "@google/generative-ai";
import { MODELS } from "../constants";
import { safeGenerateContent } from "./geminiService";

/**
 * Transcribes audio data using Gemini's multimodal capabilities.
 * @param base64Data The audio data in base64 format.
 * @param mimeType The standard MIME type of the audio data.
 * @param lang The expected language of the speech.
 * @param modelName Optional model override for different recognition qualities.
 */
export const transcribeAudio = async (
  base64Data: string, 
  mimeType: string, 
  lang: string,
  modelName: string = MODELS.LIVE
): Promise<string> => {
  const prompt = `Transcribe the provided audio into text accurately. 
  Language: ${lang}. 
  If the speech is unclear, provide the most likely interpretation. 
  Return ONLY the transcription text.`;

  try {
    const response = await safeGenerateContent({
      model: modelName,
      contents: {
        parts: [
          { 
            inlineData: { 
              data: base64Data, 
              mimeType: mimeType 
            } 
          },
          { text: prompt }
        ]
      }
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Neural transcription failed:", error);
    throw error;
  }
};

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Transcribes audio data with timestamps for segmentation.
 */
export const transcribeFileWithTimestamps = async (
  file: File,
  lang: string
): Promise<TranscriptionSegment[]> => {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
    
    return await transcribeWithTimestamps(base64Data, file.type || 'audio/webm', lang);
  } catch (error: any) {
    console.error("Frontend Transcription Error:", error);
    throw new Error(`Failed to transcribe video via frontend inline data: ${error.message}`);
  }
};

export const transcribeWithTimestamps = async (
  base64Data: string,
  mimeType: string,
  lang: string
): Promise<TranscriptionSegment[]> => {
  const prompt = `Transcribe the provided audio into segments with start and end timestamps in seconds.
  Language: ${lang}.
  Break the transcription into natural sentences or phrases.
  Return a JSON array of objects with 'start', 'end', and 'text' fields.`;

  try {
    const response = await safeGenerateContent({
      model: MODELS.TEXT,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              text: { type: Type.STRING }
            },
            required: ["start", "end", "text"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Neural timestamped transcription failed:", error);
    return [];
  }
};
