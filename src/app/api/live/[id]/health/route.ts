import { NextResponse } from "next/server";
import { workerManager } from "@/lib/worker-manager";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Check if session is running in worker manager
    const isRunning = workerManager.isRunning(sessionId);
    const lastHeartbeat = workerManager.getHeartbeat(sessionId);
    
    let status = "IDLE";
    let heartbeatAgeSeconds = null;
    
    if (isRunning) {
      status = "LIVE";
      if (lastHeartbeat) {
        heartbeatAgeSeconds = Math.floor((Date.now() - lastHeartbeat) / 1000);
        
        // If it's running but log silence > 30s, it's a zombie (though worker manager should heal it)
        if (heartbeatAgeSeconds > 30) {
          status = "ZOMBIE";
        }
      } else {
        // Just started, no heartbeat yet
        status = "STARTING";
      }
    }

    return NextResponse.json({
      sessionId,
      status,
      heartbeatAgeSeconds,
      timestamp: Date.now()
    });
  } catch (error) {
    // If param parsing fails, fallback to 'unknown'
    const id = typeof params === 'object' && params !== null && 'id' in params 
      ? (params as any).id 
      : 'unknown';
    console.error(`[HealthAPI] Error fetching health for ${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
