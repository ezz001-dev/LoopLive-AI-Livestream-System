"use client";

import React, { useState } from "react";
import { Upload, X, RefreshCw, FileVideo } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UploadVideoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onClose();
        router.refresh();
      } else {
        const response = JSON.parse(xhr.responseText);
        alert(`Upload failed: ${response.error || "Unknown error"}`);
      }
      setUploading(false);
    };

    xhr.onerror = () => {
      alert("Network error during upload");
      setUploading(false);
    };

    xhr.open("POST", "/api/videos");
    xhr.send(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h3 className="font-bold text-white uppercase tracking-widest text-xs">Upload New Asset</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-6">
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all relative">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {file ? (
               <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                     <FileVideo size={24} />
                  </div>
                  <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Selected</p>
               </div>
            ) : (
              <>
                <Upload size={32} className="text-slate-600 mb-4" />
                <p className="text-sm text-slate-400">Drag & drop your video or click to browse</p>
                <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">Max 2GB</p>
              </>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">Uploading File...</span>
                <span className="text-blue-400">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
             <button
               type="button"
               disabled={uploading}
               onClick={onClose}
               className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-400 font-bold hover:bg-slate-800 transition-all text-sm"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={!file || uploading}
               className="flex-[2] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 active:scale-95 text-sm flex items-center justify-center gap-2"
             >
               <>
                 {uploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                 <span>{uploading ? "Uploading..." : "Publish Asset"}</span>
               </>
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
