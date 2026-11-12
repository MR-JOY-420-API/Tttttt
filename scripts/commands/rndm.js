
const axios = require("axios");
const { Readable } = require("stream");

const API_BASE = "https://joy-random-api-40-seven.vercel.app";

function extFrom(url) {
  const clean = url.split("?")[0].split("#")[0];
  const last = clean.split("/").pop() || "";
  const ext = (last.split(".").pop() || "").toLowerCase();

  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
}

function mimeForExt(ext) {
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "mkv") return "video/x-matroska";
  if (ext === "avi") return "video/x-msvideo";
  return "video/mp4";
}

module.exports.config = {
  name: "rndm",
  version: "1.0.0",
  permission: 0,
  credits: "JOY",
  description: "Random API থেকে ভিডিও পাঠাবে",
  prefix: true,
  category: "media",
  usages: "[name]",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  try {
    const name = args.join(" ").trim();

    if (!name) {
      return api.sendMessage(
        "╭╼|━━━━━━━━━━━━━━|╾╮\n" +
        "❌ ভিডিওর নাম লিখুন!\n\n" +
        "ব্যবহার: rndm <name>\n" +
        "উদাহরণ: rndm joy\n" +
        "╰╼|━━━━━━━━━━━━━━|╾╯",
        event.threadID,
        event.messageID
      );
    }

    const apiUrl =
      `${API_BASE}/api/video?name=${encodeURIComponent(name)}`;

    const res = await axios.get(apiUrl, {
      timeout: 30000,
      validateStatus: () => true
    });

    const data = res.data || {};

    if (res.status !== 200 || !data.url) {
      return api.sendMessage(
        `❌ "${name}" নামে কোনো ভিডিও পাওয়া যায়নি!`,
        event.threadID,
        event.messageID
      );
    }

    // Video count information
    const countInfo = [];

    if (typeof data.count === "number") {
      countInfo.push(`📊 এই নামে ভিডিও: ${data.count} টি`);
    }

    if (typeof data.total === "number") {
      countInfo.push(`📁 মোট নাম: ${data.total} টি`);
    }

    if (typeof data.totalVideos === "number") {
      countInfo.push(`📈 মোট ভিডিও: ${data.totalVideos} টি`);
    }

    const countText = countInfo.length
      ? "\n" + countInfo.join("\n")
      : "";

    let videoUrl = data.url;

    // Viewer link থেকে original video URL বের করা
    if (/joy-upload-api\.vercel\.app\/v\//i.test(videoUrl)) {
      try {
        const pageRes = await axios.get(videoUrl, {
          timeout: 30000,
          validateStatus: () => true
        });

        const html =
          typeof pageRes.data === "string" ? pageRes.data : "";

        const match = html.match(
          /https:\/\/api\.telegram\.org\/file\/bot[^\s"'<>]+/
        );

        if (match) {
          videoUrl = match[0];
        } else {
          return api.sendMessage(
            `🎬 ${data.name || name}${countText}\n🔗 ${data.url}`,
            event.threadID,
            event.messageID
          );
        }
      } catch (e) {
        return api.sendMessage(
          `🎬 ${data.name || name}${countText}\n🔗 ${data.url}`,
          event.threadID,
          event.messageID
        );
      }
    }

    // Download video
    const dl = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: 50 * 1024 * 1024,
      validateStatus: () => true
    });

    if (
      dl.status !== 200 ||
      !dl.data ||
      !dl.data.byteLength
    ) {
      return api.sendMessage(
        "❌ ভিডিও Download করা যায়নি!",
        event.threadID,
        event.messageID
      );
    }

    const ext = extFrom(videoUrl);
    const buffer = Buffer.from(dl.data);
    const stream = Readable.from(buffer);

    const caption =
      `╭╼|━━━━━━━━━━━━━━|╾╮\n` +
      `🎬 Name: ${data.name || name}\n` +
      `${countText}\n` +
      `╰╼|━━━━━━━━━━━━━━|╾╯`;

    return api.sendMessage(
      {
        body: caption,
        attachment: stream
      },
      event.threadID,
      event.messageID
    );

  } catch (e) {
    console.error("Rndm Error:", e.message);

    return api.sendMessage(
      "❌ ভিডিও আনতে সমস্যা হয়েছে!\nআবার চেষ্টা করুন।",
      event.threadID,
      event.messageID
    );
  }
};
