
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://joy-random-api-40-seven.vercel.app";

function extFrom(url) {
  const clean = url.split("?")[0].split("#")[0];
  const last = clean.split("/").pop() || "";
  const ext = (last.split(".").pop() || "").toLowerCase();

  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
}

module.exports.config = {
  name: "rndm",
  version: "1.0.2",
  permission: 0,
  credits: "JOY",
  description: "Random API থেকে ভিডিও পাঠাবে",
  prefix: true,
  category: "media",
  usages: "[name]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  let tempFile = null;

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

    // API request
    const res = await axios.get(
      `${API_BASE}/api/video?name=${encodeURIComponent(name)}`,
      {
        timeout: 30000,
        validateStatus: () => true
      }
    );

    const data = res.data || {};

    if (res.status !== 200 || !data.url) {
      return api.sendMessage(
        `❌ "${name}" নামে কোনো ভিডিও পাওয়া যায়নি!`,
        event.threadID,
        event.messageID
      );
    }

    // Count information
    const countInfo = [];

    if (typeof data.count === "number")
      countInfo.push(`📊 এই নামে ভিডিও: ${data.count} টি`);

    if (typeof data.total === "number")
      countInfo.push(`📁 মোট নাম: ${data.total} টি`);

    if (typeof data.totalVideos === "number")
      countInfo.push(`📈 মোট ভিডিও: ${data.totalVideos} টি`);

    const countText = countInfo.length
      ? "\n" + countInfo.join("\n")
      : "";

    let videoUrl = data.url;

    // Viewer link resolve
    if (/joy-upload-api\.vercel\.app\/v\//i.test(videoUrl)) {
      const pageRes = await axios.get(videoUrl, {
        timeout: 30000,
        validateStatus: () => true
      });

      const html = typeof pageRes.data === "string"
        ? pageRes.data
        : "";

      const match = html.match(
        /https:\/\/api\.telegram\.org\/file\/bot[^\s"'<>]+/
      );

      if (!match) {
        return api.sendMessage(
          `🎬 ${data.name || name}${countText}\n🔗 ${data.url}`,
          event.threadID,
          event.messageID
        );
      }

      videoUrl = match[0];
    }

    // Download video
    const dl = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: 50 * 1024 * 1024,
      validateStatus: () => true
    });

    if (dl.status !== 200 || !dl.data || !dl.data.byteLength) {
      return api.sendMessage(
        "❌ ভিডিও Download করা যায়নি!",
        event.threadID,
        event.messageID
      );
    }

    const buffer = Buffer.from(dl.data);
    const ext = extFrom(videoUrl);

    // Temporary video file
    tempFile = path.join(
      __dirname,
      `rndm_${Date.now()}.${ext}`
    );

    fs.writeFileSync(tempFile, buffer);

    const caption =
      "╭╼|━━━━━━━━━━━━━━|╾╮\n" +
      `🎬 Name: ${data.name || name}\n` +
      countText + "\n" +
      "╰╼|━━━━━━━━━━━━━━|╾╯";

    // FCA attachment must be an array
    const attachment = [fs.createReadStream(tempFile)];

    return api.sendMessage(
      {
        body: caption,
        attachment: attachment
      },
      event.threadID,
      (err, info) => {
        if (tempFile) {
          fs.unlink(tempFile, () => {});
          tempFile = null;
        }

        if (err) {
          console.error("Rndm Send Error:", err);

          return api.sendMessage(
            "❌ ভিডিও পাঠানো যায়নি!\n" + err.message,
            event.threadID
          );
        }
      },
      event.messageID
    );

  } catch (e) {
    console.error("Rndm Error:", e.stack || e.message);

    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlink(tempFile, () => {});
    }

    return api.sendMessage(
      "❌ ভিডিও আনতে সমস্যা হয়েছে!\n" +
      (e.message || "Unknown Error").slice(0, 200),
      event.threadID,
      event.messageID
    );
  }
};
