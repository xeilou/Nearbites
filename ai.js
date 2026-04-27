const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize the OpenAI client to point to OpenRouter
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * A helper function to ask GPT a question via OpenRouter
 */
async function askGPT(systemPrompt, userPrompt) {
    try {
        const response = await openrouter.chat.completions.create({
            // You can use "openai/gpt-3.5-turbo" or "openai/gpt-4o-mini" (which is very fast and cheap/free)
            model: "openai/gpt-3.5-turbo", 
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error communicating with OpenRouter:", error);
        throw new Error("AI failed to generate a response.");
    }
}

module.exports = { askGPT };