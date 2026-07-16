const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Got API Key:", !!process.env.GEMINI_API_KEY);
  fs.writeFileSync('test.txt', 'Hello World');
  try {
     const up = await ai.files.upload({ file: 'test.txt' });
     console.log("Success", up);
  } catch(e) {
     console.error(e);
  }
}
run();
