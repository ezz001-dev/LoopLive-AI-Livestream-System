import React from "react";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

import VideoLibraryHeader from "@/components/admin/VideoLibraryHeader";
import VideosGrid from "@/components/admin/VideosGrid";

export default async function VideosPage() {
  const tenantId = await getCurrentTenantId();

  const videos = await (prisma.videos as any).findMany({
    where: { tenant_id: tenantId },
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

      <VideosGrid initialVideos={videos} />

      {videos.length === 0 && (
        <div className="py-20 text-center text-slate-500">
          <p className="text-lg">Belum ada video yang ditambahkan.</p>
        </div>
      )}
    </div>
  );
}
