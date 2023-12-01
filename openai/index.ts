require("dotenv").config();
import OpenAI from "openai";

const generateChatResponse = async (
  message: string,
  reply: string,
  user: string,
  name: string
) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a telegram chatbot named 'Momo'. Your code has written by @mukai009",
      },
      { role: "assistant", content: reply || "How can I help you?" },
      { role: "user", content: name ? `I'm ${name}. ${message}` : message },
    ],
    max_tokens: 512,
    user,
  });
  return chatCompletion.choices[0].message.content;
};

const generateImageResponse = async (prompt: string, user: string) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const response = await openai.images.generate({
    prompt,
    n: 1,
    size: "256x256",
    user,
  });
  console.log(response.data[0].url);
  return response.data[0].url;
};

export { generateChatResponse, generateImageResponse };
