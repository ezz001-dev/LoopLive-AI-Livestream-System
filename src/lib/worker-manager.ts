import { ChildProcess, spawn } from "child_process";
import fs from "fs";

/**
 * WorkerManager handles FFmpeg processes for livestock loop streaming.
 * It is implemented as a singleton to maintain process state across API requests.
 */
class WorkerManager {
  private processes: Map<string, ChildProcess> = new Map();

  constructor() {
    console.log("[WorkerManager] Initialized");
  }

  /**
   * Starts a livestream loop for a specific session.
   * @param liveId The unique ID of the live session.
   * @param videoInput The local file path or remote URL for FFmpeg input.
   * @param streamUrl The RTMP ingestion URL (MediaMTX).
   */
  public start(liveId: string, videoInput: string, streamUrl: string) {
    if (this.processes.has(liveId)) {
      console.warn(`[WorkerManager] Session ${liveId} is already running.`);
      return;
    }

    const isRemoteInput = /^https?:\/\//i.test(videoInput);
    if (!isRemoteInput && !fs.existsSync(videoInput)) {
      throw new Error(`Video file not found: ${videoInput}`);
    }

    console.log(`[WorkerManager] Starting stream for ${liveId} using ${videoInput}`);

    /**
     * FFmpeg Command Flags:
     * -re: Read input at native frame rate.
     * -stream_loop -1: Infinite loop.
     * -i: Input file.
     * -c:v libx264: Video codec.
     * -preset veryfast: Encoding speed.
     * -c:a aac: Audio codec.
     * -f flv: Output format for RTMP.
     */
    const ffmpeg = spawn("ffmpeg", [
      "-re",
      "-stream_loop", "-1",
      "-i", videoInput,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-tune", "zerolatency",
      "-c:a", "aac",
      "-ar", "44100",
      "-b:a", "128k",
      "-f", "flv",
      streamUrl
    ]);

    // ffmpeg.stdout.on("data", (data) => console.log(`[FFmpeg ${liveId} STDOUT]: ${data}`));
    // ffmpeg.stderr.on("data", (data) => console.error(`[FFmpeg ${liveId} STDERR]: ${data}`));


    ffmpeg.on("close", (code) => {
      console.log(`[WorkerManager] FFmpeg process for ${liveId} exited with code ${code}`);
      this.processes.delete(liveId);
    });

    this.processes.set(liveId, ffmpeg);
  }

  /**
   * Stops a livestream for a specific session.
   * @param liveId The unique ID of the live session.
   */
  public stop(liveId: string) {
    const process = this.processes.get(liveId);
    if (process) {
      console.log(`[WorkerManager] Killing process for ${liveId}`);
      process.kill("SIGTERM"); // Graceful shutdown
      this.processes.delete(liveId);
      return true;
    }
    return false;
  }

  /**
   * Checks if a session is currently streaming.
   */
  public isRunning(liveId: string): boolean {
    return this.processes.has(liveId);
  }
}

// Singleton Pattern for Next.js
const globalForWorker = global as unknown as { workerManager: WorkerManager };
export const workerManager = globalForWorker.workerManager || new WorkerManager();

if (process.env.NODE_ENV !== "production") globalForWorker.workerManager = workerManager;
