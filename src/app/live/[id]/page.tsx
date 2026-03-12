"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { io, Socket } from "socket.io-client";
import { Send, User, Bot, Sparkles, MessageCircle, Info, Radio, Volume2, VolumeX } from "lucide-react";

interface Message {
  id?: string;
  viewerId: string;
  message: string;
  createdAt: string;
}

export default function PublicLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: liveId } = React.use(params);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [viewerId] = useState(`Viewer_${Math.floor(Math.random() * 9000) + 1000}`);
  const [isLive, setIsLive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);

  // Sync ref with state to allow access inside socket closure without reconnection
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    console.log("[PublicLivePage] 🔊 Audio Enabled State:", audioEnabled);
  }, [audioEnabled]);

  // 1. Initialize HLS Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // MediaMTX HLS URL (Default bridge from worker)
    const hlsUrl = `http://localhost:8888/live/${liveId}/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        backBufferLength: 60,
        maxBufferLength: 30,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLive(true);
        video.play().catch(() => {
           console.log("Autoplay blocked");
        });
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
         if (data.fatal) setIsLive(false);
      });
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLive(true);
        video.play();
      });
    }
  }, [liveId]);

  // 2. Initialize WebSocket
  useEffect(() => {
    const socketUrl = typeof window !== "undefined" 
      ? `http://${window.location.hostname}:3001`
      : "http://localhost:3001";

    console.log("[PublicLivePage] Initializing socket to:", socketUrl);
    const s = io(socketUrl);
    setSocket(s);

    s.on("connect", () => {
      console.log("[PublicLivePage] ✅ Connected to Chat Server");
      s.emit("join_room", liveId);
      console.log("[PublicLivePage] Joined room:", liveId);
    });

    s.on("chat_broadcast", (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    s.on("ai_voice_play", async (data: { audioUrl: string; text: string }) => {
      console.log("[PublicLivePage] 🔉 ai_voice_play event received:", data.audioUrl);
      if (audioRef.current) {
        if (audioEnabledRef.current) {
            console.log("[PublicLivePage] ✅ Attempting to play audio...");
            
            // Bypass internal/browser caching of potential empty/404 files
            const audioUrlWithCacheBust = `${data.audioUrl}?t=${Date.now()}`;
            
            const playWithRetry = async (url: string, retries = 5) => {
                if (!audioRef.current) return;
                
                try {
                    audioRef.current.src = url;
                    audioRef.current.load();
                    await audioRef.current.play();
                    console.log("[PublicLivePage] 🎶 Playback started successfully");
                } catch (e: any) {
                    if (retries > 0) {
                        console.warn(`[PublicLivePage] ⚠️ Playback failed, retrying in 500ms... (${retries} left). Error: ${e.message}`);
                        setTimeout(() => playWithRetry(url, retries - 1), 500);
                    } else {
                        console.error("[PublicLivePage] ❌ All playback attempts failed:", e);
                        if (!e.message.includes("interrupted") && !e.message.includes("interaction")) {
                             alert(`AI Audio Error: Could not load the voice message. 
                             
Details: ${e.message}`);
                        }
                    }
                }
            };

            playWithRetry(audioUrlWithCacheBust);
        } else {
            console.warn("[PublicLivePage] 🔇 Audio blocked: Please click the 'Sync AI Audio' button first.");
        }
      } else {
        console.error("[PublicLivePage] ❌ audioRef is null");
      }
    });

    s.on("disconnect", () => {
      console.warn("[PublicLivePage] ❌ Socket disconnected");
    });

    return () => {
      s.disconnect();
    };
  }, [liveId]);

  useEffect(() => {
    (window as any).audioEnabledPublic = audioEnabled;
  }, [audioEnabled]);

  const playTestSound = () => {
    if (audioRef.current) {
      console.log("[PublicLivePage] Playing test sound...");
      audioRef.current.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      audioRef.current.play().catch(e => alert("Test sound failed: " + e.message));
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    socket.emit("chat_message", {
      liveId,
      viewerId,
      message: input,
    });
    setInput("");
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 overflow-hidden">
      {/* Video Content */}
      <div className="flex-1 relative bg-black flex items-center justify-center group overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted // Most browsers require initial mute for autoplay
        />
        
        {/* Audio Overlay (Invisible) */}
        <audio ref={audioRef} className="hidden" />

        {/* Live Badge */}
        <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${
                isLive ? 'bg-red-500/80 border-red-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}>
                <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-xs font-black uppercase tracking-widest">{isLive ? 'LIVE' : 'OFFLINE'}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-700 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <User size={12} />
                0 Viewers
            </div>
            
            {/* Audio Unlock Button */}
            <button 
                onClick={() => {
                    if (audioRef.current) {
                        audioRef.current.play().catch(() => {});
                    }
                    setAudioEnabled(!audioEnabled);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all ${
                    audioEnabled ? 'bg-blue-500/80 border-blue-400 text-white' : 'bg-yellow-500/80 border-yellow-400 text-white animate-pulse'
                }`}
            >
                <Sparkles size={12} className={audioEnabled ? '' : 'animate-spin'} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {audioEnabled ? 'Audio Active' : 'Sync AI Audio'}
                </span>
            </button>

            {audioEnabled && (
                <button 
                    onClick={playTestSound}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white transition-all"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">Test Sound</span>
                </button>
            )}
        </div>

        {/* Overlay Info (Interactive UX) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8 pointer-events-none">
            <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-lg flex items-center gap-3">
                 <Radio size={24} className="text-red-500" />
                 LoopLive Interactive Stream
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl line-clamp-2">
                Experience the first AI-driven interactive livestream where your comments are heard and answered in real-time.
            </p>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full lg:w-[400px] border-l border-slate-800 bg-slate-900/50 flex flex-col shadow-2xl z-10">
        <div className="p-4 border-b border-white/5 bg-slate-900/80 backdrop-blur flex items-center justify-between">
           <h2 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-500" />
              Live Interaction
           </h2>
           <div className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-colors cursor-help">
              <Info size={16} />
           </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-slate-800/50 flex items-center justify-center text-slate-600 border border-white/5 animate-bounce">
                 <Sparkles size={32} />
              </div>
              <p className="text-slate-500 text-sm font-medium">Be the first to say hello!<br/>AI is listening.</p>
            </div>
          )}
          {(messages.map((m, i) => (
            <div 
              key={i} 
              className={`flex gap-3 animate-in fade-in slide-in-from-right-2 duration-300 ${
                m.viewerId === 'AI_ASSISTANT' ? 'flex-row-reverse text-right' : ''
              }`}
            >
              <div className={`mt-1 h-8 w-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                m.viewerId === 'AI_ASSISTANT' 
                ? 'bg-gradient-to-tr from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20' 
                : 'bg-slate-800'
              }`}>
                {m.viewerId === 'AI_ASSISTANT' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-slate-400" />}
              </div>
              <div className={`space-y-1 max-w-[80%] ${m.viewerId === 'AI_ASSISTANT' ? 'items-end' : ''}`}>
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] font-black uppercase tracking-widest ${
                      m.viewerId === 'AI_ASSISTANT' ? 'text-pink-400 order-2' : 'text-slate-500'
                   }`}>
                      {m.viewerId === 'AI_ASSISTANT' ? 'Super AI' : m.viewerId}
                   </span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                  m.viewerId === 'AI_ASSISTANT' 
                  ? 'bg-purple-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                  {m.message}
                </div>
              </div>
            </div>
          )) as React.ReactNode)}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
          <form onSubmit={sendMessage} className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 pr-14 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-slate-600 group-hover:bg-black/50"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 active:scale-90 disabled:opacity-50"
              disabled={!input.trim()}
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-[10px] text-slate-600 mt-3 text-center uppercase tracking-widest font-bold">
            Chat enabled via WebSockets
          </p>
        </div>
      </div>
    </div>
  );
}
