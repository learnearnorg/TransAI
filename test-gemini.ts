import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Got API Key:", !!process.env.GEMINI_API_KEY);
  fs.writeFileSync('test.docx', 'PK\x03\x04Hello World'); // fake docx
  try {
     const up = await ai.files.upload({ file: 'test.docx' });
     console.log("Success", !!up.name);
  } catch(e) {
     console.error(e);
  }
}
run();
