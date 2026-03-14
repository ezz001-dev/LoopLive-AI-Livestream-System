import React from "react";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";

import VideoLibraryHeader from "@/components/admin/VideoLibraryHeader";
import VideoAssetCard from "@/components/admin/VideoAssetCard";

export default async function VideosPage() {
  const videos = await prisma.videos.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      filename: true,
      file_type: true,
      file_path: true,
      public_url: true,
      storage_provider: true,
      created_at: true,
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <VideoLibraryHeader />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Upload Card */}
        <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center group hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer">
          <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-blue-400 group-hover:scale-110 transition-all border border-slate-800">
            <Plus size={32} />
          </div>
          <p className="mt-4 text-slate-300 font-medium whitespace-nowrap">Upload New Asset</p>
          <p className="mt-1 text-slate-500 text-xs">Supports MP4, MOV up to 2GB</p>
        </div>

        {(videos.map((video) => (
          <VideoAssetCard key={video.id} video={video} />
        )) as React.ReactNode)}
      </div>


      {videos.length === 0 && (
        <div className="py-20 text-center text-slate-500">
          <p className="text-lg">No videos uploaded yet.</p>
        </div>
      )}
    </div>
  );
}
