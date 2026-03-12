import React from "react";
import { Upload, FileVideo, Trash2, ExternalLink, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";

import VideoLibraryHeader from "@/components/admin/VideoLibraryHeader";

export default async function VideosPage() {
  const videos = await prisma.videos.findMany({
    orderBy: { created_at: "desc" }
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
          <div key={video.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden group hover:border-slate-700 transition-all">
            <div className="aspect-video bg-slate-950 flex items-center justify-center text-slate-800 transition-colors group-hover:bg-slate-900 relative">
               <FileVideo size={48} className="group-hover:text-slate-700 transition-colors" />
               <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors" />
            </div>
            <div className="p-5">
              <h3 className="font-bold text-white truncate text-lg">{video.filename}</h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{video.file_type}</p>
              
              <div className="flex items-center justify-between mt-6">
                <div className="flex gap-2">
                   <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="View Details">
                      <ExternalLink size={16} />
                   </button>
                   <button className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete Video">
                      <Trash2 size={16} />
                   </button>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">
                  {new Date(video.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
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
