import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";
const socket = io(SOCKET_URL);

const liveId = "test-live-id"; // Ensure this exists in your DB if you want valid persistence
const viewerId = "User_XYZ";

socket.on("connect", () => {
    console.log("Connected to Socket Server");
    
    // 1. Join Room
    socket.emit("join_room", liveId);
    
    // 2. Send Message
    console.log("Sending test message...");
    socket.emit("chat_message", {
        liveId,
        viewerId,
        message: "Hello AI, what is the best food in the world?"
    });
});

socket.on("chat_broadcast", (data) => {
    console.log("\n[Broadcast Received]");
    console.log(`${data.viewerId}: ${data.message}`);
});

socket.on("ai_voice_play", (data) => {
    console.log("\n[AI Voice Trigger Received]");
    console.log(`Text: ${data.text}`);
});

setTimeout(() => {
    console.log("\nTest finished. Closing...");
    socket.disconnect();
    process.exit(0);
}, 15000);
