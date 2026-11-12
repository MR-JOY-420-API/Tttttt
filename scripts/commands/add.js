
const axios = require("axios");

const API_BASE = process.env.RANDOM_API_BASE || "https://joy-random-api-40-seven.vercel.app";

module.exports.config = {
  name: "add",
  version: "1.0.0",
  permission: 0,
  credits: "JOY",
  description: "Reply করা ভিডিও Random API তে add করো",
  prefix: true,
  category: "media",
  usages: "[name] (reply to video)",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  let waitMsg = null;

  try {
    const name = args[0];

    if (!name) {
      return api.sendMessage(
        "╭╼|━━━━━━━━━━━━━━|╾╮\n" +
        "📦 ভিডিওর নাম লিখুন!\n" +
        "প্রথমে ভিডিওতে reply দিন।\n" +
        "তারপর লিখুন: add funny\n" +
        "╰╼|━━━━━━━━━━━━━━|╾╯",
        event.threadID,
        event.messageID
      );
    }

    const replyMsg = event.messageReply;

    if (!replyMsg) {
      return api.sendMessage(
        "❌ প্রথমে কোনো ভিডিওতে reply দিন!",
        event.threadID,
        event.messageID
      );
    }

    const attachments = replyMsg.attachments || [];

    const media = attachments.find(item =>
      ["video", "animated_image"].includes(item.type)
    );

    if (!media || !media.url) {
      return api.sendMessage(
        "❌ Reply করা মেসেজে কোনো ভিডিও পাওয়া যায়নি!",
        event.threadID,
        event.messageID
      );
    }

    waitMsg = await new Promise(resolve => {
      api.sendMessage(
        "⏳ ভিডিও API তে add হচ্ছে, অপেক্ষা করুন...",
        event.threadID,
        (err, info) => resolve(info || null)
      );
    });

    const res = await axios.post(
      API_BASE + "/api/add",
      {
        name: name,
        url: media.url
      },
      {
        timeout: 120000,
        validateStatus: () => true
      }
    );

    const data = res.data || {};

    if (waitMsg && waitMsg.messageID) {
      api.unsendMessage(waitMsg.messageID, () => {});
    }

    if (!data.status) {
      return api.sendMessage(
        "❌ ভিডিও Add হয়নি!\n" +
        (data.error || "HTTP " + res.status),
        event.threadID,
        event.messageID
      );
    }

    return api.sendMessage(
      "╭╼|━━━━━━━━━━━━━━|╾╮\n" +
      "✅ ভিডিও সফলভাবে Add হয়েছে!\n\n" +
      `📌 Name: ${data.name || name}\n` +
      `🔗 Link: ${data.url || "N/A"}\n` +
      `📊 এই নামে ভিডিও: ${data.count || 0} টি\n` +
      `📈 Total Video: ${data.totalVideos || data.total || 0} টি\n` +
      "╰╼|━━━━━━━━━━━━━━|╾╯",
      event.threadID,
      event.messageID
    );

  } catch (e) {
    if (waitMsg && waitMsg.messageID) {
      api.unsendMessage(waitMsg.messageID, () => {});
    }

    console.error("Add Error:", e.message);

    const error =
      e.response?.data?.error ||
      e.message ||
      "Unknown Error";

    return api.sendMessage(
      "❌ ভিডিও Add করতে সমস্যা হয়েছে!\n" +
      error.slice(0, 300),
      event.threadID,
      event.messageID
    );
  }
};
