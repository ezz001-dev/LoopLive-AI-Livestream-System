"use client";

import React, { useState } from "react";
import { Upload, Plus } from "lucide-react";
import UploadVideoModal from "@/components/admin/UploadVideoModal";

export default function VideoLibraryHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Library Video</h2>
          <p className="text-slate-400 mt-1">Simpan dan kelola video yang akan dipakai untuk sesi live Anda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Upload size={18} />
          Tambah Video
        </button>
      </div>
      
      <UploadVideoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
