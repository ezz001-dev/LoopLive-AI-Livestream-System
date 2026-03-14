"use client";

import { useState } from "react";
import { ExternalLink, FileVideo, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface VideoAssetCardProps {
  video: {
    id: string;
    filename: string;
    file_type: string;
    file_path: string;
    public_url: string | null;
    storage_provider: string;
    created_at: Date | string;
  };
}

export default function VideoAssetCard({ video }: VideoAssetCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const previewUrl = video.public_url || video.file_path;

  const handleOpen = () => {
    if (!previewUrl) {
      alert("Video URL is not available for preview.");
      return;
    }

    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${video.filename}" from the library?`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete video");
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to delete video");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden group hover:border-slate-700 transition-all">
      <div className="aspect-video bg-slate-950 flex items-center justify-center text-slate-800 transition-colors group-hover:bg-slate-900 relative">
        <FileVideo size={48} className="group-hover:text-slate-700 transition-colors" />
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors" />
      </div>
      <div className="p-5">
        <h3 className="font-bold text-white truncate text-lg">{video.filename}</h3>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{video.file_type}</p>
        <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-wider">
          {video.storage_provider || "local"}
        </p>

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            <button
              onClick={handleOpen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Open Video"
            >
              <ExternalLink size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
              title="Delete Video"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">
            {new Date(video.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
