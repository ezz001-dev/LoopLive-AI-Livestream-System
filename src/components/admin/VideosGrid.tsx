"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import VideoAssetCard from "./VideoAssetCard";
import UploadVideoModal from "./UploadVideoModal";

interface Video {
    id: string;
    filename: string;
    file_type: string;
    file_path: string;
    public_url: string | null;
    storage_provider: string;
    created_at: Date;
}

export default function VideosGrid({ initialVideos }: { initialVideos: Video[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Upload Card */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="border-2 border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center group hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
        >
          <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-blue-400 group-hover:scale-110 transition-all border border-slate-800">
            <Plus size={32} />
          </div>
          <p className="mt-4 text-slate-300 font-medium whitespace-nowrap">Tambah Video Baru</p>
          <p className="mt-1 text-slate-500 text-xs">Dukungan MP4 dan MOV hingga 2GB</p>
        </div>

        <>
          {initialVideos.map((video) => (
            <VideoAssetCard key={video.id} video={video} />
          ))}
        </>
      </div>

      <UploadVideoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
