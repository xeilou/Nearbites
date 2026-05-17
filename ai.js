const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize the OpenAI client to point to OpenRouter
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

// ==========================================
// THE CORE AI HELPER
// ==========================================
async function askGPT(systemPrompt, userPrompt) {
    try {
        const response = await openrouter.chat.completions.create({
            // You mentioned it was running GPT-3.5 earlier! 
            // Change this back to Qwen if you prefer: "qwen/qwen-2.5-72b-instruct"
            model: "openai/gpt-3.5-turbo", 
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        console.error("OpenRouter API Error:", error);
        throw error;
    }
}

// Export it cleanly so server.js can use it!
module.exports = { askGPT };