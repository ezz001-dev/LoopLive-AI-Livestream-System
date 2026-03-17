"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, X, RefreshCw, FileVideo, AlertCircle, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { logger } from "@/lib/logger";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export default function UploadVideoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { success, error: toastError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Uploading File...");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [debugLogs]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-19), `[${timestamp}] ${msg}`]);
  };

  const resetState = () => {
    setUploading(false);
    setUploadProgress(0);
    setStatusText("Uploading File...");
    setErrorDetail(null);
    setDebugLogs([]);
  };

  const uploadViaServerProxy = async (selectedFile: File) => {
      addLog("Starting fallback server-proxy upload...");
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      return new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                  const percent = Math.round((event.loaded / event.total) * 100);
                  setUploadProgress(percent);
              }
          };
          xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Server Error: ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Network error during server upload"));
          xhr.open("POST", "/api/videos");
          xhr.send(formData);
      });
  };

  const uploadChunkWithRetry = async (
    url: string, 
    chunk: Blob, 
    partNumber: number, 
    totalChunks: number,
    onProgress: (loaded: number, total: number) => void
  ): Promise<string> => {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        return await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.timeout = 180000; // 3 minutes for 10MB chunk

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "");
              if (etag) resolve(etag);
              else reject(new Error("No ETag in response - Check R2 CORS settings"));
            } else {
              reject(new Error(`R2 Response: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Connection to R2 failed (CORS or Network)"));
          xhr.ontimeout = () => reject(new Error("Chunk upload timed out"));
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(event.loaded, event.total);
          };

          xhr.open("PUT", url);
          xhr.send(chunk);
        });
      } catch (err: any) {
        attempt++;
        addLog(`Part ${partNumber} failed: ${err.message}. Retrying...`);
        if (attempt >= MAX_RETRIES) throw err;
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
    throw new Error(`Failed after ${MAX_RETRIES} retries`);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setErrorDetail(null);
    setDebugLogs([]);
    addLog(`Initiating upload: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    try {
      // 1. Init
      setStatusText("Initializing Transaction...");
      const initRes = await fetch("/api/videos/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type || "video/mp4",
          fileSize: file.size,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Init failed");
      addLog(`Init Success. Strategy: ${initData.uploadStrategy}`);

      const uploadInit = initData as any;

      if (uploadInit.uploadStrategy === "multipart-r2") {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadedParts: { ETag: string; PartNumber: number }[] = [];

        for (let i = 0; i < totalChunks; i++) {
          const partNumber = i + 1;
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          setStatusText(`Uploading Part ${partNumber}/${totalChunks}...`);

          // Get part URL
          const partRes = await fetch("/api/videos/upload/part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              video: uploadInit.video,
              uploadId: uploadInit.uploadId,
              partNumber,
            }),
          });
          const pd = await partRes.json();
          if (!partRes.ok) throw new Error("Failed to fetch part URL");

          // Upload chunk
          const etag = await uploadChunkWithRetry(
            pd.uploadUrl, 
            chunk, 
            partNumber, 
            totalChunks,
            (loaded, total) => {
              const cp = loaded / total;
              setUploadProgress(Math.round(((i + cp) / totalChunks) * 100));
            }
          );

          uploadedParts.push({ ETag: etag, PartNumber: partNumber });
          if (partNumber % 5 === 0 || partNumber === totalChunks) {
              addLog(`Part ${partNumber}/${totalChunks} uploaded.`);
          }
        }

        setStatusText("Merging pieces...");
        addLog("Finalizing with server...");
        const completeRes = await fetch("/api/videos/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...uploadInit.video,
            uploadId: uploadInit.uploadId,
            parts: uploadedParts,
          }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error || "Completion failed");
        addLog("Upload finalized successfully!");
      } else {
        await uploadViaServerProxy(file);
      }

      success("Video Berhasil!", `${file.name} telah diunggah.`);
      resetState();
      setFile(null);
      onClose();
      router.refresh();
    } catch (error: any) {
      console.error("Upload Error:", error);
      const msg = error.message || "Unknown error";
      setErrorDetail(msg);
      addLog(`CRITICAL ERROR: ${msg}`);
      toastError("Upload Gagal", msg);
      logger.error(`Mobile Upload Stuck: ${msg}`, { metadata: { statusText, fileName: file?.name } });
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white uppercase tracking-widest text-xs">Upload Video Asset</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all relative ${file ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700'}`}>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
              {file ? (
                 <div className="space-y-2">
                    <FileVideo size={40} className="text-blue-400 mx-auto" />
                    <p className="text-sm font-medium text-slate-200">{file.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                 </div>
              ) : (
                <>
                  <Upload size={32} className="text-slate-600 mb-4" />
                  <p className="text-sm text-slate-400">Pilih video untuk diunggah</p>
                  <p className="text-[10px] text-slate-600 mt-2 uppercase">Mendukung file &gt;1GB</p>
                </>
              )}
            </div>

            {uploading && (
              <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-blue-400 animate-pulse">{statusText}</span>
                      <span className="text-white">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
              </div>
            )}

            {errorDetail && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 text-red-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase">Gagal Mengunggah</p>
                        <p className="text-xs leading-relaxed">{errorDetail}</p>
                    </div>
                </div>
            )}

            {/* Debug Console UI */}
            {(debugLogs.length > 0 || uploading) && (
                <div className="rounded-2xl bg-black/40 border border-slate-800/50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <Terminal size={12} />
                        <span>System logs</span>
                    </div>
                    <div 
                        ref={scrollRef}
                        className="h-24 overflow-y-auto font-mono text-[10px] space-y-1 text-slate-400 scroll-smooth"
                    >
                        <>
                            {debugLogs.map((log, i) => (
                                <div key={i} className="border-l border-slate-800 pl-2 leading-tight py-0.5">{log}</div>
                            ))}
                        </>
                        {uploading && debugLogs.length === 0 && <div className="animate-pulse">Waiting for logs...</div>}
                    </div>
                </div>
            )}

            <div className="flex gap-3">
               <button
                 type="button"
                 disabled={uploading}
                 onClick={onClose}
                 className="flex-1 py-3 px-6 rounded-xl border border-slate-800 text-slate-400 font-bold hover:bg-slate-800 transition-all text-sm"
               >
                 Batal
               </button>
               <button
                 type="submit"
                 disabled={!file || (uploading && uploadProgress < 100)}
                 className="flex-[2] py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 text-sm flex items-center justify-center gap-2"
               >
                 {uploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                 <span>{uploading ? "Mengunggah..." : "Mulai Unggah"}</span>
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
