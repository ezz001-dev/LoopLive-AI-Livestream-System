"use client";

import React, { useState } from "react";
import { Upload, X, RefreshCw, FileVideo, AlertCircle } from "lucide-react";
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
  const router = useRouter();

  if (!isOpen) return null;

  const resetState = () => {
    setUploading(false);
    setUploadProgress(0);
    setStatusText("Uploading File...");
    setErrorDetail(null);
  };

  const uploadViaServerProxy = (selectedFile: File) =>
    new Promise<void>((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }

        try {
          const response = JSON.parse(xhr.responseText);
          reject(new Error(response.error || "Unknown error"));
        } catch {
          reject(new Error("Unknown error"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.open("POST", "/api/videos");
      xhr.send(formData);
    });

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
          xhr.timeout = 120000; // 2 minutes timeout for a single 10MB chunk

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "");
              if (etag) resolve(etag);
              else reject(new Error("No ETag in response"));
            } else {
              reject(new Error(`Server returned status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));
          xhr.ontimeout = () => reject(new Error("Request timed out"));
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              onProgress(event.loaded, event.total);
            }
          };

          xhr.open("PUT", url);
          xhr.send(chunk);
        });
      } catch (err: any) {
        attempt++;
        if (attempt >= MAX_RETRIES) throw err;
        
        const delay = RETRY_DELAY_MS * attempt;
        setStatusText(`Retrying part ${partNumber} (Attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error(`Failed after ${MAX_RETRIES} attempts`);
  };

  const uploadMultipartToR2 = async (init: any, selectedFile: File) => {
    const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
    const uploadedParts: { ETag: string; PartNumber: number }[] = [];

    logger.info(`Starting Multipart Upload`, {
        component: "UploadVideoModal",
        metadata: { fileName: selectedFile.name, fileSize: selectedFile.size, totalChunks }
    });

    for (let i = 0; i < totalChunks; i++) {
      const partNumber = i + 1;
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
      const chunk = selectedFile.slice(start, end);

      setStatusText(`Uploading Part ${partNumber}/${totalChunks}...`);

      // 1. Get presigned URL
      const partRes = await fetch("/api/videos/upload/part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video: init.video,
          uploadId: init.uploadId,
          partNumber,
        }),
      });

      const partData = await partRes.json();
      if (!partRes.ok || !partData.uploadUrl) {
        throw new Error(partData.error || `Failed to get URL for part ${partNumber}`);
      }

      // 2. Upload with Retry
      const etag = await uploadChunkWithRetry(
        partData.uploadUrl, 
        chunk, 
        partNumber, 
        totalChunks,
        (loaded, total) => {
          const chunkProgress = loaded / total;
          const overallProgress = Math.round(((i + chunkProgress) / totalChunks) * 100);
          setUploadProgress(overallProgress);
        }
      );

      uploadedParts.push({ ETag: etag, PartNumber: partNumber });
      
      // Periodical success logs for visibility
      if (partNumber % 5 === 0 || partNumber === totalChunks) {
          logger.info(`Uploaded part ${partNumber}/${totalChunks}`, {
              component: "UploadVideoModal",
              metadata: { uploadId: init.uploadId, partNumber }
          });
      }
    }

    return uploadedParts;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setErrorDetail(null);
    setStatusText("Preparing Upload...");

    try {
      // 1. Init
      const initRes = await fetch("/api/videos/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Failed to initialize upload");

      const uploadInit = initData as any;

      if (uploadInit.uploadStrategy === "multipart-r2") {
        const parts = await uploadMultipartToR2(uploadInit, file);

        setStatusText("Finalizing Upload...");
        const completeRes = await fetch("/api/videos/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...uploadInit.video,
            uploadId: uploadInit.uploadId,
            parts,
          }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error || "Failed to finalize upload");

        logger.info(`Upload completed successfully`, {
            component: "UploadVideoModal",
            metadata: { videoId: completeData.id, fileName: file.name }
        });
      } else {
        setStatusText("Uploading via Server...");
        await uploadViaServerProxy(file);
      }

      success("Video Berhasil!", `${file.name} telah ditambahkan ke library.`);
      resetState();
      setFile(null);
      onClose();
      router.refresh();
    } catch (error: any) {
      console.error("Upload process error:", error);
      const msg = error.message || "Unknown error";
      setErrorDetail(msg);
      toastError("Upload Gagal", msg);
      
      logger.error(`Upload failed: ${msg}`, {
        component: "UploadVideoModal",
        metadata: {
          fileName: file?.name,
          fileSize: file?.size,
          stack: error.stack,
          statusText
        }
      });
      setUploading(false); // keep state but allow retry
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-5 md:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h3 className="font-bold text-white uppercase tracking-widest text-[10px] md:text-xs">Tambah Video Baru</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-6 md:p-8 space-y-5 md:space-y-6">
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all relative">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setErrorDetail(null);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {file ? (
               <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                     <FileVideo size={24} />
                  </div>
                  <p className="text-xs md:text-sm font-medium text-slate-200 truncate max-w-[180px] md:max-w-[200px]">{file.name}</p>
                  <p className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
               </div>
            ) : (
              <>
                <Upload size={28} className="text-slate-600 mb-3 md:mb-4" />
                <p className="text-xs md:text-sm text-slate-400">Drag & drop your video or click to browse</p>
                <p className="text-[9px] md:text-[10px] text-slate-600 mt-2 uppercase tracking-widest">Support Large Files (&gt;1GB)</p>
              </>
            )}
          </div>

          {uploading && (
            <div className="space-y-3">
                <div className="flex items-center justify-between text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-slate-400 animate-pulse">{statusText}</span>
                    <span className="text-blue-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            </div>
          )}

          {errorDetail && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 animate-in slide-in-from-top-2">
                  <AlertCircle size={20} className="shrink-0" />
                  <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider">Upload Terhenti</p>
                      <p className="text-xs leading-relaxed opacity-80">{errorDetail}</p>
                  </div>
              </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
             <button
               type="button"
               disabled={uploading}
               onClick={onClose}
               className="order-2 sm:order-1 flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-400 font-bold hover:bg-slate-800 transition-all text-xs md:text-sm"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={!file || (uploading && uploadProgress < 100)}
               className="order-1 sm:order-2 flex-[2] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 active:scale-95 text-xs md:text-sm flex items-center justify-center gap-2"
             >
               {uploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
               <span>{uploading ? "Uploading..." : "Publish Asset"}</span>
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
