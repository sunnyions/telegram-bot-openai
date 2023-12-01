"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImageResponse = exports.generateChatResponse = void 0;
require("dotenv").config();
const openai_1 = __importDefault(require("openai"));
const generateChatResponse = (message, reply, user, name) => __awaiter(void 0, void 0, void 0, function* () {
    const openai = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const chatCompletion = yield openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are a telegram chatbot named 'Momo'. Your code has written by @mukai009",
            },
            { role: "assistant", content: reply || "How can I help you?" },
            { role: "user", content: name ? `I'm ${name}. ${message}` : message },
        ],
        max_tokens: 512,
        user,
    });
    return chatCompletion.choices[0].message.content;
});
exports.generateChatResponse = generateChatResponse;
const generateImageResponse = (prompt, user) => __awaiter(void 0, void 0, void 0, function* () {
    const openai = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const response = yield openai.images.generate({
        prompt,
        n: 1,
        size: "256x256",
        user,
    });
    console.log(response.data[0].url);
    return response.data[0].url;
});
exports.generateImageResponse = generateImageResponse;
