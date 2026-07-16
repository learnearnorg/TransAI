console.log("API_KEY:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "undefined");
console.log("Quotes?", process.env.GEMINI_API_KEY?.startsWith('"'));
