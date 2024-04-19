require("dotenv").config();

import { Telegraf } from "telegraf";
import { generateChatResponse, generateImageResponse } from "../openai";

const telebot = new Telegraf(process.env.TEL_BOT_TOKEN || "");
const allowedGroups = process.env.TEL_GROUP_ID?.toString().split(",");
// message queue to avoid openai api rate limit
let messageQueue: any[] = [];
let lastReplySent = Date.now();
const delay = 20000; // as per openai docs, i can send 3 requests per minute https://platform.openai.com/docs/guides/rate-limits/what-are-the-rate-limits-for-our-api

// image queue to avoid openai api rate limit
const imageQueue: any[] = [];
let lastImageSent = Date.now();
const imageDelay = 12000; // as per openai docs, i can send 5 image generation requests per minute https://platform.openai.com/docs/guides/rate-limits/what-are-the-rate-limits-for-our-api

const checkValidGroup = (ctx: any) => {
  const isAllowed = allowedGroups?.includes(ctx.from.id.toString());
  if (!isAllowed) {
    ctx.reply(
      "Sorry. You are not allowed to chat with me. Please connect with @mukai009 to chat with me."
    );
  }
  return isAllowed;
};

const sendResponse: any = async () => {
  if (messageQueue.length === 0) return console.log("No message in queue");
  const { ctx, loadingMessage } = messageQueue[0];
  const now = Date.now();
  const timeGap = now - lastReplySent;
  if (timeGap > delay) {
    try {
      ctx.telegram.sendChatAction(ctx.message.chat.id, "typing");

      const senderName = ctx.message?.from?.first_name
        ? `${ctx.message?.from?.first_name} ${ctx.message?.from?.last_name}`
        : ctx.message?.from?.username || null;

      // generate response from openai
      const response = await generateChatResponse(
        ctx.message.text,
        ctx.message?.reply_to_message?.text,
        ctx.message?.from?.username || ctx.message?.from?.id?.toString(),
        senderName
      );

      ctx.deleteMessage(loadingMessage.message_id); // delete "generating response..." message
      await ctx.reply(response, {
        // send response
        // parse_mode: "Markdown", // to parse markdown in response
        // reply_to_message_id: ctx.message?.message_id, // to reply to user's the message
        allow_sending_without_reply: true, // send message even if user's message is not found
        reply_markup: { force_reply: false, selective: false }, // to force user to reply to this message
      });
    } catch (e) {
      console.log(e);
      ctx.reply("Error occured!");
    } finally {
      messageQueue.shift(); // remove first element from queue}
      lastReplySent = Date.now(); // update last reply sent time
    }
  }
  // if there are more messages in queue, call this function again after delay
  if (messageQueue.length > 0)
    return setTimeout(() => sendResponse(), delay - timeGap);
};

const sendImageResponse: any = async () => {
  if (imageQueue.length === 0) return console.log("No image in queue");
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
      const response = await generateImageResponse(
        prompt,
        ctx.message?.from?.username || ctx.message?.from?.id?.toString()
      );

      ctx.deleteMessage(loadingMsg.message_id); // delete "generating image..." message

      await ctx.replyWithPhoto(response, {
        // send image
        // reply_to_message_id: ctx.message?.message_id,
        // allow_sending_without_reply: true,
      });
    } catch (e) {
      console.log(e);
      ctx.reply("Error occured!");
    } finally {
      imageQueue.shift();
      lastImageSent = Date.now();
    }
  }
  if (imageQueue.length > 0)
    return setTimeout(() => sendImageResponse(), imageDelay - timeGap);
};

telebot.start(async (ctx) => {
  console.log("Received /start command");
  try {
    if (!checkValidGroup(ctx)) return; // check if bot is allowed to reply in this group

    return ctx.reply(
      "Hi, this is *Momo*, ready to chat with you. \nHow can I assist you today?",
      {
        // parse_mode: "Markdown",
        // reply_to_message_id: ctx.message?.message_id,
        // allow_sending_without_reply: true,
        // reply_markup: { force_reply: true, selective: true },
      }
    );
  } catch (e) {
    console.error("error in start action:", e);
    return ctx.reply("Error occured");
  }
});

telebot.command("image", async (ctx) => {
  if (ctx.message.from.is_bot) {
    return ctx.reply("I don't chat with bot.");
  }
  try {
    if (!checkValidGroup(ctx)) return; // check if bot is allowed to reply in this group

    const hasPrompt = ctx.message.text.includes("/image@OpenAI_BD_bot")
      ? !!ctx.message.text.replace("/image@OpenAI_BD_bot", "").trim()
      : !!ctx.message.text.replace("/image", "").trim();
    if (!hasPrompt)
      return ctx.reply(
        "Please provide a prompt with /image command to generate image. \nExample: `/image a cute white cat`"
        // {
        //   parse_mode: "Markdown",
        //   reply_to_message_id: ctx.message?.message_id,
        //   allow_sending_without_reply: true,
        //   reply_markup: { force_reply: true, selective: true },
        // }
      );

    // send a loading message
    const loadingMsg = await ctx.reply("Generating image...", {
      //   reply_to_message_id: ctx.message?.message_id,
      //   allow_sending_without_reply: true,
    });
    imageQueue.push({ ctx, loadingMsg });
    return imageQueue.length === 1 ? sendImageResponse() : null;
  } catch (error) {
    console.log(error);
    return ctx.reply("Error occured");
  }
});

telebot.on("message", async (ctx) => {
  console.log(ctx.message);
  if (ctx.message.from.is_bot) {
    return ctx.reply("I don't chat with bot.");
  }
  try {
    if (!checkValidGroup(ctx)) return;
    const loadingMessage = await ctx.reply("gernerating...", {
      //   reply_to_message_id: ctx.message?.message_id,
      //   allow_sending_without_reply: true,
    });
    messageQueue.push({ ctx, loadingMessage });
    return messageQueue.length === 1 ? sendResponse() : null;
  } catch (error) {
    console.log(error);
    return ctx.reply("Something went wrong. Please connect with admin.");
  }
});

export { telebot };
