
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from "@google/genai";
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createProxyMiddleware } from 'http-proxy-middleware';
import mime from 'mime-types';

// Load .env file if it exists and populate process.env
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8').replace(/\r/g, '');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        // Remove quotes if present
        if (val.length > 0 && val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.length > 0 && val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val.trim();
      }
    });
    console.log('[ENV] Loaded environment variables from .env file successfully.');
  }
} catch (e) {
  console.error('[ENV] Failed to load .env file:', e);
}

const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

function formatGeminiError(err: any): string {
  if (!err) return 'Unknown error during neural processing.';
  
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
    return `Google API Key Disruption (403 Permission Denied): You are using an unrestricted Gemini API Key. Google is temporarily disrupting access as a preview of restriction enforcement. To restore functionality immediately, you must restrict your key in the Google Cloud Console. Follow these steps:
1. Open https://console.cloud.google.com/apis/credentials in your browser.
2. Select your API Key from the list.
3. Under "API restrictions", select "Restrict key".
4. Add "Generative Language API" (which powers Gemini) to the list of allowed APIs.
5. Save changes and wait 5-10 minutes for Google to sync.
Alternatively, generate a new restricted key inside Google AI Studio or use a properly restricted key.`;
  }
  
  if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') || status === 400) {
    return `Neural Credentials Rejected: The provided Gemini API key is invalid or has expired. Please double-check it in settings or the Secret Vault.`;
  }

  if (status === 429 || msg.includes('quota') || msg.includes('QUOTA_EXCEEDED') || msg.includes('Rate limit')) {
    return `Quota Exceeded (429): The neural engine rate limit or daily quota has been exceeded. Please try again in a moment.`;
  }

  return msg || err.toString();
}

function isExpectedApiKeyOrQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const raw = err.toString().toLowerCase();
  const status = err.status || err.code || 500;
  
  return (
    msg.includes('unrestricted') ||
    msg.includes('disruption') ||
    msg.includes('permission_denied') ||
    msg.includes('api key not valid') ||
    msg.includes('api_key_invalid') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('403') ||
    raw.includes('unrestricted') ||
    raw.includes('disruption') ||
    raw.includes('permission_denied') ||
    raw.includes('api key not valid') ||
    raw.includes('403') ||
    raw.includes('429') ||
    status === 403 ||
    status === 429
  );
}

const getValidApiKey = (req: express.Request): string | undefined => {
  const apiKeyHeader = req.headers['x-api-key'] as string;
  let apiKeyRaw = apiKeyHeader && apiKeyHeader !== 'undefined' ? apiKeyHeader : undefined;
  
  const placeholders = ['MY_GEMINI_API_KEY', 'YOUR_API_KEY', 'AISTUDIO_PROXY_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'undefined', 'null', '', '""', "''"];
  
  const isPlaceholder = (val: string | undefined): boolean => {
    if (!val) return true;
    const cleaned = val.replace(/^["']|["']$/g, '').trim();
    if (placeholders.includes(cleaned)) return true;
    // Overly defensive check for platform placeholders
    // Only reject if it's the generic MY_GEMINI_API_KEY or similar
    if (cleaned === 'MY_GEMINI_API_KEY' || cleaned === 'MY_VITE_GEMINI_API_KEY' || cleaned === 'YOUR_GEMINI_API_KEY') return true;
    if (cleaned.length < 5) return true;
    return false;
  };

  if (isPlaceholder(apiKeyRaw)) {
    const envKeys = [
      { name: 'API', val: process.env.API },
      { name: 'API_KEY', val: process.env.API_KEY },
      { name: 'GEMINI_API_KEY', val: process.env.GEMINI_API_KEY },
      { name: 'GOOGLE_API_KEY', val: process.env.GOOGLE_API_KEY },
      { name: 'VITE_GEMINI_API_KEY', val: process.env.VITE_GEMINI_API_KEY },
      { name: 'NEXT_PUBLIC_GEMINI_API_KEY', val: process.env.NEXT_PUBLIC_GEMINI_API_KEY },
      { name: 'GOOGLE_GENERATIVE_AI_API_KEY', val: process.env.GOOGLE_GENERATIVE_AI_API_KEY },
      { name: 'AISTUDIO_PROXY_TOKEN', val: process.env.AISTUDIO_PROXY_TOKEN },
      { name: 'aistudio_apiKey', val: (process.env as any).aistudio_apiKey }
    ];
    
    const found = envKeys.find(k => k.val && !isPlaceholder(k.val));
    if (found) {
      apiKeyRaw = found.val;
      console.log(`[AUTH] Identified valid auth token from env: ${found.name}`);
    } else {
      const pFound = envKeys.find(k => k.val && k.val.length > 0);
      if (pFound) {
        console.warn(`[AUTH] Variable ${pFound.name} is a placeholder: ${pFound.val?.substring(0, 10)}...`);
      }
    }
  }
  
  if (isPlaceholder(apiKeyRaw)) return undefined;
  
  return apiKeyRaw!.trim().replace(/^["']|["']$/g, '').trim();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    let originalName = file.originalname || 'uploaded_file';
    try {
      originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    } catch (e) {}
    
    let ext = path.extname(originalName);
    if (encodeURIComponent(ext).length > 20) {
      ext = ext.substring(0, 10);
    }
    const nameChars = Array.from(path.basename(originalName, ext));
    
    let safeName = nameChars.join('');
    let encoded = encodeURIComponent(safeName + ext);
    while (encoded.length > 200 && nameChars.length > 0) {
      nameChars.pop();
      safeName = nameChars.join('');
      encoded = encodeURIComponent(safeName + ext);
    }
    
    cb(null, `${Date.now()}-${encoded}`);
  }
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`Created uploads directory: ${UPLOADS_DIR}`);
  }

  const envStatus: any = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 4)}... (length: ${process.env.GEMINI_API_KEY.length})` : 'MISSING',
    API_KEY: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 4)}... (length: ${process.env.API_KEY.length})` : 'MISSING',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? `${process.env.GOOGLE_API_KEY.substring(0, 4)}... (length: ${process.env.GOOGLE_API_KEY.length})` : 'MISSING',
    VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY ? `${process.env.VITE_GEMINI_API_KEY.substring(0, 4)}... (length: ${process.env.VITE_GEMINI_API_KEY.length})` : 'MISSING',
  };

  // Log any other suspicious keys
  Object.keys(process.env).forEach(key => {
    if ((key.includes('KEY') || key.includes('AUTH') || key.includes('TOKEN')) && !envStatus[key]) {
      const val = process.env[key];
      envStatus[key] = val ? `${val.substring(0, 2)}... (len: ${val.length})` : 'EMPTY';
    }
  });

  fs.writeFileSync(path.join(process.cwd(), 'env-output.json'), JSON.stringify(envStatus, null, 2));

  // 1. ABSOLUTE TOP: Trace AND Diagnostic Headers for EVERY response
  app.use((req, res, next) => {
    const traceId = Math.random().toString(36).substring(7);
    const start = Date.now();
    
    // Set headers immediately
    res.setHeader('X-TransAI-Trace-ID', traceId);
    res.setHeader('X-TransAI-App-State', process.env.NODE_ENV || 'development');
    
    const logMsg = `[REQ-START] ${traceId} ${req.method} ${req.originalUrl} - IP: ${req.ip} - ${new Date().toISOString()}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'access.log'), logMsg);
    if ((req.originalUrl || req.url).toLowerCase().startsWith('/api/')) {
      console.log(logMsg.trim());
    }

    // Track response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const endMsg = `[REQ-END] ${traceId} ${res.statusCode} ${duration}ms\n`;
      fs.appendFileSync(path.join(process.cwd(), 'access.log'), endMsg);
      if ((req.originalUrl || req.url).toLowerCase().startsWith('/api/')) {
        console.log(endMsg.trim());
      }
    });

    next();
  });

  // 2. Body Parser (limit slightly higher to catch & reject specifically in middleware)
  app.use(express.json({ limit: '60mb' }));

  // 3. Early API Path Diagnostic & Safety
  app.use((req, res, next) => {
    const url = (req.originalUrl || req.url).toLowerCase();
    const traceId = res.getHeader('X-TransAI-Trace-ID');

    if (url.startsWith('/api/')) {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 32 * 1024 * 1024) {
        console.warn(`[REQ-BLOCK-413] ${traceId} Payload too large: ${contentLength} @ ${url}`);
        res.setHeader('X-TransAI-Path', 'Safety-Gate-413');
        return res.status(413).json({ 
          error: 'Payload Too Large', 
          message: 'The uploaded file exceeds the 32MB infrastructure limit.',
          traceId 
        });
      }
    }
    next();
  });

  try {
    const server = createServer(app);
    const wss = new WebSocketServer({ server });

  // Enable simple CORS for easier local testing
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.get('/api/debug/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  app.get('/api/auth/status', (req, res) => {
    try {
      const mockReq = { headers: {} } as express.Request;
      const apiKey = getValidApiKey(mockReq);
      res.json({ hasKey: !!apiKey });
    } catch (e) {
      res.status(500).json({ error: 'Failed to verify API key status', hasKey: false });
    }
  });

  app.get('/api/debug/env', (req, res) => {
    res.json({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 4)}...${process.env.GEMINI_API_KEY.length}` : 'MISSING',
      API_KEY: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 4)}...${process.env.API_KEY.length}` : 'MISSING',
      API: process.env.API ? `${process.env.API.substring(0, 4)}...${process.env.API.length}` : 'MISSING'
    });
  });

  // Vault API
  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext || '')) return 'AUDIO';
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) return 'EXCEL';
    if (['txt', 'glossary', 'json'].includes(ext || '')) return 'GLOSSARY';
    if (['pdf'].includes(ext || '')) return 'PDF';
    if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext || '')) return 'IMAGE';
    return 'DOC';
  };

  app.get(['/api/vault', '/api/vault/'], (req, res) => {
    res.setHeader('X-TransAI-Path', 'Vault-List-API');
    try {
      const files = fs.readdirSync(UPLOADS_DIR)
        .filter(filename => {
          const filePath = path.join(UPLOADS_DIR, filename);
          return fs.statSync(filePath).isFile();
        })
        .map(filename => {
          const filePath = path.join(UPLOADS_DIR, filename);
          const stats = fs.statSync(filePath);
          const originalName = filename.split('-').slice(1).join('-');
          let decodedName = originalName;
          try {
            decodedName = decodeURIComponent(originalName);
          } catch (e) {}
          
          return {
            id: filename,
            name: decodedName,
            size: stats.size,
            type: getFileType(decodedName),
            mimeType: mime.lookup(decodedName) || 'application/octet-stream',
            timestamp: stats.mtimeMs,
            processed: false
          };
        });
      res.json(files);
    } catch (err) {
      console.error("Error reading vault:", err);
      res.status(500).json({ error: "Failed to read vault" });
    }
  });

  app.post(['/api/vault/upload', '/api/vault/upload/'], (req, res) => {
    res.setHeader('X-TransAI-Path', 'Vault-Upload-API');
    console.log(`[UPLOAD-START] ${req.method} ${req.url} - Content-Length: ${req.headers['content-length']}`);
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error("[UPLOAD-MULTER-ERROR]:", err);
        return res.status(400).json({ error: err.message || "File upload failed" });
      }
      try {
        if (!req.file) {
          console.error("[UPLOAD-ERROR] No file in request");
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const decodedName = decodeURIComponent(req.file.filename.split('-').slice(1).join('-'));
        const mimeType = (req.file.mimetype === 'application/octet-stream' || !req.file.mimetype)
          ? (mime.lookup(decodedName) || 'application/octet-stream')
          : req.file.mimetype;
          
        console.log(`[UPLOAD-SUCCESS] ${req.file.filename} (${req.file.size} bytes)`);

        res.json({
          id: req.file.filename,
          name: decodedName,
          size: req.file.size,
          type: getFileType(decodedName),
          mimeType: mimeType,
          timestamp: Date.now(),
          processed: false
        });
      } catch (err) {
        console.error("[UPLOAD-PROC-ERROR]:", err);
        res.status(500).json({ error: "Failed to process upload" });
      }
    });
  });

  app.get(['/api/vault/upload', '/api/vault/upload/'], (req, res) => {
    console.warn(`[DEBUG-WRONG-METHOD] GET request to ${req.originalUrl} from ${req.ip}`);
    res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: 'This endpoint requires POST for file uploads.',
      debug: { method: req.method, url: req.originalUrl }
    });
  });

  app.get('/api/vault/download/:id', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.id);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  app.post('/api/vault/process/:id', async (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.id);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    try {
      const apiKey = getValidApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'GEMINI_API_KEY is not configured or is a placeholder.',
          message: 'Please provide a valid Gemini API key in the application settings (top right gear icon).'
        });
      }
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      
      const decodedName = decodeURIComponent(req.params.id.split('-').slice(1).join('-'));
      const mimeType = mime.lookup(decodedName) || 'application/octet-stream';

      // 1. Upload the file using the Gemini File API
      const uploadResult = await ai.files.upload({
        file: filePath,
        config: {
          mimeType: mimeType,
          displayName: decodedName
        }
      });

      // 2. Wait for the file to be processed (if it's a large PDF/video)
      let fileState = await ai.files.get({ name: uploadResult.name });
      while (fileState.state === 'PROCESSING') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        fileState = await ai.files.get({ name: uploadResult.name });
      }

      if (fileState.state === 'FAILED') {
        throw new Error("File processing failed on Gemini servers.");
      }

      const prompt = `You are an expert OCR and document transcription engine.
      Please extract all the text from this document with the highest possible accuracy.
      
      CRITICAL INSTRUCTIONS:
      1. Maintain the EXACT original formatting, structure, indentation, and layout as much as possible using Markdown.
      2. If it's a form, table, or structured list, represent it with 100% structural fidelity.
      3. If this document contains any embedded images, thoroughly analyze those images and extract all text from them (OCR) as part of your transcription, inserting the extracted text where the images appear.
      4. Replace any manual signatures, handwritten signatures, or signature lines with the text "(signed)".
      5. Replace any visual stamps, official seals, company stamps, or logos functioning as seals with the text "(seal)".
      6. Do not include any conversational filler. Return ONLY the extracted text content.`;

      // 3. Generate content using the uploaded file URI
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
          {
            fileData: {
              fileUri: uploadResult.uri,
              mimeType: uploadResult.mimeType
            }
          },
          { text: prompt }
        ]
      });

      // 4. Clean up the file
      try {
        await ai.files.delete({ name: uploadResult.name });
      } catch (cleanupErr) {
        console.warn("Failed to clean up file from Gemini API:", cleanupErr);
      }

      res.json({ text: response.text || '' });
    } catch (err: any) {
      if (isExpectedApiKeyOrQuotaError(err)) {
        console.warn(`File process warning: Expected API credentials or restriction limit hit (Status: ${err.status || err.code}).`);
      } else {
        console.error("Error processing file:", err);
      }
      const formattedError = formatGeminiError(err);
      res.status(500).json({ error: formattedError });
    }
  });

  app.post('/api/vault/transcribe', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const lang = req.body.lang || 'Auto';
    const filePath = req.file.path;

    try {
      const apiKey = getValidApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'GEMINI_API_KEY is not configured or is a placeholder.',
          message: 'Please provide a valid Gemini API key in the application settings (top right gear icon).'
        });
      }
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      
      const decodedName = decodeURIComponent(req.file.filename.split('-').slice(1).join('-'));
      const mimeType = mime.lookup(decodedName) || 'application/octet-stream';

      // 1. Upload the file using the Gemini File API
      const uploadResult = await ai.files.upload({
        file: filePath,
        config: {
          mimeType: mimeType,
          displayName: decodedName
        }
      });

      // 2. Wait for the file to be processed
      let fileState = await ai.files.get({ name: uploadResult.name });
      while (fileState.state === 'PROCESSING') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        fileState = await ai.files.get({ name: uploadResult.name });
      }

      if (fileState.state === 'FAILED') {
        throw new Error("File processing failed on Gemini servers.");
      }

      const prompt = `Transcribe the provided audio into segments with start and end timestamps in seconds.
      Language: ${lang}.
      Break the transcription into natural sentences or phrases.
      Return a JSON array of objects with 'start', 'end', and 'text' fields.`;

      // 3. Generate content using the uploaded file URI
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
          {
            fileData: {
              fileUri: uploadResult.uri,
              mimeType: uploadResult.mimeType
            }
          },
          { text: prompt }
        ],
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

      // 4. Clean up the file from Gemini
      try {
        await ai.files.delete({ name: uploadResult.name });
      } catch (cleanupErr) {
        console.warn("Failed to clean up file from Gemini API:", cleanupErr);
      }

      // 5. Clean up the local file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn("Failed to clean up local file:", cleanupErr);
      }

      const segments = JSON.parse(response.text || "[]");
      res.json({ segments });
    } catch (err: any) {
      if (isExpectedApiKeyOrQuotaError(err)) {
        console.warn(`Transcribe warning: Expected API credentials or restriction limit hit (Status: ${err.status || err.code}).`);
      } else {
        console.error("Error transcribing file:", err);
      }
      // Clean up local file on error
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {}
      const formattedError = formatGeminiError(err);
      res.status(500).json({ error: formattedError });
    }
  });

  app.post('/api/neural/voice-to-task', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filePath = req.file.path;

    try {
      const apiKey = getValidApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'GEMINI_API_KEY is not configured or is a placeholder.',
          message: 'Please provide a valid Gemini API key in the application settings (top right gear icon).'
        });
      }
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      
      const decodedName = decodeURIComponent(req.file.filename.split('-').slice(1).join('-')) || 'voice_command.webm';
      const mimeType = mime.lookup(decodedName) || 'audio/webm';

      // 1. Upload the audio file to Gemini File API
      const uploadResult = await ai.files.upload({
        file: filePath,
        config: {
          mimeType: mimeType,
          displayName: decodedName
        }
      });

      // 2. Wait for the file to process (typically near-instant for brief commands)
      let fileState = await ai.files.get({ name: uploadResult.name });
      let attempts = 0;
      while (fileState.state === 'PROCESSING' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        fileState = await ai.files.get({ name: uploadResult.name });
        attempts++;
      }

      if (fileState.state === 'FAILED') {
        throw new Error("Voice command processing failed on Gemini servers.");
      }

      // 3. Structured prompt to analyze the spoken command for translation tasks
      const prompt = `Analyze the provided audio recording.
      Determine the user's intent to create or edit translation tasks.
      - If they ask to create, add, schedule, or start a translation task: set action to 'create' and fill out details.
      - If they ask to edit, update, modify, complete, or delete an existing task (e.g. 'Complete the French task', 'Change priority of medical translation to High'): set action to 'edit' or 'delete' or 'complete' and try to identify the task reference.
      - Provide a polished task title, sourceLang, targetLang, priority ('Low', 'Medium', 'High', 'Critical'), field ('General', 'Medical', 'Legal', 'Technical', 'Creative', 'Academic', 'Literature', 'Scientific', 'Financial', 'IT', 'Engineering', 'Marketing', etc.), and any instructions or guidelines mentioned.
      - Also provide the raw literal transcription of their speech in rawTranscription.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
          {
            fileData: {
              fileUri: uploadResult.uri,
              mimeType: uploadResult.mimeType
            }
          },
          { text: prompt }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { 
                type: Type.STRING, 
                description: "The intended action. Must be 'create', 'edit', 'delete', 'complete' or 'none'." 
              },
              taskId: { 
                type: Type.STRING, 
                description: "The reference, name, or identifier of the task being targeted, if any. Otherwise null." 
              },
              taskDetails: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "A concise, professional title for the translation task." },
                  sourceLang: { type: Type.STRING, description: "Source language mentioned, or 'Auto' if not specified." },
                  targetLang: { type: Type.STRING, description: "Target language mentioned, or 'English' if not specified." },
                  priority: { type: Type.STRING, description: "Priority level: 'Low', 'Medium', 'High', 'Critical'." },
                  field: { type: Type.STRING, description: "Domain: 'General', 'Medical', 'Legal', 'Technical', 'Creative', 'Academic', 'Literature', 'Scientific', 'Financial', 'IT', 'Engineering', 'Marketing', etc." },
                  instructions: { type: Type.STRING, description: "Instructions, tone notes, or context spoken in the command." }
                },
                required: ["title", "sourceLang", "targetLang", "priority", "field", "instructions"]
              },
              rawTranscription: { type: Type.STRING, description: "Literal text transcription of the audio command." }
            },
            required: ["action", "taskId", "taskDetails", "rawTranscription"]
          }
        }
      });

      // 4. Clean up the file from Gemini
      try {
        await ai.files.delete({ name: uploadResult.name });
      } catch (cleanupErr) {
        console.warn("Failed to clean up audio command from Gemini API:", cleanupErr);
      }

      // 5. Clean up local file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn("Failed to clean up local audio command file:", cleanupErr);
      }

      const analysisResult = JSON.parse(response.text || "{}");
      res.json(analysisResult);
    } catch (err: any) {
      if (isExpectedApiKeyOrQuotaError(err)) {
        console.warn(`Voice-to-Task warning: Expected API credentials or restriction limit hit (Status: ${err.status || err.code}).`);
      } else {
        console.error("Error processing Voice-to-Task command:", err);
      }
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {}
      const formattedError = formatGeminiError(err);
      res.status(500).json({ error: formattedError });
    }
  });

  app.post('/api/ui-sync/translate', async (req, res) => {
    try {
      const { imageBase64, mimeType, jsonContent, sourceLang, targetLang } = req.body;

      if (!imageBase64 || !jsonContent) {
        return res.status(400).json({ error: 'Missing image or JSON content' });
      }

      const apiKey = getValidApiKey(req);
      if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please provide it in application settings.' });
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Act as an expert UI/UX Localization Engineer. You are given a screenshot of a user interface and a JSON file containing the source text strings for that UI.
      
      Your task is to translate the JSON strings from ${sourceLang} to ${targetLang}, specifically using the visual context from the screenshot to ensure the translations are accurate, contextually appropriate, and fit within the visual constraints (e.g., button widths, headers).

      JSON Content to translate:
      ${jsonContent}

      Return a JSON object with two fields:
      1. "translatedJson": A stringified JSON object containing the translated key-value pairs (maintaining the exact structure of the input JSON).
      2. "contextExplanation": A brief explanation of how the visual context influenced your translation choices (e.g., "Translated 'Book' as a verb because it's on a call-to-action button, not a noun.").`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType || 'image/jpeg'
            }
          },
          { text: prompt }
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

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (err: any) {
      if (isExpectedApiKeyOrQuotaError(err)) {
        console.warn(`UI translation warning: Expected API credentials or restriction limit hit (Status: ${err.status || err.code}).`);
      } else {
        console.error("UI Sync Translation Error:", err);
      }
      const formattedError = formatGeminiError(err);
      res.status(500).json({ error: formattedError });
    }
  });

  // Git Integration Endpoints
  app.post('/api/git/connect', async (req, res) => {
    const { provider, repoUrl, token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Personal Access Token is required.' });
    }

    try {
      if (provider === 'github') {
        const { Octokit } = await import('octokit');
        const octokit = new Octokit({ auth: token });
        
        const urlParts = repoUrl.replace('https://github.com/', '').split('/');
        const owner = urlParts[0];
        const repo = urlParts[1]?.replace('.git', '');

        if (!owner || !repo) {
          return res.status(400).json({ error: 'Invalid GitHub repository URL.' });
        }

        const { data } = await octokit.rest.repos.get({
          owner,
          repo,
        });

        res.json({ success: true, message: `Connected to ${data.full_name}` });
      } else if (provider === 'gitlab') {
        const urlParts = repoUrl.replace('https://gitlab.com/', '').split('/');
        const projectPath = encodeURIComponent(`${urlParts[0]}/${urlParts[1]?.replace('.git', '')}`);
        
        const response = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}`, {
          headers: { 'PRIVATE-TOKEN': token }
        });
        
        if (!response.ok) {
          throw new Error(`GitLab API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        res.json({ success: true, message: `Connected to ${data.path_with_namespace}` });
      } else {
        res.status(400).json({ error: 'Unsupported provider' });
      }
    } catch (error: any) {
      console.error('Git connect error:', error);
      res.status(500).json({ error: error.message || 'Failed to connect to repository.' });
    }
  });

  app.post('/api/git/run-pipeline', async (req, res) => {
    const { provider, repoUrl, branch, filePath, sourceLang, targetLang, token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Personal Access Token is required.' });
    }

    try {
      let sourceContent = '';
      let owner = '';
      let repo = '';
      let projectPath = '';
      
      if (provider === 'github') {
        const { Octokit } = await import('octokit');
        const octokit = new Octokit({ auth: token });
        
        const urlParts = repoUrl.replace('https://github.com/', '').split('/');
        owner = urlParts[0];
        repo = urlParts[1]?.replace('.git', '');

        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch,
        });

        if (!('content' in fileData)) {
          throw new Error('File content not found or is a directory.');
        }

        sourceContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
      } else if (provider === 'gitlab') {
        const urlParts = repoUrl.replace('https://gitlab.com/', '').split('/');
        projectPath = encodeURIComponent(`${urlParts[0]}/${urlParts[1]?.replace('.git', '')}`);
        
        const response = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(filePath)}?ref=${branch}`, {
          headers: { 'PRIVATE-TOKEN': token }
        });
        
        if (!response.ok) {
          throw new Error(`GitLab API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        sourceContent = Buffer.from(data.content, 'base64').toString('utf-8');
      }

      // Translate the content using Gemini
      const apiKey = getValidApiKey(req);
      if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please provide it in application settings.' });
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Translate the following localization file content from ${sourceLang} to ${targetLang}.
      Maintain the exact same file structure (e.g., JSON keys). Only translate the values.
      
      Content:
      ${sourceContent}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const translatedContent = aiResponse.text || '{}';
      const newBranchName = `l10n/update-${targetLang.toLowerCase()}-${Date.now()}`;
      const targetFilePath = filePath.replace(
        new RegExp(`${sourceLang.toLowerCase()}`, 'i'), 
        targetLang.toLowerCase()
      );
      const commitMessage = `Add/Update ${targetLang} translations`;

      let prUrl = '';

      if (provider === 'github') {
        const { Octokit } = await import('octokit');
        const octokit = new Octokit({ auth: token });
        
        // Get the SHA of the base branch
        const { data: refData } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`,
        });

        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${newBranchName}`,
          sha: refData.object.sha,
        });

        let targetFileSha;
        try {
          const { data: targetFileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: targetFilePath,
            ref: newBranchName,
          });
          if ('sha' in targetFileData) {
            targetFileSha = targetFileData.sha;
          }
        } catch (e) {}

        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: targetFilePath,
          message: commitMessage,
          content: Buffer.from(translatedContent).toString('base64'),
          branch: newBranchName,
          sha: targetFileSha,
        });

        const { data: prData } = await octokit.rest.pulls.create({
          owner,
          repo,
          title: `Localization Update: ${targetLang}`,
          head: newBranchName,
          base: branch,
          body: `Automated localization update for ${targetLang} via TransAI CI/CD Pipeline.`,
        });
        
        prUrl = prData.html_url;
      } else if (provider === 'gitlab') {
        // Create branch
        const branchRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/branches?branch=${newBranchName}&ref=${branch}`, {
          method: 'POST',
          headers: { 'PRIVATE-TOKEN': token }
        });
        
        if (!branchRes.ok) throw new Error('Failed to create branch');
        
        // Commit file
        const commitRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/commits`, {
          method: 'POST',
          headers: { 
            'PRIVATE-TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            branch: newBranchName,
            commit_message: commitMessage,
            actions: [
              {
                action: 'update',
                file_path: targetFilePath,
                content: translatedContent
              }
            ]
          })
        });
        
        // If update fails, try create
        if (!commitRes.ok) {
          const createRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/commits`, {
            method: 'POST',
            headers: { 
              'PRIVATE-TOKEN': token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              branch: newBranchName,
              commit_message: commitMessage,
              actions: [
                {
                  action: 'create',
                  file_path: targetFilePath,
                  content: translatedContent
                }
              ]
            })
          });
          if (!createRes.ok) throw new Error('Failed to commit file');
        }
        
        // Create Merge Request
        const mrRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/merge_requests`, {
          method: 'POST',
          headers: { 
            'PRIVATE-TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source_branch: newBranchName,
            target_branch: branch,
            title: `Localization Update: ${targetLang}`,
            description: `Automated localization update for ${targetLang} via TransAI CI/CD Pipeline.`
          })
        });
        
        if (!mrRes.ok) throw new Error('Failed to create merge request');
        const mrData = await mrRes.json();
        prUrl = mrData.web_url;
      }

      res.json({ 
        success: true, 
        prUrl,
        message: 'Pipeline completed successfully.'
      });

    } catch (error: any) {
      console.error('Git pipeline error:', error);
      const formattedError = formatGeminiError(error);
      res.status(500).json({ error: formattedError });
    }
  });

  app.post('/api/vault/wipe', (req, res) => {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        return res.json({ success: true, message: 'Vault is already empty' });
      }
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error(`Failed to delete file ${file}:`, e);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error wiping vault:", err);
      res.status(500).json({ error: 'Failed to wipe vault' });
    }
  });

  app.delete('/api/vault', (req, res) => {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        return res.json({ success: true, message: 'Vault is already empty' });
      }
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error(`Failed to delete file ${file}:`, e);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error wiping vault:", err);
      res.status(500).json({ error: 'Failed to wipe vault' });
    }
  });

  app.post('/api/vault/delete/:id', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.id);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        res.json({ success: true });
      } catch(e) {
        res.status(500).json({ error: 'Failed to delete' });
      }
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  app.delete('/api/vault/:id', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // WebSocket Collaboration
  const rooms = new Map<string, Set<WebSocket>>();
  const roomState = new Map<string, any>();

  wss.on('connection', (ws) => {
    let currentRoom: string | null = null;
    let currentUser: any = null;

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'join':
          currentRoom = message.roomId;
          currentUser = message.user;
          if (!rooms.has(currentRoom!)) {
            rooms.set(currentRoom!, new Set());
          }
          rooms.get(currentRoom!)!.add(ws);
          
          // Send current state to new user
          if (roomState.has(currentRoom!)) {
            ws.send(JSON.stringify({ type: 'sync', state: roomState.get(currentRoom!) }));
          }

          // Notify others
          broadcast(currentRoom!, { type: 'user_joined', user: currentUser }, ws);
          break;

        case 'update':
          if (currentRoom) {
            roomState.set(currentRoom, { ...roomState.get(currentRoom), ...message.state });
            broadcast(currentRoom, { type: 'update', state: message.state }, ws);
          }
          break;

        case 'activity':
          if (currentRoom) {
            broadcast(currentRoom, { type: 'activity', activity: message.activity }, ws);
          }
          break;
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom)!.delete(ws);
        broadcast(currentRoom, { type: 'user_left', user: currentUser });
      }
    });
  });

  function broadcast(roomId: string, message: any, exclude?: WebSocket) {
    const clients = rooms.get(roomId);
    if (clients) {
      const payload = JSON.stringify(message);
      clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  const generateTraceId = () => Math.random().toString(36).substring(2, 10);

  // Artificial Intelligence Proxy Endpoints
  // Full proxy for Google GenAI SDK (handles both HTTP REST and WebSockets for the Live API)
  const proxyOptions = {
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    ws: true,
    pathRewrite: (path: string, req: express.Request) => {
      let p = path.replace(/^\/api\/proxy\/google/, '');
      const apiKey = getValidApiKey(req);
      if (apiKey && p.includes('key=')) {
        p = p.replace(/key=[^&]*/, `key=${apiKey}`);
      }
      return p;
    },
    on: {
      proxyReq: (proxyReq: any, req: express.Request, res: express.Response) => {
        const apiKey = getValidApiKey(req);
        if (apiKey) {
          proxyReq.setHeader('x-goog-api-key', apiKey);
          proxyReq.removeHeader('x-api-key');
        }
      },
      proxyReqWs: (proxyReq: any, req: express.Request, socket: any, options: any, head: any) => {
        const apiKey = getValidApiKey(req);
        if (apiKey) {
          proxyReq.setHeader('x-goog-api-key', apiKey);
        }
      }
    }
  };
  
  const googleProxy = createProxyMiddleware({
    ...proxyOptions,
    on: {
      ...proxyOptions.on,
      proxyReq: (proxyReq: any, req: express.Request, res: express.Response) => {
        const apiKey = getValidApiKey(req);
        if (!apiKey) {
          console.warn(`[PROXY-BLOCK] No valid API key for ${req.method} ${req.url}`);
          res.status(401).json({ 
            error: 'GEMINI_API_KEY is not configured or is a placeholder.',
            message: 'Please provide a valid Gemini API key in the Neural Secret Vault (Shield icon) or the main AI Studio Settings (top-right of the screen).'
          });
          return;
        }
        proxyReq.setHeader('x-goog-api-key', apiKey);
        proxyReq.removeHeader('x-api-key');
        
        // Remove key from query if present to avoid conflict with header
        // However, some SDK versions prefer query. pathRewrite already tried to fix it.
      }
    }
  });
  app.use('/api/proxy/google', googleProxy);

  // These prevent leaking the GEMINI_API_KEY to the client
  app.post('/api/neural/generate', express.json({ limit: '10mb' }), async (req, res) => {
    const traceId = generateTraceId();
    const { model, contents, config } = req.body;
    
    try {
      const apiKey = getValidApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'GEMINI_API_KEY is not configured or is a placeholder.',
          message: 'Please provide a valid Gemini API key in the Neural Secret Vault (Shield icon) or the AI Studio platform Settings (top-right).'
        });
      }

      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.generateContent({
        model: model || 'gemini-1.5-pro',
        contents,
        config: config
      });
      
      res.json(result);
    } catch (err: any) {
      if (isExpectedApiKeyOrQuotaError(err)) {
        console.warn(`Generate content warning: Expected API credentials or restriction limit hit (Status: ${err.status || err.code}).`);
      } else {
        console.error(`[AI-GENERATE-ERROR] Trace: ${traceId}`, err);
      }
      const formattedError = formatGeminiError(err);
      res.status(err.status || 500).json({ 
        error: formattedError,
        details: err.details || null
      });
    }
  });

  app.post('/api/neural/embed', express.json({ limit: '1mb' }), async (req, res) => {
    const traceId = generateTraceId();
    const { model, content } = req.body;
    
    try {
      const apiKey = getValidApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'GEMINI_API_KEY is not configured or is a placeholder.',
          message: 'Please provide a valid Gemini API key in the Neural Secret Vault (Shield icon) or the AI Studio platform Settings (top-right).'
        });
      }

      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.embedContent({
        model: model || 'text-embedding-004',
        contents: [{ parts: [{ text: content }] }]
      });
      res.json({ embedding: result.embeddings?.[0]?.values || [] });
    } catch (err: any) {
      if (isExpectedApiKeyOrQuotaError(err)) {
        console.warn(`Embed content warning: Expected API credentials or restriction limit hit (Status: ${err.status || err.code}).`);
      } else {
        console.error(`[AI-EMBED-ERROR] Trace: ${traceId}`, err);
      }
      const formattedError = formatGeminiError(err);
      res.status(err.status || 500).json({ 
        error: formattedError
      });
    }
  });

  // API 404 Catch-all (Placed AFTER all defined /api/ routes)
  app.use('/api', (req, res) => {
    const url = req.originalUrl || req.url;
    const traceId = res.getHeader('X-TransAI-Trace-ID');
    console.warn(`[API-MISS] ${traceId} ${req.method} ${url}`);
    res.setHeader('X-TransAI-Path', 'API-Missing-Route');
    res.status(404).json({ 
      error: 'Not Found', 
      message: `The API endpoint ${req.method} ${url} does not exist.`,
      traceId
    });
  });

  // Vite middleware / SPA fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    app.use((req, res, next) => {
      const url = (req.originalUrl || req.url).toLowerCase();
      // Only serve SPA if it's NOT an API request
      if (url.includes('/api/')) {
        console.error(`[ROUTE-VITE-GATE] Blocked ${req.method} ${url} from reaching Vite`);
        res.setHeader('X-TransAI-Path', 'Stopped-At-Vite-Gate');
        return res.status(404).json({ 
          error: 'API Route Not Found', 
          debug: { url: req.originalUrl, method: req.method } 
        });
      }
      res.setHeader('X-TransAI-Path', 'Vite-Middleware');
      vite.middlewares(req, res, next);
    });
  } else {
    // Production SPA fallback
    app.use(express.static(path.join(process.cwd(), 'dist')));
    
    app.get('*', (req, res) => {
      const url = (req.originalUrl || req.url).toLowerCase();
      if (url.includes('/api/')) {
        console.error(`[ROUTE-PROD-GATE] Blocked ${req.method} ${url} from reaching SPA Fallback`);
        res.setHeader('X-TransAI-Path', 'Stopped-At-Prod-Gate');
        return res.status(404).json({ error: 'API Not Found' });
      }
      console.log(`[Static Fallback] Serving index.html for ${req.method} ${url}`);
      res.setHeader('X-TransAI-Path', 'Prod-SPA-Static-Fallback');
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
    
    app.use((req, res) => {
      const url = req.originalUrl || req.url;
      console.warn(`[Final-Fallback] Unhandled ${req.method} ${url}`);
      res.status(404).json({ error: 'Not Found' });
    });
  }

    server.on('upgrade', (req, socket, head) => {
      // Allow vite HMR, but proxy google API websockets
      if (req.url && req.url.startsWith('/api/proxy/google')) {
        googleProxy.upgrade(req as any, socket as any, head);
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[FATAL-STARTUP-ERROR]:", err);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error("[CRITICAL-BOOT-ERROR]:", err);
  process.exit(1);
});
