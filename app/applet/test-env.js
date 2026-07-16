console.log("API_KEY length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log("Is undefined?", process.env.GEMINI_API_KEY === "undefined");
console.log("Quotes?", process.env.GEMINI_API_KEY?.startsWith('"'));
