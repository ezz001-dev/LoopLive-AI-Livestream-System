"use client";

import React, { useState } from "react";
import { Upload, X, RefreshCw, FileVideo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";

type UploadInitResponse =
  | {
      uploadStrategy: "server-proxy";
      storageProvider: "local" | "r2";
    }
  | {
      uploadStrategy: "direct-r2";
      storageProvider: "local" | "r2";
      uploadUrl: string;
      uploadHeaders: Record<string, string>;
      video: {
        id: string;
        filename: string;
        file_type: string;
        file_size: string;
        storage_provider: "local" | "r2";
        storage_key: string | null;
        file_path: string;
        public_url: string | null;
      };
    };

export default function UploadVideoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { success, error: toastError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Uploading File...");
  const router = useRouter();

  if (!isOpen) return null;

  const resetState = () => {
    setUploading(false);
    setUploadProgress(0);
    setStatusText("Uploading File...");
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

  const uploadDirectToR2 = (init: Extract<UploadInitResponse, { uploadStrategy: "direct-r2" }>, selectedFile: File) =>
    new Promise<void>((resolve, reject) => {
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

        reject(new Error(`R2 upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error while uploading to R2"));
      xhr.open("PUT", init.uploadUrl);
      Object.entries(init.uploadHeaders).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.send(selectedFile);
    });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setStatusText("Preparing Upload...");

    try {
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
      if (!initRes.ok) {
        throw new Error(initData.error || "Failed to initialize upload");
      }

      const uploadInit = initData as UploadInitResponse;

      if (uploadInit.uploadStrategy === "direct-r2") {
        setStatusText("Uploading Directly to R2...");
        await uploadDirectToR2(uploadInit, file);

        setStatusText("Finalizing Metadata...");
        const completeRes = await fetch("/api/videos/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(uploadInit.video),
        });
        const completeData = await completeRes.json();

        if (!completeRes.ok) {
          throw new Error(completeData.error || "Failed to finalize video upload");
        }
      } else {
        setStatusText("Uploading via Server...");
        await uploadViaServerProxy(file);
      }

      resetState();
      setFile(null);
      onClose();
      router.refresh();
      success("Video Berhasil!", `${file.name} telah ditambahkan ke library.`);
    } catch (error: any) {
      toastError("Upload Gagal", error.message || "Unknown error");
      resetState();
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
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {file ? (
               <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                     <FileVideo size={24} />
                  </div>
                  <p className="text-xs md:text-sm font-medium text-slate-200 truncate max-w-[180px] md:max-w-[200px]">{file.name}</p>
                  <p className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest">Selected</p>
               </div>
            ) : (
              <>
                <Upload size={28} className="text-slate-600 mb-3 md:mb-4" />
                <p className="text-xs md:text-sm text-slate-400">Drag & drop your video or click to browse</p>
                <p className="text-[9px] md:text-[10px] text-slate-600 mt-2 uppercase tracking-widest">Max 2GB</p>
              </>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">{statusText}</span>
                <span className="text-blue-400">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 md:h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                  style={{ width: `${uploadProgress}%` }}
                />
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
               disabled={!file || uploading}
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
