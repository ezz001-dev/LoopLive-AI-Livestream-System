const { Masterchat } = require("masterchat");

async function testChat(videoId) {
  console.log(`--- Testing YouTube Chat Polling for Video: ${videoId} ---`);
  
  try {
    const mc = new Masterchat(videoId, "", { mode: "live" });
    
    mc.on("chat", (chat) => {
      const author = chat.authorName;
      const message = chat.message?.map(m => m.text).join("") || " (no text) ";
      console.log(`✅ [CHAT RECEIVED] ${author}: ${message}`);
    });

    mc.on("error", (err) => {
      console.error("❌ [MASTERCHAT ERROR]:", err.message);
    });

    mc.on("end", () => {
      console.log("ℹ️ [INFO] Stream/Polling ended.");
    });

    console.log("🚀 Starting listener... (Press Ctrl+C to stop)");
    mc.listen();

  } catch (err) {
    console.error("❌ [CRITICAL ERROR]:", err.message);
  }
}

// Get video ID from command line or use a fallback
const targetVideoId = process.argv[2];
if (!targetVideoId) {
  console.error("Please provide a YouTube Video ID: node test-yt.js <VIDEO_ID>");
  process.exit(1);
}

testChat(targetVideoId);
