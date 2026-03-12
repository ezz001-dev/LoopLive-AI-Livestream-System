"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Radio, MessageSquare, Users, Settings, Activity, ArrowLeft, Edit2, ExternalLink, Clock, Volume2, VolumeX } from "lucide-react";
import SessionControls from "@/components/admin/SessionControls";
import EditSessionModal from "@/components/admin/EditSessionModal";
import Link from "next/link";

interface SessionData {
  id: string;
  title: string;
  status: string;
  video?: {
    filename: string;
  };
  chat_logs: Array<{
    id: string;
    viewer_id: string;
    message: string;
    created_at: Date;
  }>;
  ai_reply_logs: Array<{
    id: string;
    reply: string;
    created_at: Date;
  }>;
  youtube_video_id: string | null;
  youtube_channel_id: string | null;
  target_rtmp_url: string | null;
  stream_key: string | null;
  context_text: string | null;
  ai_tone: string;
  // Schedule fields
  schedule_enabled: boolean;
  schedule_type: string;
  schedule_start_at: Date | null;
  schedule_end_at: Date | null;
  schedule_days: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  schedule_timezone: string;
  schedule_repeat_end: Date | null;
}

interface ClientSessionPageProps {
  session: SessionData;
}

export default function ClientSessionPage({ session }: ClientSessionPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionData, setSessionData] = useState(session);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);
  const lastAudioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRetryCountRef = useRef(0);

  // Sync ref with state
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    console.log("[ClientSessionPage] 🔊 Audio Enabled State:", audioEnabled);
  }, [audioEnabled]);

  // Initialize Socket for TTS Playback
  useEffect(() => {
    const socketUrl = typeof window !== "undefined" 
      ? `http://${window.location.hostname}:3001`
      : "http://localhost:3001";
      
    console.log("[ClientSessionPage] Initializing socket to:", socketUrl);
    const s = io(socketUrl);
    setSocket(s);

    s.on("connect", () => {
      console.log("[ClientSessionPage] ✅ Connected to SocketServer");
      s.emit("join_room", sessionData.id);
      console.log("[ClientSessionPage] Joined room:", sessionData.id);
    });

    s.on("ai_voice_play", async (data: { audioUrl: string; text: string }) => {
      console.log("[ClientSessionPage] 🔉 ai_voice_play event received:", data.audioUrl);
      lastAudioUrlRef.current = data.audioUrl;
      
      if (audioRef.current) {
        if (audioEnabledRef.current) { 
            console.log("[ClientSessionPage] ✅ Attempting to play audio...");
            
            // Add a timestamp to bypass any browser/server caching of a potential 404
            const audioUrlWithCacheBust = `${data.audioUrl}?t=${Date.now()}`;
            
            const playWithRetry = async (url: string, retries = 5) => {
                if (!audioRef.current) return;
                
                try {
                    audioRef.current.src = url;
                    audioRef.current.load();
                    await audioRef.current.play();
                    console.log("[ClientSessionPage] 🎶 Playback started successfully");
                } catch (e: any) {
                    if (retries > 0) {
                        console.warn(`[ClientSessionPage] ⚠️ Playback failed, retrying in 500ms... (${retries} left). Error: ${e.message}`);
                        setTimeout(() => playWithRetry(url, retries - 1), 500);
                    } else {
                        console.error("[ClientSessionPage] ❌ All playback attempts failed:", e);
                        // Only alert if it's not a common "interrupted" or "user interaction" error
                        if (!e.message.includes("interrupted") && !e.message.includes("interaction")) {
                             alert(`TTS Playback Error: The audio file couldn't be loaded. 
                             
Details: ${e.message}
URL: ${url}`);
                        }
                    }
                }
            };

            playWithRetry(audioUrlWithCacheBust);
        } else {
            console.warn("[ClientSessionPage] 🔇 Audio blocked: You must click 'Enable TTS Audio' first.");
        }
      } else {
        console.error("[ClientSessionPage] ❌ audioRef is null");
      }
    });

    s.on("disconnect", () => {
      console.warn("[ClientSessionPage] ❌ Socket disconnected");
    });

    return () => {
      s.disconnect();
    };
  }, [sessionData.id]);

  // Use a ref for audioEnabled to avoid reconnection but keep access in event handler
  // Or just use a global or state that doesn't trigger effect
  useEffect(() => {
    (window as any).audioEnabledGlobal = audioEnabled;
  }, [audioEnabled]);

  const toggleAudio = () => {
    const nextState = !audioEnabled;
    console.log("[ClientSessionPage] User toggled audio to:", nextState);
    if (nextState && audioRef.current) {
      console.log("[ClientSessionPage] Unlocking audio context...");
      audioRef.current.play().catch((err) => {
          console.warn("[ClientSessionPage] Initial unlock play failed (expected if silent):", err);
      });
    }
    setAudioEnabled(nextState);
  };

  const playTestSound = () => {
    if (audioRef.current) {
      console.log("[ClientSessionPage] Playing test sound...");
      audioRef.current.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Small test file
      audioRef.current.play().catch(e => alert("Test sound failed: " + e.message));
    }
  };

  const handleSave = () => {
    setRefreshKey(k => k + 1);
    // Refresh the page to get updated data
    window.location.reload();
  };

  return (
    <div key={refreshKey} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/admin/live" className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
             <h2 className="text-3xl font-bold text-white tracking-tight">{sessionData.title}</h2>
             <button 
               onClick={() => setIsEditing(true)}
               className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
               title="Edit Session"
             >
               <Edit2 size={16} />
             </button>
             
             {/* Audio Unlock Button */}
             <button
               onClick={toggleAudio}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                 audioEnabled 
                   ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                   : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
               }`}
             >
               {audioEnabled ? (
                 <>
                   <Volume2 size={14} />
                   TTS Enabled
                 </>
               ) : (
                 <>
                   <VolumeX size={14} />
                   Enable TTS Audio
                 </>
               )}
             </button>

             <button
               onClick={playTestSound}
               className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all border border-slate-700"
             >
               Test Audio
             </button>
          </div>
          <div className="flex items-center gap-3 mt-1">
             <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                sessionData.status === 'LIVE' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
             }`}>
                {sessionData.status}
             </span>
             <span className="text-slate-600 text-xs">•</span>
             <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">{sessionData.id}</span>
          </div>
        </div>
      </div>

      {isEditing && (
        <EditSessionModal
          sessionId={sessionData.id}
          initialData={{
            title: sessionData.title,
            youtube_video_id: sessionData.youtube_video_id,
            youtube_channel_id: sessionData.youtube_channel_id,
            target_rtmp_url: sessionData.target_rtmp_url,
            stream_key: sessionData.stream_key,
            context_text: sessionData.context_text,
            ai_tone: sessionData.ai_tone,
            // Schedule fields
            schedule_enabled: sessionData.schedule_enabled,
            schedule_type: sessionData.schedule_type,
            schedule_start_at: sessionData.schedule_start_at,
            schedule_end_at: sessionData.schedule_end_at,
            schedule_days: sessionData.schedule_days,
            schedule_start_time: sessionData.schedule_start_time,
            schedule_end_time: sessionData.schedule_end_time,
            schedule_timezone: sessionData.schedule_timezone,
            schedule_repeat_end: sessionData.schedule_repeat_end,
          }}
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Controls */}
        <div className="lg:col-span-2 space-y-6">
           {/* Preview Placeholder */}
           <div className="aspect-video bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 group relative overflow-hidden">
              {sessionData.status === 'LIVE' ? (
                <div className="flex flex-col items-center animate-pulse">
                   <Activity size={48} className="text-red-500/50" />
                   <p className="mt-4 text-sm font-medium">Stream is Active</p>
                   <p className="text-xs">Live monitoring unavailable in placeholder</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                   <Radio size={48} />
                   <p className="mt-4 text-sm font-medium">Stream is Offline</p>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest text-slate-400 border border-white/5">
                Preview
              </div>
           </div>

           {/* Action Buttons */}
           <SessionControls 
             sessionId={sessionData.id} 
             initialStatus={sessionData.status}
             initialYoutubeId={sessionData.youtube_video_id}
           />

           {/* Configuration Summary */}
           <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                 <Settings size={18} className="text-blue-400" />
                 Session Configuration
               </h3>
               <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                     <label className="text-slate-500 block">AI Tone / Personality</label>
                     <span className="text-slate-200 capitalize font-medium">{sessionData.ai_tone}</span>
                  </div>
                  <div>
                     <label className="text-slate-500 block">Source Content</label>
                     <span className="text-slate-200 truncate block font-medium">{sessionData.video?.filename || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                     <label className="text-slate-500 block">AI Context / Knowledge</label>
                     <p className="text-slate-300 mt-1 italic text-xs leading-relaxed line-clamp-2">"{sessionData.context_text || 'No context'}"</p>
                  </div>
               </div>
           </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
           {/* Realtime Stats */}
           <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-between group">
              <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Live Viewers</p>
                 <p className="text-3xl font-black text-white mt-1 group-hover:text-blue-400 transition-colors">0</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                 <Users size={24} />
              </div>
           </div>

           {/* Schedule Status */}
           {sessionData.schedule_enabled && (
             <div className="p-6 bg-slate-900/50 border border-purple-500/20 rounded-3xl">
               <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                 <Clock size={18} className="text-purple-400" />
                 Schedule
               </h3>
               <div className="space-y-2 text-sm">
                 <div className="flex items-center justify-between">
                   <span className="text-slate-500">Type</span>
                   <span className="text-purple-400 font-medium capitalize">{sessionData.schedule_type}</span>
                 </div>
                 {sessionData.schedule_type === 'one-time' ? (
                   <>
                     {sessionData.schedule_start_at && (
                       <div className="flex items-center justify-between">
                         <span className="text-slate-500">Start</span>
                         <span className="text-slate-200 text-xs">{new Date(sessionData.schedule_start_at).toLocaleString('id-ID')}</span>
                       </div>
                     )}
                     {sessionData.schedule_end_at && (
                       <div className="flex items-center justify-between">
                         <span className="text-slate-500">End</span>
                         <span className="text-slate-200 text-xs">{new Date(sessionData.schedule_end_at).toLocaleString('id-ID')}</span>
                       </div>
                     )}
                   </>
                 ) : (
                   <>
                     {sessionData.schedule_days && (
                       <div className="flex items-center justify-between">
                         <span className="text-slate-500">Days</span>
                         <span className="text-slate-200 text-xs">
                           {(() => {
                             try {
                               return JSON.parse(sessionData.schedule_days).map((d: string) => d.slice(0, 3)).join(', ');
                             } catch { return sessionData.schedule_days; }
                           })()}
                         </span>
                       </div>
                     )}
                     {sessionData.schedule_start_time && sessionData.schedule_end_time && (
                       <div className="flex items-center justify-between">
                         <span className="text-slate-500">Time</span>
                         <span className="text-slate-200 text-xs">{sessionData.schedule_start_time} - {sessionData.schedule_end_time}</span>
                       </div>
                     )}
                   </>
                 )}
               </div>
             </div>
           )}

           {/* Recent Chat Feed */}
           <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex-1 flex flex-col min-h-[400px]">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                 <MessageSquare size={18} className="text-purple-400" />
                 Recent Activity
               </h3>
              <div className="space-y-4 flex-1 overflow-y-auto">
                 <>
                 {sessionData.chat_logs.length === 0 && (
                   <div className="h-40 flex items-center justify-center text-slate-600 italic text-center px-4">
                      <p className="text-xs uppercase tracking-tighter">No chat activity recorded for this session yet.</p>
                   </div>
                 )}
                 {sessionData.chat_logs.length > 0 && (
                   <>
                   {sessionData.chat_logs.map((chat: any) => (
                     <div key={chat.id} className="p-3 bg-slate-950 rounded-xl border border-white/5">
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">{chat.viewer_id}</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{chat.message}</p>
                     </div>
                   ))}
                   </>
                 )}
                 </>
              </div>
              <Link href={`/live/${sessionData.id}`} target="_blank" className="mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700">
                 <span className="flex items-center justify-center gap-2 w-full">
                   Open Public View
                   <ExternalLink size={14} />
                 </span>
              </Link>
           </div>
        </div>
      </div>
       <audio ref={audioRef} className="hidden" />
    </div>
  );
}
