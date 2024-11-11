const express = require("express");
const fs = require("fs");
const { promisify } = require("util");
const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const readFile = promisify(fs.readFile);
const app = express();

const GPT_MODE = process.env.GPT_MODE || "CHAT";
const HISTORY_LENGTH = Number(process.env.HISTORY_LENGTH) || 100;
const PORT = Number(process.env.PORT) || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error("OpenAI API Key is missing. Please set it in .env file.");
    process.exit(1);
}

let file_context = "You are a helpful YouTube Chatbot.";
const messages = [{ role: "system", content: file_context }];

console.log("GPT_MODE:", GPT_MODE);
console.log("History length:", HISTORY_LENGTH);
console.log("OpenAI API Key:", OPENAI_API_KEY ? "Loaded" : "Not loaded");
console.log("Port:", PORT);

app.use(express.json({ extended: true, limit: "1mb" }));

app.all("/", (req, res) => {
    res.send(
        "Yo! Sup, I'm GPTChatBot developed by Shubham Kashyap, you can call me LUNA. I'm here to help you with your queries. Just ask me anything!"
    );
});

async function initializeContext() {
    try {
        const context = await readFile("./file_context.txt", "utf8");
        if (GPT_MODE === "CHAT") {
            console.log("Loaded context file as system message for the agent.");
            messages[0].content = context;
        } else {
            console.log("Loaded context file for prompt mode.");
            file_context = context;
        }
    } catch (err) {
        console.warn("Context file not found or couldn't be read. Using default context.");
    }
}

app.get("/gpt/:text", async (req, res) => {
    const text = req.params.text;
    const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);

    try {
        if (GPT_MODE === "CHAT") {
            messages.push({ role: "user", content: text });

            if (messages.length > HISTORY_LENGTH * 2 + 1) {
                messages.splice(1, 2);
            }

            const response = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: messages,
                temperature: 0.5,
                max_tokens: 128,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            if (response.data.choices) {
                let agent_response = response.data.choices[0].message.content;
                messages.push({ role: "assistant", content: agent_response });

                if (agent_response.length > 200) {
                    agent_response = agent_response.substring(0, 200);
                }

                res.send(agent_response);
            } else {
                res.status(500).send("Failed to generate a response. Try again later.");
            }
        } else {
            const prompt = `${file_context}\n\nQ:${text}\nA:`;
            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                temperature: 0.5,
                max_tokens: 128,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            if (response.data.choices) {
                let agent_response = response.data.choices[0].text;

                if (agent_response.length > 200) {
                    agent_response = agent_response.substring(0, 200);
                }

                res.send(agent_response.trim());
            } else {
                res.status(500).send("Failed to generate a response. Try again later.");
            }
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

initializeContext().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
