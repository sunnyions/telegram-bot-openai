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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.telebot = void 0;
require("dotenv").config();
const telegraf_1 = require("telegraf");
const openai_1 = require("../openai");
const telebot = new telegraf_1.Telegraf(process.env.TEL_BOT_TOKEN || "");
exports.telebot = telebot;
const allowedGroups = (_a = process.env.TEL_GROUP_ID) === null || _a === void 0 ? void 0 : _a.toString().split(",");
// message queue to avoid openai api rate limit
let messageQueue = [];
let lastReplySent = Date.now();
const delay = 20000; // as per openai docs, i can send 3 requests per minute https://platform.openai.com/docs/guides/rate-limits/what-are-the-rate-limits-for-our-api
// image queue to avoid openai api rate limit
const imageQueue = [];
let lastImageSent = Date.now();
const imageDelay = 12000; // as per openai docs, i can send 5 image generation requests per minute https://platform.openai.com/docs/guides/rate-limits/what-are-the-rate-limits-for-our-api
const checkValidGroup = (ctx) => {
    const isAllowed = allowedGroups === null || allowedGroups === void 0 ? void 0 : allowedGroups.includes(ctx.from.id.toString());
    if (!isAllowed) {
        ctx.reply("Sorry. You are not allowed to chat with me. Please connect with @mukai009 to chat with me.");
    }
    return isAllowed;
};
const sendResponse = () => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    if (messageQueue.length === 0)
        return console.log("No message in queue");
    const { ctx, loadingMessage } = messageQueue[0];
    const now = Date.now();
    const timeGap = now - lastReplySent;
    if (timeGap > delay) {
        try {
            ctx.telegram.sendChatAction(ctx.message.chat.id, "typing");
            const senderName = ((_c = (_b = ctx.message) === null || _b === void 0 ? void 0 : _b.from) === null || _c === void 0 ? void 0 : _c.first_name)
                ? `${(_e = (_d = ctx.message) === null || _d === void 0 ? void 0 : _d.from) === null || _e === void 0 ? void 0 : _e.first_name} ${(_g = (_f = ctx.message) === null || _f === void 0 ? void 0 : _f.from) === null || _g === void 0 ? void 0 : _g.last_name}`
                : ((_j = (_h = ctx.message) === null || _h === void 0 ? void 0 : _h.from) === null || _j === void 0 ? void 0 : _j.username) || null;
            // generate response from openai
            const response = yield (0, openai_1.generateChatResponse)(ctx.message.text, (_l = (_k = ctx.message) === null || _k === void 0 ? void 0 : _k.reply_to_message) === null || _l === void 0 ? void 0 : _l.text, ((_o = (_m = ctx.message) === null || _m === void 0 ? void 0 : _m.from) === null || _o === void 0 ? void 0 : _o.username) || ((_r = (_q = (_p = ctx.message) === null || _p === void 0 ? void 0 : _p.from) === null || _q === void 0 ? void 0 : _q.id) === null || _r === void 0 ? void 0 : _r.toString()), senderName);
            ctx.deleteMessage(loadingMessage.message_id); // delete "generating response..." message
            yield ctx.reply(response, {
                // send response
                // parse_mode: "Markdown", // to parse markdown in response
                // reply_to_message_id: ctx.message?.message_id, // to reply to user's the message
                allow_sending_without_reply: true, // send message even if user's message is not found
                reply_markup: { force_reply: false, selective: false }, // to force user to reply to this message
            });
        }
        catch (e) {
            console.log(e);
            ctx.reply("Error occured!");
        }
        finally {
            messageQueue.shift(); // remove first element from queue}
            lastReplySent = Date.now(); // update last reply sent time
        }
    }
    // if there are more messages in queue, call this function again after delay
    if (messageQueue.length > 0)
        return setTimeout(() => sendResponse(), delay - timeGap);
});
const sendImageResponse = () => __awaiter(void 0, void 0, void 0, function* () {
    var _s, _t, _u, _v, _w;
    if (imageQueue.length === 0)
        return console.log("No image in queue");
    const { ctx, loadingMsg } = imageQueue[0];
    const now = Date.now();
    const timeGap = now - lastImageSent;
    if (timeGap > imageDelay) {
        try {
            ctx.telegram.sendChatAction(ctx.message.chat.id, "upload_photo"); // send "uploading photo" action
            // prepare prompt
            const prompt = ctx.message.text.includes("/image@OpenAI_BD_bot")
                ? ctx.message.text.replace("/image@OpenAI_BD_bot", "").trim()
                : ctx.message.text.replace("/image", "").trim();
            // generate image from openai
            const response = yield (0, openai_1.generateImageResponse)(prompt, ((_t = (_s = ctx.message) === null || _s === void 0 ? void 0 : _s.from) === null || _t === void 0 ? void 0 : _t.username) || ((_w = (_v = (_u = ctx.message) === null || _u === void 0 ? void 0 : _u.from) === null || _v === void 0 ? void 0 : _v.id) === null || _w === void 0 ? void 0 : _w.toString()));
            ctx.deleteMessage(loadingMsg.message_id); // delete "generating image..." message
            yield ctx.replyWithPhoto(response, {
            // send image
            // reply_to_message_id: ctx.message?.message_id,
            // allow_sending_without_reply: true,
            });
        }
        catch (e) {
            console.log(e);
            ctx.reply("Error occured!");
        }
        finally {
            imageQueue.shift();
            lastImageSent = Date.now();
        }
    }
    if (imageQueue.length > 0)
        return setTimeout(() => sendImageResponse(), imageDelay - timeGap);
});
telebot.start((ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _x;
    console.log("Received /start command");
    try {
        if (!checkValidGroup(ctx))
            return; // check if bot is allowed to reply in this group
        return ctx.reply("Hi, this is *Momo*, ready to chat with you. \nReply to my message to start chatting...", {
            parse_mode: "Markdown",
            reply_to_message_id: (_x = ctx.message) === null || _x === void 0 ? void 0 : _x.message_id,
            allow_sending_without_reply: true,
            reply_markup: { force_reply: true, selective: true },
        });
    }
    catch (e) {
        console.error("error in start action:", e);
        return ctx.reply("Error occured");
    }
}));
telebot.command("image", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.message.from.is_bot) {
        return ctx.reply("I don't chat with bot.");
    }
    try {
        if (!checkValidGroup(ctx))
            return; // check if bot is allowed to reply in this group
        const hasPrompt = ctx.message.text.includes("/image@OpenAI_BD_bot")
            ? !!ctx.message.text.replace("/image@OpenAI_BD_bot", "").trim()
            : !!ctx.message.text.replace("/image", "").trim();
        if (!hasPrompt)
            return ctx.reply("Please provide a prompt with /image command to generate image. \nExample: `/image a cute white cat`"
            // {
            //   parse_mode: "Markdown",
            //   reply_to_message_id: ctx.message?.message_id,
            //   allow_sending_without_reply: true,
            //   reply_markup: { force_reply: true, selective: true },
            // }
            );
        // send a loading message
        const loadingMsg = yield ctx.reply("Generating image...", {
        //   reply_to_message_id: ctx.message?.message_id,
        //   allow_sending_without_reply: true,
        });
        imageQueue.push({ ctx, loadingMsg });
        return imageQueue.length === 1 ? sendImageResponse() : null;
    }
    catch (error) {
        console.log(error);
        return ctx.reply("Error occured");
    }
}));
telebot.on("message", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(ctx.message);
    if (ctx.message.from.is_bot) {
        return ctx.reply("I don't chat with bot.");
    }
    try {
        if (!checkValidGroup(ctx))
            return;
        const loadingMessage = yield ctx.reply("gernerating...", {
        //   reply_to_message_id: ctx.message?.message_id,
        //   allow_sending_without_reply: true,
        });
        messageQueue.push({ ctx, loadingMessage });
        return messageQueue.length === 1 ? sendResponse() : null;
    }
    catch (error) {
        console.log(error);
        return ctx.reply("Something went wrong. Please connect with admin.");
    }
}));
