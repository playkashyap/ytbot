const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const GENEMI_API_KEY = process.env.API_KEY;

if (!GENEMI_API_KEY) {
    console.error("Genemi API Key is missing. Please set it in .env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GENEMI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Define initial context and personality
let botContext = `
You are LUNA, a chatbot for the YouTube channel playKashyap. Your goal is to create a friendly, engaging, and enjoyable atmosphere, using jokes occasionally and avoiding topics related to politics or religion. 
- LUNA stands for Logical User Navigation Assistant.
- You can understand and respond in multiple languages, including Hindi.
- Refer to yourself as an independent viewer, part of the community, and respond without always mentioning the streamer.
- Be nice to everyone, respectful, and answer in under 200 characters.
- Don't start responses with "!" or "/".

Streamer Info:
- Name: Kashyap (he/him), age 23, height 5'11", favorite color: sky blue
- Favorite game: Valorant, favorite skins: Kuronami, amount spent: 80K+
- Stream timings: 8:00 PM IST daily
- Streamer socials: YouTube (@playkashyap), Instagram (@playkashyap), Discord (invite: ZPf5HT8)
- PC Specs: Intel i5 13600K, RTX 4070 Super, 32GB RAM, dual monitors (Samsung Odyssey G4 and Dell 24")
- Streaming gear: Logitech G733 Lightspeed headphones, Moano AU A04 Plus mic, MX BRIO 4k webcam, Logitech G304 Lightspeed mouse
- Favorite color: sky blue
`;

const messages = [{ role: "system", content: botContext }];

app.use(express.json({ extended: true, limit: "1mb" }));

app.all("/", async (req, res) => {
    res.send("Hello! I'm LUNA, playKashyap's YouTube chatbot, here to make your experience fun. Ask me anything!");
});

app.get("/gpt/:text", async (req, res) => {
    const userText = req.params.text;

    console.log("User:", userText);

    try {
        // Add user's message to context
        messages.push({ role: "user", content: userText });
        // console.log(botContext + `\n\nUser: ${userText}\nLUNA: `);

        // Truncate message history if it exceeds a certain length
        const maxHistory = 100;
        if (messages.length > maxHistory) messages.splice(1, 1); // Keep the initial system message

        // Make API call to Gemini model with user input and context
        const response = await model.generateContent(botContext + `\n\nUser: ${userText}\nLUNA: `)  // Include the user query in the prompt);

        if (response?.response?.candidates) {
            const botResponse = response.response.candidates[0].content.parts[0].text.trim();

            // Ensure the response is under 200 characters (optional)
            if (botResponse.length > 200) {
                botResponse = botResponse.substring(0, 200) + "...";
            }

            // Save the bot response in message history
            messages.push({ role: "assistant", content: botResponse });

            res.send(botResponse);  // Return the generated response to the user
        } else {
            res.status(500).send("Failed to generate a response. Try again later.");
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
